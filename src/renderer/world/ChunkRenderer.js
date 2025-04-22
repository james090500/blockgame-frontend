import {
    ShaderMaterial,
    Mesh,
    BufferGeometry,
    Float32BufferAttribute,
} from 'three'
import TextureManager from '../../utils/TextureManager.js'
import Blocks from '../../blocks/Blocks.js'
import BlockGame from '../../BlockGame'

class ChunkRenderer {
    chunkMeshes = []

    /**
     * Render solid blocks in the world
     * @param {*} world
     * @param {*} chunk
     */
    render(world, chunk) {
        const data = this.makeVoxels(
            [0, 0, 0],
            [chunk.chunkSize, chunk.chunkHeight, chunk.chunkSize],
            function (x, y, z) {
                const block = chunk.getBlock(x, y, z)
                if (block != null && !block.transparent) {
                    return block.id
                } else {
                    return 0
                }
            }
        )

        this.generateMesh(world, chunk, data)
    }

    /**
     * Render transparent blocks in the world
     * @param {*} world
     * @param {*} chunk
     */
    renderTransparent(world, chunk) {
        const data = this.makeVoxels(
            [0, 0, 0],
            [chunk.chunkSize, chunk.chunkHeight, chunk.chunkSize],
            function (x, y, z) {
                const block = chunk.getBlock(x, y, z)
                if (block != null && block.transparent) {
                    return block.id
                } else {
                    return 0
                }
            }
        )

        this.generateMesh(world, chunk, data, true)
    }

    /**
     * Dispose of the mesh
     */
    dispose() {
        this.chunkMeshes.forEach((mesh) => {
            BlockGame.instance.renderer.sceneManager.remove(mesh)
        })
    }

    /**
     * Generate the greedy mesh
     * @param {*} world
     * @param {*} chunk
     * @param {*} data
     * @param {*} transparent
     */
    generateMesh(world, chunk, data, transparent = false) {
        var geometry = new BufferGeometry()
        var material = new ShaderMaterial({
            vertexShader: `
                attribute vec2 textureOffset;
                attribute float ao;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vTexOffset;
                varying float vAo;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normal);
                    vPosition = position;
                    vTexOffset = textureOffset;
                    vAo = ao;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D baseTexture;
                uniform vec2 tileOffset;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vTexOffset;
                varying float vAo;

                void main() {
                    vec2 tileSize = vec2(0.0625, 0.0625);
                    vec2 tileUV;

                    // Determine correct UV projection based on face normal
                    if (abs(vNormal.x) > 0.5) {  // Left/Right faces
                        tileUV = vPosition.zy;
                    } else if (vNormal.y > 0.5) {  // Top Face
                        tileUV = vPosition.xz;
                    } else if (vNormal.y < -0.5) {  // Bottom Face
                        tileUV = vPosition.xz;
                    } else {  // Front/Back faces
                        tileUV = vPosition.xy;
                    }

                    // Apply tiling and offset
                    vec2 texCoord = vTexOffset + tileSize * fract(tileUV);
                    vec4 texel = texture2D(baseTexture, texCoord);
                    float finalAO = mix(0.0, 1.0, vAo / 3.0);

                    // gl_FragColor = vec4(texel.rgb * finalAO, texel.a);
                    gl_FragColor = vec4(vec2(vAo / 3.0), 1.0, 1.0);
                }
            `,
            uniforms: {
                baseTexture: { type: 't', value: TextureManager.terrain },
            },
            transparent,
            wireframe: world.wireframe,
        })

        const surfacemesh = new Mesh(geometry, material)
        surfacemesh.position.set(
            chunk.chunkX * chunk.chunkSize,
            0,
            chunk.chunkY * chunk.chunkSize
        )
        BlockGame.instance.renderer.sceneManager.add(surfacemesh)
        this.chunkMeshes.push(surfacemesh)

        const result = this.GreedyMesh(world, chunk, data.voxels, data.dims)

        const vertices = []
        const indices = []
        const textureOffset = []
        const ao = []

        for (let i = 0; i < result.vertices.length; ++i) {
            const q = result.vertices[i]
            vertices.push(q[0], q[1], q[2])
        }

        for (let i = 0; i < result.faces.length; ++i) {
            const q = result.faces[i]

            if (q.length === 6) {
                indices.push(q[0], q[1], q[2], q[0], q[2], q[3]) // Two triangles

                for (let j = 0; j < 4; j++) {
                    textureOffset.push(q[4][0], q[4][1])
                    ao.push(q[5][j])
                }
            }
        }

        // Convert arrays to TypedArrays
        geometry.setAttribute(
            'position',
            new Float32BufferAttribute(vertices, 3)
        )

        geometry.setIndex(indices)
        geometry.setAttribute(
            'textureOffset',
            new Float32BufferAttribute(textureOffset, 2)
        )

        geometry.setAttribute('ao', new Float32BufferAttribute(ao, 1))

        geometry.computeVertexNormals() // Ensures proper shading
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
    }

