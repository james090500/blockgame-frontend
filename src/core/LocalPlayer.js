import BlockGame from '../BlockGame'
import { Vector3, Clock } from 'three'
import WaterBlock from '../blocks/WaterBlock'
import Blocks from '../blocks/Blocks'

class LocalPlayer {
    currentBlock = 1
    noclip = false
    jumping = false
    falling = false

    clock = new Clock()
    playerHeight = 1.5
    velocity = new Vector3(0, 0, 0)
    fallVelocity = new Vector3(0, 0, 0)
    jumpStartTime = 0

    updateMovement(delta) {
        let moveSpeed = 0.35

        const camera = BlockGame.instance.renderer.sceneManager.camera
        const keys = BlockGame.instance.input.keys
        const world = BlockGame.instance.gameManager.world

        const dir = new Vector3()
        camera.getWorldDirection(dir)
        dir.y = 0
        dir.normalize()

        // Turn on clip
        if (keys.KeyV) {
            keys.KeyV = false
            this.noclip = !this.noclip
        }

        //Dampen movement
        this.velocity.lerp(new Vector3(0, 0, 0), 10 * delta)

        if (keys.KeyW) {
            this.velocity.add(dir.clone().multiplyScalar(moveSpeed * delta))
        }
        if (keys.KeyA) {
            let sideDir = new Vector3().crossVectors(dir, new Vector3(0, -1, 0))
            this.velocity.add(sideDir.multiplyScalar(moveSpeed * delta))
        }
        if (keys.KeyD) {
            let sideDir = new Vector3().crossVectors(dir, new Vector3(0, 1, 0))
            this.velocity.add(sideDir.multiplyScalar(moveSpeed * delta))
        }
        if (keys.KeyS) {
            this.velocity.add(
                dir
                    .clone()
                    .negate()
                    .multiplyScalar(moveSpeed * delta)
            )
        }

        // Calculate AABB size
        const nextPos = camera.position
            .clone()
            .add(new Vector3(this.velocity.x, 0, this.velocity.z))
        const halfWidth = 0.2
        const aabbMin = new Vector3(
            nextPos.x - halfWidth,
            nextPos.y - this.playerHeight,
            nextPos.z - halfWidth
        )
        const aabbMax = new Vector3(
            nextPos.x + halfWidth,
            nextPos.y,
            nextPos.z + halfWidth
        )

        let collided = false
        for (let x = Math.floor(aabbMin.x); x <= Math.floor(aabbMax.x); x++) {
            for (
                let y = Math.floor(aabbMin.y);
                y <= Math.ceil(aabbMax.y);
                y++
            ) {
                for (
                    let z = Math.floor(aabbMin.z);
                    z <= Math.floor(aabbMax.z);
                    z++
                ) {
                    if (world.getBlock(x, y, z)) {
                        collided = true
                    }
                }
            }
        }

        if (!collided) {
            camera.position.copy(nextPos)
        } else {
            // Try sliding along X
            const slideX = camera.position
                .clone()
                .add(new Vector3(this.velocity.x, 0, 0))
            const slideMinX = new Vector3(
                slideX.x - halfWidth,
                slideX.y - this.playerHeight,
                slideX.z - halfWidth
            )
            const slideMaxX = new Vector3(
                slideX.x + halfWidth,
                slideX.y,
                slideX.z + halfWidth
            )
            let xClear = true
            for (
                let x = Math.floor(slideMinX.x);
                x <= Math.floor(slideMaxX.x);
                x++
            ) {
                for (
                    let y = Math.floor(slideMinX.y);
                    y <= Math.floor(slideMaxX.y);
                    y++
                ) {
                    for (
                        let z = Math.floor(slideMinX.z);
                        z <= Math.floor(slideMaxX.z);
                        z++
                    ) {
                        if (world.getBlock(x, y, z)) {
                            xClear = false
                        }
                    }
                }
            }
            if (xClear) camera.position.x = slideX.x

            // Try sliding along Z
            const slideZ = camera.position
                .clone()
                .add(new Vector3(0, 0, this.velocity.z))
            const slideMinZ = new Vector3(
                slideZ.x - halfWidth,
                slideZ.y - this.playerHeight,
                slideZ.z - halfWidth
            )
            const slideMaxZ = new Vector3(
                slideZ.x + halfWidth,
                slideZ.y,
                slideZ.z + halfWidth
            )
            let zClear = true
            for (
                let x = Math.floor(slideMinZ.x);
                x <= Math.floor(slideMaxZ.x);
                x++
            ) {
                for (
                    let y = Math.floor(slideMinZ.y);
                    y <= Math.floor(slideMaxZ.y);
                    y++
                ) {
                    for (
                        let z = Math.floor(slideMinZ.z);
                        z <= Math.floor(slideMaxZ.z);
                        z++
                    ) {
                        if (world.getBlock(x, y, z)) {
                            zClear = false
                        }
                    }
                }
            }
            if (zClear) camera.position.z = slideZ.z
        }

        // Apply gravity
        const gravity = 50 // m/s²
        const terminalVelocity = -90 // Max fall speed
        this.fallVelocity.y -= gravity * delta
        if (this.fallVelocity.y < terminalVelocity) {
            this.fallVelocity.y = terminalVelocity
        }

        // Check vertical collision
        const yVelocity = this.fallVelocity.y * delta
        const yStep = camera.position.clone().add(new Vector3(0, yVelocity, 0))

        const yMin = new Vector3(
            yStep.x - halfWidth,
            yStep.y - this.playerHeight,
            yStep.z - halfWidth
        )
        const yMax = new Vector3(
            yStep.x + halfWidth,
            yStep.y,
            yStep.z + halfWidth
        )

        let yBlocked = false
        for (let x = Math.floor(yMin.x); x <= Math.floor(yMax.x); x++) {
            for (let y = Math.floor(yMin.y); y <= Math.floor(yMax.y); y++) {
                for (let z = Math.floor(yMin.z); z <= Math.floor(yMax.z); z++) {
                    if (world.getBlock(x, y, z)) {
                        yBlocked = true
                    }
                }
            }
        }

        if (!yBlocked) {
            camera.position.y += yVelocity
        } else {
            this.fallVelocity.y = 0 // Reset fall speed on ground collision
        }
    }

