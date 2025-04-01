import { Mesh, BufferGeometry, Float32BufferAttribute } from 'three'
import TextureManager from '../../utils/TextureManager.js'
import Blocks from '../../blocks/Blocks.js'
import BlockGame from '../../BlockGame'
import { MeshBasicNodeMaterial, NodeAttribute } from 'three/webgpu'
import {
    vec2,
    vec3,
    float,
    positionLocal,
    normalLocal,
    add,
    mul,
    fract,
    texture,
    uv,
    select,
    abs,
    greaterThan,
    lessThan,
} from 'three/tsl'

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
                    const hasBlockAbove = chunk.blockRecievesShadow(x, y, z)
                    return [block.id, hasBlockAbove ? 0.5 : 1]
                } else {
                    return [0, 0]
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
                    const hasBlockAbove = chunk.blockRecievesShadow(x, y, z)
                    return [block.id, hasBlockAbove ? 0.5 : 1]
                } else {
                    return [0, 0]
                }
            }
        )

        // this.generateMesh(world, chunk, data, true)
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
        console.log(1)
        const result = this.GreedyMesh(
            world,
            chunk,
            data.voxels,
            data.lighting,
            data.dims
        )

        const vertices = []
        const indices = []
        const textureOffset = []
        const lighting = []

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
                    lighting.push(q[5])
                }
            }
        }

        // Create gemotry
        var geometry = new BufferGeometry()
        geometry.setIndex(indices)

        // Convert arrays to TypedArrays
        geometry.setAttribute(
            'position',
            new Float32BufferAttribute(vertices, 3)
        )

        geometry.setAttribute(
            'textureOffset',
            new Float32BufferAttribute(textureOffset, 2)
        )

        geometry.setAttribute(
            'lighting',
            new Float32BufferAttribute(lighting, 1)
        )

        console.log('Start')
        console.log(geometry.getAttribute('position'))
        console.log(geometry.getAttribute('textureOffset'))
        console.log('End')

        // Attributes passed from InstancedBufferGeometry
        const texOffset = new NodeAttribute('textureOffset', 'vec2')
        const tileSize = vec2(0.0625, 0.0625)

        // Procedural UV (make it repeat within 0-1 range)
        // const tempOffset = fract(vec2(0, 0.9375))
        const tempOffset = fract(texOffset)

        const tileUV = fract(vec2(positionLocal.x, positionLocal.z))
        const texCoord = add(tempOffset, mul(tileSize, tileUV))
        const texSample = texture(TextureManager.terrain, texCoord)

        // Final output material
        const material = new MeshBasicNodeMaterial({
            colorNode: texSample,
            transparent: true,
            wireframe: world.wireframe,
        })

        const surfacemesh = new Mesh(geometry, material)
        surfacemesh.position.set(
            chunk.chunkX * chunk.chunkSize,
            0,
            chunk.chunkY * chunk.chunkSize
        )

        geometry.computeVertexNormals() // Ensures proper shading
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()

        BlockGame.instance.renderer.sceneManager.add(surfacemesh)
        this.chunkMeshes.push(surfacemesh)
    }

    makeVoxels(l, h, f) {
        var dims = [h[0] - l[0], h[1] - l[1], h[2] - l[2]],
            voxels = new Int32Array(dims[0] * dims[1] * dims[2]),
            lighting = new Float32Array(dims[0] * dims[1] * dims[2]),
            n = 0
        for (var k = l[2]; k < h[2]; ++k)
            for (var j = l[1]; j < h[1]; ++j)
                for (var i = l[0]; i < h[0]; ++i, ++n) {
                    let result = f(i, j, k)
                    voxels[n] = result[0]
                    lighting[n] = result[1]
                }
        return { voxels, lighting, dims }
    }

    //https://mikolalysenko.github.io/MinecraftMeshes2/js/greedy.js
    GreedyMesh(world, chunk, volume, lighting, dims) {
        var mask = new Int32Array(1)
        var lMask = new Float32Array(1)

        function f(i, j, k) {
            return volume[i + dims[0] * (j + dims[1] * k)]
        }

        function getLighting(i, j, k) {
            return lighting[i + dims[0] * (j + dims[1] * k)]
        }

        //Sweep over 3-axes
        var vertices = [],
            faces = []
        for (var d = 0; d < 3; ++d) {
            var i,
                j,
                k,
                l,
                w,
                h,
                u = (d + 1) % 3,
                v = (d + 2) % 3,
                x = [0, 0, 0],
                q = [0, 0, 0]
            if (mask.length < dims[u] * dims[v]) {
                mask = new Int32Array(dims[u] * dims[v])
                lMask = new Float32Array(dims[u] * dims[v])
            }
            q[d] = 1
            for (x[d] = -1; x[d] < dims[d]; ) {
                //Compute mask
                var n = 0
                for (x[v] = 0; x[v] < dims[v]; ++x[v])
                    for (x[u] = 0; x[u] < dims[u]; ++x[u], ++n) {
                        var currentId = 0 <= x[d] ? f(x[0], x[1], x[2]) : 0,
                            nextId =
                                x[d] < dims[d] - 1
                                    ? f(x[0] + q[0], x[1] + q[1], x[2] + q[2])
                                    : 0

                        var currentLighting =
                                0 <= x[d] ? getLighting(x[0], x[1], x[2]) : 0,
                            nextLighting =
                                x[d] < dims[d] - 1
                                    ? getLighting(
                                          x[0] + q[0],
                                          x[1] + q[1],
                                          x[2] + q[2]
                                      )
                                    : 0

                        // todo, calculate if block next to mask is solid
                        if (!!currentId === !!nextId) {
                            mask[n] = 0
                            lMask[n] = 0
                        } else {
                            const getBlockMaskValue = (
                                blockId,
                                xOffset = 0,
                                yOffset = 0,
                                zOffset = 0
                            ) => {
                                const currentBlock = Blocks.ids[blockId]
                                const nextBlock = world.getChunkBlock(
                                    chunk.chunkX,
                                    chunk.chunkY,
                                    x[0] + xOffset,
                                    x[1] + yOffset,
                                    x[2] + zOffset
                                )

                                return nextBlock &&
                                    (!nextBlock.transparent ||
                                        currentBlock.transparent)
                                    ? 0
                                    : blockId
                            }

                            if (currentId) {
                                mask[n] = getBlockMaskValue(
                                    currentId,
                                    q[0],
                                    q[1],
                                    q[2]
                                )
                                lMask[n] = currentLighting
                            } else {
                                mask[n] = -getBlockMaskValue(nextId)
                                lMask[n] = nextLighting
                            }
                        }
                    }
                //Increment x[d]
                ++x[d]
                //Generate mesh for mask using lexicographic ordering
                n = 0
                for (j = 0; j < dims[v]; ++j)
                    for (i = 0; i < dims[u]; ) {
                        var c = mask[n]
                        var blockLight = lMask[n]
                        if (!!c) {
                            //Compute width
                            for (
                                w = 1;
                                c === mask[n + w] &&
                                i + w < dims[u] &&
                                blockLight === lMask[n + w] &&
                                i + w < dims[u];
                                ++w
                            ) {}
                            //Compute height (this is slightly awkward
                            var done = false
                            for (h = 1; j + h < dims[v]; ++h) {
                                for (k = 0; k < w; ++k) {
                                    if (
                                        c !== mask[n + k + h * dims[u]] ||
                                        blockLight !==
                                            lMask[n + k + h * dims[u]]
                                    ) {
                                        done = true
                                        break
                                    }
                                }
                                if (done) {
                                    break
                                }
                            }
                            //Add quad
                            x[u] = i
                            x[v] = j
                            var du = [0, 0, 0],
                                dv = [0, 0, 0]
                            if (c > 0) {
                                dv[v] = h
                                du[u] = w
                            } else {
                                c = -c
                                du[v] = h
                                dv[u] = w
                            }
                            var vertex_count = vertices.length
                            vertices.push([x[0], x[1], x[2]])
                            vertices.push([
                                x[0] + du[0],
                                x[1] + du[1],
                                x[2] + du[2],
                            ])
                            vertices.push([
                                x[0] + du[0] + dv[0],
                                x[1] + du[1] + dv[1],
                                x[2] + du[2] + dv[2],
                            ])
                            vertices.push([
                                x[0] + dv[0],
                                x[1] + dv[1],
                                x[2] + dv[2],
                            ])

                            const currentBlock = world.getChunkBlock(
                                chunk.chunkX,
                                chunk.chunkY,
                                x[0],
                                x[1],
                                x[2]
                            )
                            const block = Blocks.ids[c]
                            let textureOffset = block.textureOffset()
                            //TOP
                            if (du[1] == 0 && dv[1] == 0) {
                                if (
                                    currentBlock == null ||
                                    currentBlock.transparent
                                ) {
                                    textureOffset = block.textureOffset('top')
                                } else {
                                    textureOffset =
                                        block.textureOffset('bottom')
                                }
                            }

                            faces.push([
                                vertex_count,
                                vertex_count + 1,
                                vertex_count + 2,
                                vertex_count + 3,
                                textureOffset,
                                blockLight,
                            ])

                            //Zero-out mask
                            for (l = 0; l < h; ++l)
                                for (k = 0; k < w; ++k) {
                                    mask[n + k + l * dims[u]] = 0
                                }
                            //Increment counters and continue
                            i += w
                            n += w
                        } else {
                            ++i
                            ++n
                        }
                    }
            }
        }
        return { vertices: vertices, faces: faces }
    }
}

export default ChunkRenderer
