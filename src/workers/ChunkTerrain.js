import workerpool from 'workerpool'
import { createNoise2D, createNoise3D } from 'simplex-noise'
import Blocks from '../blocks/Blocks.js'

class ChunkTerrain {
    constructor(seed, x, y, size, height) {
        this.neighbors = new Map()
        this.chunkData = []
        this.worldSeed = seed
        this.chunkX = x
        this.chunkY = y
        this.chunkSize = size
        this.chunkHeight = height

        this.generateTerrain()
        //this.generateCaves()
        this.generateTrees()

        return {
            data: this.chunkData,
            neighbors: this.neighbors,
        }
    }

    seedPRNG(seed) {
        let x = Math.sin(seed) * 10000
        return () => {
            x = Math.sin(x) * 10000
            return x - Math.floor(x)
        }
    }

    getIndex(x, y, z) {
        if (
            x < 0 ||
            x >= this.chunkSize ||
            y < 0 ||
            y >= this.chunkHeight ||
            z < 0 ||
            z >= this.chunkSize
        ) {
            return null
        }

        const index = x + this.chunkSize * (y + this.chunkHeight * z)
        return index
    }

    getBlock(x, y, z) {
        const chunkX = this.chunkX + Math.floor(x / 16)
        const chunkY = this.chunkY + Math.floor(z / 16)

        x = x & 15
        z = z & 15

        return this.getChunkBlock(chunkX, chunkY, x, y, z)
    }

    setBlock(x, y, z, value) {
        const chunkX = this.chunkX + Math.floor(x / 16)
        const chunkY = this.chunkY + Math.floor(z / 16)

        x = x & 15
        z = z & 15

        return this.setChunkBlock(chunkX, chunkY, x, y, z, value)
    }

    getChunkBlock(chunkX, chunkY, x, y, z) {
        const index = this.getIndex(x, y, z)
        if (chunkX == this.chunkX && chunkY == this.chunkY) {
            return this.chunkData[index]
        } else {
            const chunk = this.neighbors.get(`${chunkX},${chunkY}`)
            if (chunk != null) {
                return chunk[index]
            } else {
                return null
            }
        }
    }

    setChunkBlock(chunkX, chunkY, x, y, z, value) {
        const index = this.getIndex(x, y, z)
        if (chunkX == this.chunkX && chunkY == this.chunkY) {
            this.chunkData[index] = value
        } else {
            const chunk = this.neighbors.get(`${chunkX},${chunkY}`)
            if (chunk != null) {
                chunk[index] = value
            } else {
                const chunk = []
                chunk[index] = value
                this.neighbors.set(`${chunkX},${chunkY}`, chunk)
            }
        }
    }

    octaveNoise3D(noiseFn, x, y, z) {
        const octaves = 4
        const persistence = 0.5
        const lacunarity = 2.0
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
        const noise3D = createNoise3D(this.seedPRNG(this.worldSeed))

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
    }

    generateCaves() {
        const caveSeed = this.worldSeed + 3456 // Dont follow terrain otherwise it looks odd
        const frequency = 0.05
        const noise3D = createNoise3D(this.seedPRNG(caveSeed))

        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const nx = x + this.chunkX * this.chunkSize
                const nz = z + this.chunkY * this.chunkSize

                for (let y = 74; y >= 0; y--) {
                    let caveWorm = noise3D(
                        nx * frequency,
                        y * frequency,
                        nz * frequency
                    )

                    if (caveWorm > 0.2) {
                        const block = this.getBlock(x, y, z)
                        if (block && block.id == Blocks.waterBlock.id) {
                            return
                        }

                        this.setBlock(x, y, z, 0)
                    }
                }
            }
        }
    }

    generateTrees() {
        const treeSeed = this.worldSeed + 2390 // Dont follow terrain otherwise it looks odd
        const noise2D = createNoise2D(this.seedPRNG(treeSeed))

        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const nx = x + this.chunkX * this.chunkSize
                const nz = z + this.chunkY * this.chunkSize

                const noise = noise2D(nx, nz)

                if (noise > 0.9) {
                    for (let y = this.chunkHeight - 1; y >= 0; y--) {
                        const block = this.getBlock(x, y, z)
                        if (block == Blocks.grassBlock.id) {
                            this.buildTree(noise, x, y, z)
                        }
                    }
                }
            }
        }
    }

    buildTree(noise, x, y, z) {
        const trunkHeight = 3 + Math.floor((noise - 0.9) * 10) // 3-5 block tall trunk

        // Build trunk
        for (let t = 0; t < trunkHeight; t++) {
            this.setBlock(x, 1 + y + t, z, Blocks.logBlock.id)
        }

        // Build leaves
        for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
                for (let ly = 0; ly <= 3; ly++) {
                    // a little taller
                    const horizontalDist = Math.abs(lx) + Math.abs(lz)

                    // Simple rules:
                    if (horizontalDist <= 3 - ly) {
                        // narrower as ly goes up
                        const blockToSet =
                            ly < 3 && lx == 0 && lz == 0
                                ? Blocks.logBlock.id
                                : Blocks.leaveBlock.id

                        this.setBlock(
                            x + lx,
                            1 + y + trunkHeight + ly,
                            z + lz,
                            blockToSet
                        )
                    }
                }
            }
        }
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
