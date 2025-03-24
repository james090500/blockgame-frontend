import BlockGame from '../BlockGame'
import { Vector3 } from 'three'
import WaterBlock from '../blocks/WaterBlock'
import Blocks from '../blocks/Blocks'

class LocalPlayer {
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
                        Blocks.stoneBlock.id
                    )
                    return true
                }
                prevLocation = [x, y, z]
            })
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
        // this.updateMovement(delta)
        this.updateInteraction(delta)
        // this.renderer.render(delta)
    }
}

export default LocalPlayer
