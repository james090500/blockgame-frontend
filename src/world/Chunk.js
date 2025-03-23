import { ImprovedNoise } from 'three/examples/jsm/Addons.js'

class Chunk {
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
            return 0
        } else {
            return this.chunkData[index]
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

    generateTerrain(noise) {
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
                            block = 4
                        } else {
                            block = 1
                        }
                    } else if (y <= waterHeight) {
                        block = 5
                    } else if (y > height - 5) {
                        block = 2
                    } else {
                        block = 3
                    }

                    this.setBlock(x, y, z, block)
                }
            }
        }
    }
}

export default Chunk
