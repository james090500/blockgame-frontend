import { ImprovedNoise } from 'three/examples/jsm/Addons.js'
import Blocks from '../blocks/Blocks.js'
import ChunkRenderer from '../renderer/world/ChunkRenderer.js'

class Chunk {
    rendered = false
    chunkRenderer = new ChunkRenderer()
    chunkX = 0
    chunkY = 0
    chunkSize = 16
    chunkHeight = 300
    chunkData
    chunkWorker

    constructor(chunkX, chunkY) {
        this.chunkX = chunkX
        this.chunkY = chunkY

        this.chunkData = new Uint32Array(
            this.chunkSize * this.chunkSize * this.chunkHeight
        )
    }

    render(world) {
        this.chunkRenderer.dispose()
        this.chunkRenderer.render(world, this)
        this.chunkRenderer.renderTransparent(world, this)
        this.rendered = true
    }

    getIndex(x, y, z) {
        if (
            x < 0 ||
            x > this.chunkSize ||
            y < 0 ||
            y > this.chunkHeight ||
            z < 0 ||
            z > this.chunkSize
        ) {
            return null
        }

        const index =
            y * this.chunkSize * this.chunkSize + z * this.chunkSize + x
        return index
    }

    getXYZ(index) {
        const S = this.chunkSize
        const y = Math.floor(index / (S * S))
        const z = Math.floor((index % (S * S)) / S)
        const x = index % S
        return { x, y, z }
    }

    getBlock(x, y, z) {
        const index = this.getIndex(x, y, z)
        if (index == null) {
            return null
        } else {
            const blockIndex = this.chunkData[index]
            return Blocks.ids[blockIndex]
        }
    }

    setBlock(x, y, z, value) {
        if (y < this.chunkHeight) {
            const index = this.getIndex(x, y, z)
            if (index != null) {
                this.chunkData[index] = value
            }
        }
    }

    generateTerrain() {
        const perlin = new ImprovedNoise()
        const smoothness = 25
        const waterLevel = 64

        let previousBlock = null

        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                for (let y = this.chunkHeight - 1; y >= 0; y--) {
                    const nx = x + this.chunkX * this.chunkSize
                    const ny = y
                    const nz = z + this.chunkY * this.chunkSize

                    // Large-scale terrain shaping
                    let density = perlin.noise(
                        nx / smoothness,
                        ny / smoothness,
                        nz / smoothness
                    )

                    // Adjust density based on Y value to make it higher at lower Y values
                    const heightFactor = (waterLevel - y) / waterLevel
                    density += heightFactor

                    if (y < waterLevel) {
                        density += y * 0.006
                    }

                    let nextBlock

                    if (density >= 0) {
                        if (
                            y <= waterLevel + 1 &&
                            previousBlock === Blocks.waterBlock.id
                        ) {
                            nextBlock = Blocks.sandBlock.id
                        } else if (!previousBlock) {
                            nextBlock = Blocks.grassBlock.id
                        } else if (!this.getBlock(x, y + 4, z)) {
                            nextBlock = Blocks.dirtBlock.id
                        } else {
                            nextBlock = Blocks.stoneBlock.id
                        }
                    } else if (y <= waterLevel) {
                        nextBlock = Blocks.waterBlock.id
                    }

                    if (nextBlock) {
                        this.setBlock(x, y, z, nextBlock)
                    }

                    previousBlock = nextBlock
                }
            }
        }
    }
}

export default Chunk