    makeVoxels(l, h, f) {
        var dims = [h[0] - l[0], h[1] - l[1], h[2] - l[2]],
            voxels = new Int32Array(dims[0] * dims[1] * dims[2]),
            n = 0
        for (var k = l[2]; k < h[2]; ++k)
            for (var j = l[1]; j < h[1]; ++j)
                for (var i = l[0]; i < h[0]; ++i, ++n) {
                    let result = f(i, j, k)
                    voxels[n] = result
                }
        return { voxels, dims }
    }

    //https://mikolalysenko.github.io/MinecraftMeshes2/js/greedy.js
    GreedyMesh(world, chunk, voxelData, dimensions) {
        let mask = new Int32Array(1)
        let aoMask = new Int32Array(1)

        // Helper to get block ID at a voxel coordinate
        function getVoxel(x, y, z) {
            return voxelData[x + dimensions[0] * (y + dimensions[1] * z)]
        }

        function getAo(currentPos, step, axis) {
            const aoLevels = []
            const [x, y, z] = currentPos
            const [a1, a2] = [0, 1, 2].filter((i) => i !== axis)
            const cornerOffsets = [
                [-1, +1], // TL
                [+1, +1], // TR
                [-1, -1], // BL
                [+1, -1], // BR
            ]

            const getBlock = (dx, dy, dz) => {
                const block = world.getChunkBlock(
                    chunk.chunkX,
                    chunk.chunkY,
                    dx,
                    dy,
                    dz
                )
                return block && !block.transparent ? 1 : 0
            }

            for (let i = 0; i < 4; i++) {
                const [s1, s2] = cornerOffsets[i]

                const side1 = [0, 0, 0]
                const side2 = [0, 0, 0]
                const corner = [0, 0, 0]

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
                    hasSide1 && hasSide2
                        ? 0
                        : 3 - (hasSide1 + hasSide2 + hasCorner)

                aoLevels.push(ao)
            }

            const encoded =
                ((aoLevels[0] & 0b11) << 0) | // top-left (bits 0-1)
                ((aoLevels[1] & 0b11) << 2) | // top-right (bits 2-3)
                ((aoLevels[2] & 0b11) << 4) | // bottom-left (bits 4-5)
                ((aoLevels[3] & 0b11) << 6) // bottom-right (bits 6-7)

            return encoded
        }

        const vertices = []
        const faces = []

        // Sweep across 3 dimensions: X, Y, Z (0, 1, 2)
        for (let axis = 0; axis < 3; ++axis) {
            const u = (axis + 1) % 3
            const v = (axis + 2) % 3
            const pos = [0, 0, 0]
            const step = [0, 0, 0]
            step[axis] = 1

            if (mask.length < dimensions[u] * dimensions[v]) {
                mask = new Int32Array(dimensions[u] * dimensions[v])
                aoMask = new Int32Array(dimensions[u] * dimensions[v])
            }

            for (pos[axis] = -1; pos[axis] < dimensions[axis]; ) {
                let n = 0

                // Build the mask
                for (pos[v] = 0; pos[v] < dimensions[v]; ++pos[v]) {
                    for (pos[u] = 0; pos[u] < dimensions[u]; ++pos[u], ++n) {
                        const currID = pos[axis] >= 0 ? getVoxel(...pos) : 0
                        const nextPos = [
                            pos[0] + step[0],
                            pos[1] + step[1],
                            pos[2] + step[2],
                        ]
                        const nextID =
                            pos[axis] < dimensions[axis] - 1
                                ? getVoxel(...nextPos)
                                : 0

                        if (!!currID === !!nextID) {
                            mask[n] = 0
                            aoMask[n] = 0
                        } else {
                            const getMaskValue = (
                                id,
                                dx = 0,
                                dy = 0,
                                dz = 0
                            ) => {
                                const blockA = Blocks.ids[id]
                                const neighbor = world.getChunkBlock(
                                    chunk.chunkX,
                                    chunk.chunkY,
                                    pos[0] + dx,
                                    pos[1] + dy,
                                    pos[2] + dz
                                )
                                return neighbor &&
                                    (!neighbor.transparent ||
                                        blockA.transparent)
                                    ? 2
                                    : id
                            }

                            // Generate an AO for the block, the value will be a bitwise total uniquie to the AO pattern
                            if (currID) {
                                mask[n] = getMaskValue(currID, ...step)
                                aoMask[n] = getAo(nextPos, step, axis)
                            } else {
                                mask[n] = -getMaskValue(nextID)
                                aoMask[n] = -getAo(nextPos, step, axis)
                            }
                        }
                    }
                }

                ++pos[axis]

                // Generate quads
                n = 0
                for (let j = 0; j < dimensions[v]; ++j) {
                    for (let i = 0; i < dimensions[u]; ) {
                        let blockId = mask[n]
                        let aoVal = aoMask[n]
                        if (blockId !== 0) {
                            // Calculate quad width
                            let width = 1
                            while (
                                i + width < dimensions[u] &&
                                blockId === mask[n + width] &&
                                aoVal === aoMask[n + width]
                            ) {
                                ++width
                            }

                            // Calculate quad height
                            let height = 1
                            let stop = false
                            while (j + height < dimensions[v]) {
                                for (let k = 0; k < width; ++k) {
                                    if (
                                        blockId !==
                                            mask[
                                                n + k + height * dimensions[u]
                                            ] ||
                                        aoVal !==
                                            aoMask[
                                                n + k + height * dimensions[u]
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

                            const vCount = vertices.length
                            vertices.push([pos[0], pos[1], pos[2]])
                            vertices.push([
                                pos[0] + du[0],
                                pos[1] + du[1],
                                pos[2] + du[2],
                            ])
                            vertices.push([
                                pos[0] + du[0] + dv[0],
                                pos[1] + du[1] + dv[1],
                                pos[2] + du[2] + dv[2],
                            ])
                            vertices.push([
                                pos[0] + dv[0],
                                pos[1] + dv[1],
                                pos[2] + dv[2],
                            ])

                            const block = Blocks.ids[blockId]
                            let texOffset = block.textureOffset()

                            // Determine if face is top or bottom when sweeping the Y axis
                            const isPositiveFace = mask[n] > 0
                            if (axis === 1) {
                                texOffset = block.textureOffset(
                                    isPositiveFace ? 'top' : 'bottom'
                                )
                            }

                            let finalAoVal = [
                                (aoVal >> 0) & 0b11, // top-left
                                (aoVal >> 2) & 0b11, // top-right
                                (aoVal >> 4) & 0b11, // bottom-left
                                (aoVal >> 6) & 0b11, // bottom-right
                            ]

                            // Determine face orientation

                            // Fix AO rotation depending on axis
                            if (axis === 0) {
                                finalAoVal = isPositiveFace
                                    ? [
                                          finalAoVal[2], // bottom-right
                                          finalAoVal[3], // top right
                                          finalAoVal[1], // top left
                                          finalAoVal[0], // bottom left
                                      ]
                                    : [
                                          finalAoVal[0], // bottom left
                                          finalAoVal[2], // bottom right
                                          finalAoVal[3], // top right
                                          finalAoVal[1], // top left
                                      ]
                            } else if (axis === 1) {
                                finalAoVal = isPositiveFace
                                    ? [
                                          finalAoVal[2], // bottom-right
                                          finalAoVal[0], // top-right
                                          finalAoVal[1], // top-left
                                          finalAoVal[3], // bottom-left
                                      ]
                                    : [
                                          finalAoVal[3], // bottom right
                                          finalAoVal[2], // bottom left
                                          finalAoVal[0], // top left
                                          finalAoVal[1], // top right
                                      ]
                            } else if (axis === 2) {
                                finalAoVal = isPositiveFace
                                    ? [
                                          finalAoVal[3], // bottom left
                                          finalAoVal[2], // bottom right
                                          finalAoVal[0], // top right
                                          finalAoVal[1], // top left
                                      ]
                                    : [
                                          finalAoVal[2], // bottom-right
                                          finalAoVal[0], // top-right
                                          finalAoVal[1], // top-left
                                          finalAoVal[3], // bottom-left
                                      ]
                            }

                            faces.push([
                                vCount,
                                vCount + 1,
                                vCount + 2,
                                vCount + 3,
                                texOffset,
                                finalAoVal,
                            ])

                            // Zero the mask
                            for (let dy = 0; dy < height; ++dy) {
                                for (let dx = 0; dx < width; ++dx) {
                                    mask[n + dx + dy * dimensions[u]] = 0
                                    aoMask[n + dx + dy * dimensions[u]] = 0
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

export default ChunkRenderer
