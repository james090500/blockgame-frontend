import workerpool from 'workerpool'
import { createNoise3D } from 'simplex-noise'
import Blocks from '../blocks/Blocks.js'

class ChunkTerrain {
    constructor(seed, x, y, size, height) {
        this.chunkData = []
        this.worldSeed = seed
        this.chunkX = x
        this.chunkY = y
        this.chunkSize = size
        this.chunkHeight = height

        return this.generateTerrain()
    }

    seedPRNG() {
        let x = Math.sin(this.worldSeed) * 10000
        return () => {
            x = Math.sin(x) * 10000
            return x - Math.floor(x)
        }
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

        const index = x + this.chunkSize * (y + this.chunkHeight * z)
        return index
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

    octaveNoise3D(
        noiseFn,
        x,
        y,
        z,
        octaves = 4,
        persistence = 0.5,
        lacunarity = 2.0
    ) {
        let total = 0
        let frequency = 0.005
        let amplitude = 5
        let maxValue = 0

        for (let i = 0; i < octaves; i++) {
            total +=
                noiseFn(x * frequency, y * frequency, z * frequency) * amplitude
            maxValue += amplitude

            amplitude *= persistence
            frequency *= lacunarity
        }

        return total / maxValue
    }

    generateTerrain() {
        const noise3D = createNoise3D(this.seedPRNG())

        const waterLevel = 64

        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const nx = x + this.chunkX * this.chunkSize
                const nz = z + this.chunkY * this.chunkSize

                let beach = false
                let topSoilDepth = -1
                for (let y = this.chunkHeight - 1; y >= 0; y--) {
                    // terrain shaping
                    let density = this.octaveNoise3D(noise3D, nx, y, nz)

                    const heightFactor = (waterLevel - y) / waterLevel
                    if (y > waterLevel) {
                        if (density > 0.35) {
                            density += heightFactor
                        } else {
                            density += heightFactor * 2
                        }
                    } else {
                        density += heightFactor * 2
                    }

                    let nextBlock
                    if (density >= 0) {
                        if (topSoilDepth == -1) {
                            if (y < waterLevel + 2) {
                                nextBlock = Blocks.sandBlock.id
                                beach = true
                            } else {
                                nextBlock = Blocks.grassBlock.id
                                beach = false
                            }
                            topSoilDepth++
                        } else if (topSoilDepth < 3) {
                            if (beach) {
                                nextBlock = Blocks.sandBlock.id
                            } else {
                                nextBlock = Blocks.dirtBlock.id
                            }
                            topSoilDepth++
                        } else {
                            nextBlock = Blocks.stoneBlock.id
                        }
                    } else {
                        if (y <= waterLevel) {
                            nextBlock = Blocks.waterBlock.id
                        }
                        topSoilDepth = -1
                    }

                    if (nextBlock) {
                        this.setBlock(x, y, z, nextBlock)
                    }
                }
            }
        }
        return this.chunkData
    }
}

function createChunkTerrain(params) {
    const { seed, x, y, size, height } = params
    const chunkTerrain = new ChunkTerrain(seed, x, y, size, height)
    return chunkTerrain
}

workerpool.worker({
    chunkTerrain: createChunkTerrain,
})
