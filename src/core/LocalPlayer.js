import BlockGame from '../BlockGame'
import { Vector3, Clock } from 'three'
import WaterBlock from '../blocks/WaterBlock'
import Blocks from '../blocks/Blocks'

class LocalPlayer {
    // Player state
    currentBlock = 1
    noclip = false
    jumping = false
    falling = false

    clock = new Clock()
    playerHeight = 1.5
    velocity = new Vector3(0, 0, 0)
    fallVelocity = new Vector3(0, 0, 0)
    jumpStartTime = 0

    /**
     * Checks if the player's AABB collides with any solid blocks in the world.
     * @param {Vector3} min - Minimum bounds of the AABB.
     * @param {Vector3} max - Maximum bounds of the AABB.
     * @param {Object} world - The world object to query blocks from.
     * @returns {boolean} True if a collision is found.
     */
    isAABBColliding(min, max, world) {
        if (this.noclip) {
            return false
        }

        for (let x = Math.floor(min.x); x <= Math.floor(max.x); x++) {
            for (let y = Math.floor(min.y); y <= Math.floor(max.y); y++) {
                for (let z = Math.floor(min.z); z <= Math.floor(max.z); z++) {
                    if (world.getBlock(x, y, z)) {
                        return true
                    }
                }
            }
        }
        return false
    }

    /**
     * Attempts to move the camera along a single axis while checking for AABB collisions.
     * @param {PerspectiveCamera} camera - The camera to move.
     * @param {Vector3} velocity - The velocity vector.
     * @param {string} axis - The axis to apply movement ('x', 'y', or 'z').
     * @param {number} halfWidth - Half the width of the player's bounding box.
     * @param {number} playerHeight - Height of the player.
     * @param {Object} world - The world object to query blocks from.
     * @returns {boolean} True if the move was successful.
     */
    tryMove(camera, velocity, axis, halfWidth, playerHeight, world) {
        const pos = camera.position.clone()
        pos[axis] += velocity[axis]

        const min = new Vector3(
            pos.x - halfWidth,
            pos.y - playerHeight,
            pos.z - halfWidth
        )
        const max = new Vector3(pos.x + halfWidth, pos.y, pos.z + halfWidth)

        if (!this.isAABBColliding(min, max, world)) {
            camera.position[axis] = pos[axis]
            return true
        }
        return false
    }

    /**
     * Updates player movement based on input and applies gravity and collision.
     * @param {number} delta - Time since last frame.
     */
    updateMovement(delta) {
        let moveSpeed = 0.9

        // Get necessary references
        const camera = BlockGame.instance.renderer.sceneManager.camera
        const keys = BlockGame.instance.input.keys
        const world = BlockGame.instance.gameManager.world

        const dir = new Vector3()
        camera.getWorldDirection(dir)
        dir.y = 0
        dir.normalize()

        // Handle noclip toggle
        if (keys.KeyV) {
            keys.KeyV = false
            this.noclip = !this.noclip
        }

        // Dampen movement
        this.velocity.multiplyScalar(0.75)

        // Apply input movement and apply friction
        const acceleration = new Vector3()

        if (keys.KeyW) {
            acceleration.add(dir)
        }
        if (keys.KeyA) {
            acceleration.add(
                new Vector3().crossVectors(dir, new Vector3(0, -1, 0))
            )
        }
        if (keys.KeyD) {
            acceleration.add(
                new Vector3().crossVectors(dir, new Vector3(0, 1, 0))
            )
        }
        if (keys.KeyS) {
            acceleration.add(dir.clone().negate())
        }

        if (acceleration.lengthSq() > 0) {
            acceleration.normalize().multiplyScalar(moveSpeed) // units per second
            this.velocity.add(acceleration.multiplyScalar(delta)) // scale per frame
        }

        // Start jump if grounded and Space is pressed
        if (!this.jumping && !this.falling && keys.Space) {
            keys.Space = false
            this.jumping = true
            this.jumpStartTime = this.clock.getElapsedTime()
        }

        const timeSinceJump = this.clock.getElapsedTime() - this.jumpStartTime
        const maxJumpTime = 0.2 // Adjust for smooth 1.2 block rise

        // Ascend phase
        if (this.jumping && timeSinceJump < maxJumpTime) {
            this.fallVelocity.y = 5 // Initial jump velocity upward
        } else {
            this.jumping = false
        }

        // Apply gravity if not jumping
        if (!this.noclip && !this.jumping) {
            const gravity = 50
            const terminalVelocity = -90
            this.fallVelocity.y -= gravity * delta
            if (this.fallVelocity.y < terminalVelocity) {
                this.fallVelocity.y = terminalVelocity
            }
        } else if (!this.jumping) {
            this.fallVelocity.y = 0
        }
        const yVelocity = this.fallVelocity.y * delta

        // Half the players width
        const halfWidth = 0.2
        if (
            !this.tryMove(
                camera,
                new Vector3(0, yVelocity, 0),
                'y',
                halfWidth,
                this.playerHeight,
                world
            )
        ) {
            this.fallVelocity.y = 0
            this.falling = false
        } else if (!this.noclip) {
            this.falling = true
        }

        // Try horizontal movement along X and Z axes
        this.tryMove(
            camera,
            this.velocity,
            'x',
            halfWidth,
            this.playerHeight,
            world
        )
        this.tryMove(
            camera,
            this.velocity,
            'z',
            halfWidth,
            this.playerHeight,
            world
        )
    }

    /**
     * Handles block interaction using raycasting from the camera.
     * @param {number} delta - Time since last frame.
     */
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
                    world.setBlock(x, y, z, null)
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

    /**
     * Casts a ray from origin in a given direction and calls onHit when a block is intersected.
     * @param {Vector3} origin - Start position of the ray.
     * @param {Vector3} direction - Normalized direction vector of the ray.
     * @param {number} maxDistance - Maximum distance to check along the ray.
     * @param {function} onHit - Callback that receives block coordinates.
     */
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
     * Update movement and interaction logic each frame.
     * @param {number} delta - Time since last frame.
     */
    render(delta) {
        this.updateMovement(delta)
        this.updateInteraction(delta)
        // this.renderer.render(delta)
    }
}

export default LocalPlayer
