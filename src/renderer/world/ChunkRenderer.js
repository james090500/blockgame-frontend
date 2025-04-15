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
                    float faceLight = 1.0;
                    vec2 tileSize = vec2(0.0625, 0.0625);
                    vec2 tileUV;

                    // Determine correct UV projection based on face normal
                    if (abs(vNormal.x) > 0.5) {  // Left/Right faces
                        faceLight = 0.8;
                        tileUV = vPosition.zy;
                    } else if (vNormal.y > 0.5) {  // Top Face
                        tileUV = vPosition.xz;
                    } else if (vNormal.y < -0.5) {  // Bottom Face
                        tileUV = vPosition.xz;
                        faceLight = 0.5;
                    } else {  // Front/Back faces
                        faceLight = 0.8;
                        tileUV = vPosition.xy;
                    }

                    // Apply tiling and offset
                    vec2 texCoord = vTexOffset + tileSize * fract(tileUV);
                    vec4 texel = texture2D(baseTexture, texCoord);
                    float finalAO = mix(0.0, 1.0, vAo);

                    //gl_FragColor = vec4(texel.rgb * finalAO * faceLight, texel.a);
                    gl_FragColor = vec4(vec3(1.0,1.0,1.0) * finalAO * faceLight, texel.a);
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
        let aoMask = new Int32Array()

        // Helper to get block ID at a voxel coordinate
        function getVoxel(x, y, z) {
            return voxelData[x + dimensions[0] * (y + dimensions[1] * z)]
        }

        function getAo(pos, step) {
            const nextPos = [
                pos[0] + step[0],
                pos[1] + step[1],
                pos[2] + step[2],
            ]

            const sample = (dx, dy, dz) => {
                const block = world.getChunkBlock(
                    chunk.chunkX,
                    chunk.chunkY,
                    dx,
                    dy,
                    dz
                )
                return !block || block.transparent ? 1 : 0
            }

            const s1 = sample(nextPos[0], nextPos[1], nextPos[2])

            return s1
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
                                    ? 0
                                    : id
                            }

                            // Generate an AO for the block, the value will be a bitwise total uniquie to the AO pattern
                            if (currID) {
                                mask[n] = getMaskValue(currID, ...step)
                                aoMask[n] = getAo(nextPos, step)
                            } else {
                                mask[n] = -getMaskValue(nextID)
                                aoMask[n] = getAo(nextPos, step)
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
                                aoVal = aoVal
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

                            // Here we need to calculate the AO for each vertex
                            // We should just reverse the bitwise operation.
                            // We already theoretically have the AO value for the face
                            // but we need to check direction/axis/face
                            // const aoVals = [
                            //     (aoVal >> 6) & 3,
                            //     (aoVal >> 4) & 3,
                            //     (aoVal >> 2) & 3,
                            //     aoVal & 3,
                            // ]
                            const aoVals = [aoVal, aoVal, aoVal, aoVal]

                            faces.push([
                                vCount,
                                vCount + 1,
                                vCount + 2,
                                vCount + 3,
                                texOffset,
                                aoVals,
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
