import workerpool from 'workerpool'
import { createNoise2D, createNoise3D } from 'simplex-noise'
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

    generateTerrain() {
        const noise2D = createNoise2D(this.seedPRNG())
        const noise3D = createNoise3D(this.seedPRNG())

        const smoothness = 45
        const waterLevel = 64

        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const nx = x + this.chunkX * this.chunkSize
                const nz = z + this.chunkY * this.chunkSize
                // Land vs Water generation
                let biome = noise2D(nx * 0.0025, nz * 0.0025)

                for (let y = this.chunkHeight - 1; y >= 0; y--) {
                    const ny = y

                    // Large-scale terrain shaping
                    let density = noise3D(
                        nx / smoothness,
                        ny / smoothness,
                        nz / smoothness
                    )

                    // Adjust density based on Y value to make it higher at lower Y values
                    const heightFactor = (waterLevel - y) / waterLevel

                    // More land than water
                    density += 0.3
                    if (y < waterLevel || density < 0.5) {
                        density += heightFactor * 10
                    } else {
                        density += heightFactor * 5
                    }

                    // Adjust density based on biome
                    density += biome

                    let nextBlock
                    const previousBlock = this.getBlock(x, y + 1, z)
                    if (density >= 0) {
                        if (
                            (y <= waterLevel + 2 && !previousBlock) ||
                            (previousBlock &&
                                previousBlock.id == Blocks.waterBlock.id)
                        ) {
                            nextBlock = Blocks.sandBlock.id
                        } else if (
                            y >= waterLevel &&
                            previousBlock &&
                            previousBlock.id == Blocks.sandBlock.id
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
