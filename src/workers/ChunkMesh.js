import workerpool from 'workerpool'
import Blocks from '../blocks/Blocks.js'

class ChunkMesh {
    constructor(params) {
        const {
            chunkX,
            chunkY,
            chunkHeight,
            chunkSize,
            chunkData,
            voxels,
            dims,
        } = params

        this.chunkX = chunkX
        this.chunkY = chunkY
        this.chunkHeight = chunkHeight
        this.chunkSize = chunkSize
        this.chunkData = chunkData
        this.voxels = voxels
        this.dims = dims

        return this.generateMesh()
    }

    // Helper to get block ID at a voxel coordinate
    getVoxel(x, y, z) {
        return this.voxels[x + this.dims[0] * (y + this.dims[1] * z)]
    }

    getAo(currentPos, step, axis, neg) {
        const aoLevels = []
        const [x, y, z] = currentPos
        const [a1, a2] = [0, 1, 2].filter((i) => i !== axis)
        const cornerOffsets = [
            [-1, 1], // TL
            [1, 1], // TR
            [-1, -1], // BL
            [1, -1], // BR
        ]

        const getBlock = (dx, dy, dz) => {
            const block = this.getChunkBlock(
                this.chunkX,
                this.chunkY,
                dx,
                dy,
                dz
            )
            return block && !block.transparent ? 1 : 0
        }

        for (let i = 0; i < 4; i++) {
            const [s1, s2] = cornerOffsets[i]

            let side1, side2, corner
            if (!neg) {
                side1 = [0, 0, 0]
                side2 = [0, 0, 0]
                corner = [0, 0, 0]
            } else {
                side1 = [-step[0], -step[1], -step[2]]
                side2 = [-step[0], -step[1], -step[2]]
                corner = [-step[0], -step[1], -step[2]]
            }

            side1[a1] = s1
            side2[a2] = s2
            corner[a1] = s1
            corner[a2] = s2

            const posSide1 = [x + side1[0], y + side1[1], z + side1[2]]
            const posSide2 = [x + side2[0], y + side2[1], z + side2[2]]
            const posCorner = [x + corner[0], y + corner[1], z + corner[2]]

            const hasSide1 = getBlock(...posSide1)
            const hasSide2 = getBlock(...posSide2)
            const hasCorner = getBlock(...posCorner)

            let ao =
                hasSide1 && hasSide2 ? 0 : 3 - (hasSide1 + hasSide2 + hasCorner)

            aoLevels.push(ao)
        }

        const encoded =
            ((aoLevels[0] & 0b11) << 0) | // top-left (bits 0-1)
            ((aoLevels[1] & 0b11) << 2) | // top-right (bits 2-3)
            ((aoLevels[2] & 0b11) << 4) | // bottom-left (bits 4-5)
            ((aoLevels[3] & 0b11) << 6) // bottom-right (bits 6-7)

        return encoded
    }

    getChunkBlock(chunkX, chunkY, x, y, z) {
        // Adjust X coordinate and chunk
        const offsetChunkX = Math.floor(x / 16)
        chunkX += offsetChunkX
        x = ((x % 16) + 16) % 16

        // Adjust Z coordinate and chunk
        const offsetChunkY = Math.floor(z / 16)
        chunkY += offsetChunkY
        z = ((z % 16) + 16) % 16

        const key = `${chunkX},${chunkY}`
        const target = this.chunkData[key]
        if (!target) {
            // console.warn(
            //     `Chunk data not found for chunk (${chunkX}, ${chunkY})`
            // )
            return null
        }

        const blockId =
            target[x + this.chunkSize * (y + this.chunkHeight * z)] || null
        return Blocks.ids[blockId]
    }

