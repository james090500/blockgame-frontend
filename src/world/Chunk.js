import { ImprovedNoise } from 'three/examples/jsm/Addons.js'
import Blocks from '../blocks/Blocks.js'
import ChunkRenderer from '../renderer/world/ChunkRenderer.js'
import { Clock } from 'three'

class Chunk {
    chunkRenderer = new ChunkRenderer()
    chunkX = 0
    chunkY = 0
    chunkSize = 16
    chunkHeight = 300
    chunkData

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
        const baseScale = 40
        const waterLevel = 64

        const clock = new Clock()
        clock.getDelta()
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                for (let y = this.chunkHeight - 1; y >= 0; y--) {
                    const nx = x + this.chunkX * this.chunkSize
                    const ny = y
                    const nz = z + this.chunkY * this.chunkSize

                    // Large-scale terrain shaping
                    const largeNoise =
                        (perlin.noise(
                            nx / baseScale,
                            ny / baseScale,
                            nz / baseScale
                        ) +
                            1) /
                        2

                    // Blend large-scale and fine-detail noise
                    // let noiseValue = largeNoise * 0.8 + detailNoise * 0.2
                    let noiseValue = largeNoise

                    // Define the base terrain height using large noise
                    let baseHeight = -64

                    // Density calculation
                    let density =
                        noiseValue - (y - baseHeight) / this.chunkHeight

                    // Sharper falloff above water level
                    density -= (y - waterLevel) * 0.005

                    if (density > 0) {
                        if (y <= waterLevel + 1) {
                            this.setBlock(x, y, z, Blocks.sandBlock.id)
                        } else if (!this.getBlock(x, y + 1, z)) {
                            this.setBlock(x, y, z, Blocks.grassBlock.id)
                        } else if (!this.getBlock(x, y + 4, z)) {
                            this.setBlock(x, y, z, Blocks.dirtBlock.id)
                        } else {
                            this.setBlock(x, y, z, Blocks.stoneBlock.id)
                        }
                    } else if (y <= waterLevel) {
                        this.setBlock(x, y, z, Blocks.waterBlock.id)
                    }
                }
            }
        }
        console.log(clock.getDelta())
    }
}

export default Chunk