    updateInteraction(delta) {
        const mouse = BlockGame.instance.input.mouse
        if (mouse.LeftClick) {
            mouse.LeftClick = false

            const camera = BlockGame.instance.renderer.sceneManager.camera
            const dir = new Vector3()
            camera.getWorldDirection(dir)

            const world = BlockGame.instance.gameManager.world
            this.traverseRay(camera.position, dir, 5, (x, y, z) => {
                const block = world.getBlock(x, y, z)
                if (block && !(block instanceof WaterBlock)) {
                    world.setBlock(x, y, z, 0)
                    return true
                }
            })
        }

        if (mouse.RightClick) {
            mouse.RightClick = false

            const camera = BlockGame.instance.renderer.sceneManager.camera
            const dir = new Vector3()
            camera.getWorldDirection(dir)

            const world = BlockGame.instance.gameManager.world
            let prevLocation
            this.traverseRay(camera.position, dir, 5, (x, y, z) => {
                const block = world.getBlock(x, y, z)
                if (block && !(block instanceof WaterBlock)) {
                    world.setBlock(
                        prevLocation[0],
                        prevLocation[1],
                        prevLocation[2],
                        this.currentBlock
                    )
                    return true
                }
                prevLocation = [x, y, z]
            })
        }

        const keys = BlockGame.instance.input.keys
        if (keys.KeyC) {
            keys.KeyC = false
            this.currentBlock++
            if (this.currentBlock > Blocks.ids.length - 1) {
                this.currentBlock = 1
            }
        }
    }

    traverseRay(origin, direction, maxDistance, onHit) {
        let x = Math.floor(origin.x)
        let y = Math.floor(origin.y)
        let z = Math.floor(origin.z)

        const stepX = Math.sign(direction.x)
        const stepY = Math.sign(direction.y)
        const stepZ = Math.sign(direction.z)

        const tDeltaX = stepX !== 0 ? Math.abs(1 / direction.x) : Infinity
        const tDeltaY = stepY !== 0 ? Math.abs(1 / direction.y) : Infinity
        const tDeltaZ = stepZ !== 0 ? Math.abs(1 / direction.z) : Infinity

        let tMaxX =
            stepX > 0
                ? (Math.ceil(origin.x) - origin.x) * tDeltaX
                : (origin.x - Math.floor(origin.x)) * tDeltaX
        let tMaxY =
            stepY > 0
                ? (Math.ceil(origin.y) - origin.y) * tDeltaY
                : (origin.y - Math.floor(origin.y)) * tDeltaY
        let tMaxZ =
            stepZ > 0
                ? (Math.ceil(origin.z) - origin.z) * tDeltaZ
                : (origin.z - Math.floor(origin.z)) * tDeltaZ

        let distance = 0

        while (distance < maxDistance) {
            if (onHit(x, y, z)) break // Callback function to process the voxel

            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) {
                    x += stepX
                    distance = tMaxX
                    tMaxX += tDeltaX
                } else {
                    z += stepZ
                    distance = tMaxZ
                    tMaxZ += tDeltaZ
                }
            } else {
                if (tMaxY < tMaxZ) {
                    y += stepY
                    distance = tMaxY
                    tMaxY += tDeltaY
                } else {
                    z += stepZ
                    distance = tMaxZ
                    tMaxZ += tDeltaZ
                }
            }
        }
    }

    /**
     * Update the controls
     */
    render(delta) {
        this.updateMovement(delta)
        this.updateInteraction(delta)
        // this.renderer.render(delta)
    }
}

export default LocalPlayer