    generateMesh() {
        let mask = new Int32Array(1)
        let aoMask = new Int32Array(1)

        const vertices = []
        const faces = []

        // Sweep across 3 dimensions: X, Y, Z (0, 1, 2)
        for (let axis = 0; axis < 3; ++axis) {
            const u = (axis + 1) % 3
            const v = (axis + 2) % 3
            const pos = [0, 0, 0]
            const step = [0, 0, 0]
            step[axis] = 1

            if (mask.length < this.dims[u] * this.dims[v]) {
                mask = new Int32Array(this.dims[u] * this.dims[v])
                aoMask = new Int32Array(this.dims[u] * this.dims[v])
            }

            for (pos[axis] = -1; pos[axis] < this.dims[axis]; ) {
                let n = 0

                // Build the mask
                for (pos[v] = 0; pos[v] < this.dims[v]; ++pos[v]) {
                    for (pos[u] = 0; pos[u] < this.dims[u]; ++pos[u], ++n) {
                        const currID =
                            pos[axis] >= 0 ? this.getVoxel(...pos) : 0
                        const nextPos = [
                            pos[0] + step[0],
                            pos[1] + step[1],
                            pos[2] + step[2],
                        ]
                        const nextID =
                            pos[axis] < this.dims[axis] - 1
                                ? this.getVoxel(...nextPos)
                                : 0

                        if (!!currID === !!nextID) {
                            mask[n] = 0
                            aoMask[n] = 3
                        } else {
                            const getMaskValue = (
                                id,
                                dx = 0,
                                dy = 0,
                                dz = 0
                            ) => {
                                const blockA = Blocks.ids[id]
                                const neighbor = this.getChunkBlock(
                                    this.chunkX,
                                    this.chunkY,
                                    pos[0] + dx,
                                    pos[1] + dy,
                                    pos[2] + dz
                                )
                                return neighbor &&
                                    (!neighbor.transparent ||
                                        blockA.transparent)
                                    ? 0
                                    : id
                            }

                            // Generate an AO for the block, the value will be a bitwise total uniquie to the AO pattern
                            if (currID) {
                                mask[n] = getMaskValue(currID, ...step)
                                aoMask[n] = this.getAo(
                                    nextPos,
                                    step,
                                    axis,
                                    false
                                )
                            } else {
                                mask[n] = -getMaskValue(nextID)
                                aoMask[n] = -this.getAo(
                                    nextPos,
                                    step,
                                    axis,
                                    true
                                )
                            }
                        }
                    }
                }

                ++pos[axis]

                // Generate quads
                n = 0
                for (let j = 0; j < this.dims[v]; ++j) {
                    for (let i = 0; i < this.dims[u]; ) {
                        let blockId = mask[n]
                        let aoVal = aoMask[n]
                        if (blockId !== 0) {
                            // Calculate quad width
                            let width = 1
                            while (
                                i + width < this.dims[u] &&
                                blockId === mask[n + width] &&
                                aoVal === aoMask[n + width]
                            ) {
                                ++width
                            }

                            // Calculate quad height
                            let height = 1
                            let stop = false
                            while (j + height < this.dims[v]) {
                                for (let k = 0; k < width; ++k) {
                                    if (
                                        blockId !==
                                            mask[
                                                n + k + height * this.dims[u]
                                            ] ||
                                        aoVal !==
                                            aoMask[
                                                n + k + height * this.dims[u]
                                            ]
                                    ) {
                                        stop = true
                                        break
                                    }
                                }
                                if (stop) break
                                ++height
                            }

                            // Construct quad
                            pos[u] = i
                            pos[v] = j
                            const du = [0, 0, 0]
                            const dv = [0, 0, 0]

                            if (blockId > 0) {
                                du[u] = width
                                dv[v] = height
                            } else {
                                blockId = -blockId
                                aoVal = -aoVal
                                dv[u] = width
                                du[v] = height
                            }

                            // Determine face orientation
                            const isPositiveFace = mask[n] > 0

                            // Get block and texture offset
                            const block = Blocks.ids[blockId]
                            let texOffset = block.textureOffset()
                            if (axis === 1) {
                                texOffset = block.textureOffset(
                                    isPositiveFace ? 'top' : 'bottom'
                                )
                            }

                            // Prepare base vertex count and corners
                            const vCount = vertices.length
                            const v0 = [pos[0], pos[1], pos[2]]
                            const v1 = [
                                pos[0] + du[0],
                                pos[1] + du[1],
                                pos[2] + du[2],
                            ]
                            const v2 = [
                                v1[0] + dv[0],
                                v1[1] + dv[1],
                                v1[2] + dv[2],
                            ]
                            const v3 = [
                                v0[0] + dv[0],
                                v0[1] + dv[1],
                                v0[2] + dv[2],
                            ]

                            // Extract AO values
                            let ao = [
                                (aoVal >> 0) & 0b11,
                                (aoVal >> 2) & 0b11,
                                (aoVal >> 4) & 0b11,
                                (aoVal >> 6) & 0b11,
                            ]

                            // Rotate AO per axis and face direction
                            let faceAO = []
                            if (axis === 0) {
                                faceAO = isPositiveFace
                                    ? [ao[2], ao[3], ao[1], ao[0]]
                                    : [ao[2], ao[0], ao[1], ao[3]]
                            } else if (axis === 1) {
                                faceAO = isPositiveFace
                                    ? [ao[2], ao[0], ao[1], ao[3]]
                                    : [ao[2], ao[3], ao[1], ao[0]]
                            } else if (axis === 2) {
                                faceAO = isPositiveFace
                                    ? [ao[2], ao[3], ao[1], ao[0]]
                                    : [ao[2], ao[0], ao[1], ao[3]]
                            }

                            // Choose diagonal based on AO
                            let faceVerts, faceIndices
                            const flipDiagonal = ao[0] + ao[3] > ao[1] + ao[2]

                            if (flipDiagonal) {
                                faceVerts = [v3, v2, v1, v0]
                                faceIndices = [
                                    vCount + 2,
                                    vCount + 1,
                                    vCount + 0,
                                    vCount + 3,
                                ]

                                // Reverse AO
                                faceAO = faceAO.reverse()
                            } else {
                                faceVerts = [v0, v1, v2, v3]
                                faceIndices = [
                                    vCount,
                                    vCount + 1,
                                    vCount + 2,
                                    vCount + 3,
                                ]
                            }

                            // Add vertices
                            vertices.push(...faceVerts)

                            // Push face data
                            faces.push([
                                faceIndices[0],
                                faceIndices[1],
                                faceIndices[2],
                                faceIndices[3],
                                texOffset,
                                faceAO,
                            ])

                            // Zero the mask
                            for (let dy = 0; dy < height; ++dy) {
                                for (let dx = 0; dx < width; ++dx) {
                                    mask[n + dx + dy * this.dims[u]] = 0
                                    aoMask[n + dx + dy * this.dims[u]] = 0
                                }
                            }

                            i += width
                            n += width
                        } else {
                            ++i
                            ++n
                        }
                    }
                }
            }
        }

        return { vertices, faces }
    }
}

function createChunkMesh(params) {
    const chunkMesh = new ChunkMesh(params)
    return chunkMesh
}

workerpool.worker({
    chunkMesh: createChunkMesh,
})
