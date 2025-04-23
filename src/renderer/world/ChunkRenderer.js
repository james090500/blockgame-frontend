import {
    ShaderMaterial,
    Mesh,
    BufferGeometry,
    Float32BufferAttribute,
} from 'three'
import TextureManager from '../../utils/TextureManager.js'
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
                    float finalAO = mix(0.2, 1.0, vAo / 3.0);

                    gl_FragColor = vec4(texel.rgb * finalAO, texel.a);
                    //gl_FragColor = vec4(vec2(vAo / 3.0), 1.0, 1.0);
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

        // Add chunks to a promise so we render when completed
        world.chunkMeshPool
            .exec('chunkMesh', [
                {
                    chunkX: chunk.chunkX,
                    chunkY: chunk.chunkY,
                    chunkHeight: chunk.chunkHeight,
                    chunkSize: chunk.chunkSize,
                    chunkData: this.buildChunkDataMap(world, chunk),
                    voxels: data.voxels,
                    dims: data.dims,
                },
            ])
            .then((chunkMesh) => {
                const result = chunkMesh
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

                if (this.chunkMeshes.length > 2) {
                    const oldMesh = this.chunkMeshes.shift()
                    BlockGame.instance.renderer.sceneManager.remove(oldMesh)
                    oldMesh.geometry.dispose()
                    oldMesh.material.dispose()
                }
            })
            .catch((err) => {
                console.error('Error generating chunk:', err)
            })
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

    buildChunkDataMap(world, chunk) {
        const offsets = [
            [0, 0], // Center chunk
            [1, 0], // East
            [-1, 0], // West
            [0, 1], // South
            [0, -1], // North
        ]

        const dataMap = {}

        for (const [dx, dy] of offsets) {
            if (dx == 0 && dy == 0) {
                dataMap[`${chunk.chunkX},${chunk.chunkY}`] = chunk.chunkData
            } else {
                const key = `${chunk.chunkX + dx},${chunk.chunkY + dy}`
                const targetChunk = world.chunks.get(key)
                dataMap[key] = targetChunk?.chunkData || null
            }
        }

        return dataMap
    }
}

export default ChunkRenderer
