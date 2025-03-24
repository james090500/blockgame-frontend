import { ImprovedNoise } from 'three/examples/jsm/Addons.js'
import Blocks from '../blocks/Blocks.js'
import ChunkRenderer from '../renderer/world/ChunkRenderer.js'

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
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const smoothness = 30
                const mountains = 30

                const nx = x + this.chunkX * this.chunkSize
                const ny = z + this.chunkY * this.chunkSize

                // Get Perlin noise value
                const noiseResult = perlin.noise(
                    (nx - 0.5) / smoothness,
                    1,
                    (ny - 0.5) / smoothness
                )

                let height = (noiseResult + 1) / 2
                height *= mountains
                height = 50 + Math.round(height)

                const waterHeight = 64
                for (let y = 0; y < Math.max(height, waterHeight); y++) {
                    let block = 0

                    if (y + 1 == height) {
                        if (height <= waterHeight) {
                            block = Blocks.sandBlock.id
                        } else {
                            block = Blocks.grassBlock.id
                        }
                    } else if (y <= waterHeight && y >= height) {
                        block = Blocks.waterBlock.id
                    } else if (y > height - 5) {
                        block = Blocks.dirtBlock.id
                    } else {
                        block = Blocks.stoneBlock.id
                    }

                    this.setBlock(x, y, z, block)
                }
            }
        }
    }
}

export default Chunk
