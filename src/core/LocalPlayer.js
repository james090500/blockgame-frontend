import BlockGame from '../BlockGame'
import { Vector3, Clock, MathUtils } from 'three'
import WaterBlock from '../blocks/WaterBlock'
import Blocks from '../blocks/Blocks'

class LocalPlayer {
    currentBlock = 1
    noclip = false
    jumping = false
    falling = false

    clock = new Clock()
    jumpStartTime = 0

    updateMovement(delta) {
        let moveSpeed = 5
        if (this.noclip) {
            moveSpeed = 100
        }
        const camera = BlockGame.instance.renderer.sceneManager.camera
        const keys = BlockGame.instance.input.keys
        const world = BlockGame.instance.gameManager.world

        const dir = new Vector3()
        camera.getWorldDirection(dir)
        dir.y = 0
        dir.normalize()

        let newPos = new Vector3(0, 0, 0)

        // Turn on clip
        if (keys.KeyV) {
            keys.KeyV = false
            this.noclip = !this.noclip
        }

        if (this.noclip && keys.ShiftLeft) {
            newPos.sub(new Vector3(0, 1, 0).multiplyScalar(moveSpeed * delta))
        }

        if (keys.KeyW) {
            newPos.add(dir.clone().multiplyScalar(moveSpeed * delta))
        }
        if (keys.KeyA) {
            let sideDir = new Vector3().crossVectors(dir, new Vector3(0, -1, 0))
            newPos.add(sideDir.multiplyScalar(moveSpeed * delta))
        }
        if (keys.KeyD) {
            let sideDir = new Vector3().crossVectors(dir, new Vector3(0, 1, 0))
            newPos.add(sideDir.multiplyScalar(moveSpeed * delta))
        }
        if (keys.KeyS) {
            newPos.add(
                dir
                    .clone()
                    .negate()
                    .multiplyScalar(moveSpeed * delta)
            )
        }

        // Space
        if (keys.Space && !this.noclip && !this.jumping && !this.falling) {
            this.jumping = true
            this.jumpStartTime = this.clock.getElapsedTime()
        } else if (keys.Space && this.noclip) {
            let jumpDir = new Vector3(0, 1, 0)
            newPos.add(jumpDir.multiplyScalar(moveSpeed * delta))
        }

        // Handle jumping
        if (this.jumping) {
            const elapsedTime = this.clock.getElapsedTime() - this.jumpStartTime
            if (elapsedTime < 0.5) {
                let jump = MathUtils.lerp(0, 7.25, elapsedTime / 0.5) * delta
                camera.position.y += jump
            } else {
                this.jumping = false
            }
        }

        // Check X collision separately
        if (!this.noclip) {
            let block1 = world.getBlock(
                Math.floor(
                    camera.position.x + newPos.x + Math.sign(newPos.x) * 0.25
                ),
                Math.floor(camera.position.y),
                Math.floor(camera.position.z)
            )
            let block2 = world.getBlock(
                Math.floor(
                    camera.position.x + newPos.x + Math.sign(newPos.x) * 0.25
                ),
                Math.floor(camera.position.y - 0.75),
                Math.floor(camera.position.z)
            )
            if ((!block1 || block1.id == 5) && (!block2 || block2.id == 5)) {
                camera.position.x += newPos.x
            }

            // Check Z collision separately
            block1 = world.getBlock(
                Math.floor(camera.position.x),
                Math.floor(camera.position.y),
                Math.floor(
                    camera.position.z + newPos.z + Math.sign(newPos.z) * 0.25
                )
            )
            block2 = world.getBlock(
                Math.floor(camera.position.x),
                Math.floor(camera.position.y - 0.75),
                Math.floor(
                    camera.position.z + newPos.z + Math.sign(newPos.z) * 0.25
                )
            )
            if ((!block1 || block1.id == 5) && (!block2 || block2.id == 5)) {
                camera.position.z += newPos.z
            }

            // Gravity
            const belowBlock = world.getBlock(
                Math.floor(camera.position.x),
                Math.floor(camera.position.y - 0.75) - 1,
                Math.floor(camera.position.z)
            )
            this.falling = false
            if ((!belowBlock || belowBlock.id == 5) && !this.jumping) {
                this.falling = true
                camera.position.y -= 7.25 * delta
            }
        } else {
            camera.position.add(newPos)
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
