import {
    ShaderMaterial,
    Mesh,
    BufferGeometry,
    Float32BufferAttribute,
    Clock,
} from 'three'
import TextureManager from '../../utils/TextureManager.js'
import Blocks from '../../blocks/Blocks.js'
import BlockGame from '../../BlockGame'

class ChunkRenderer {
    chunkMeshes = []
    clock = new Clock()
    worker = new Worker(
        new URL('../../workers/greedyMeshWorker.js', import.meta.url),
        { type: 'module' }
    )

    render(world, chunk) {
        const data = this.makeVoxels(
            [0, 0, 0],
            [chunk.chunkSize, chunk.chunkHeight, chunk.chunkSize],
            function (x, y, z) {
                const block = chunk.getBlock(x, y, z)
                return block != null && !block.transparent ? block.id : null
            }
        )

        this.prepRender(world, chunk, data)
    }

    renderTransparent(world, chunk) {
        const data = this.makeVoxels(
            [0, 0, 0],
            [chunk.chunkSize, chunk.chunkHeight, chunk.chunkSize],
            function (x, y, z) {
                const block = chunk.getBlock(x, y, z)
                return block != null && block.transparent ? block.id : null
            }
        )

        this.prepRender(world, chunk, data, true)
    }

    dispose() {
        this.chunkMeshes.forEach((mesh) => {
            BlockGame.instance.renderer.sceneManager.remove(mesh)
        })
    }

    prepRender(world, chunk, data, transparent = false) {
        this.worker.postMessage({
            volume: data.voxels,
            dims: data.dims,
            transparent,
        })

        this.worker.onmessage = (e) => {
            const { vertices, faces, transparent } = e.data
            this.handleMeshResult(chunk, vertices, faces, transparent)
        }
    }

    handleMeshResult(chunk, vertices, faces, transparent) {
        var geometry = new BufferGeometry()
        var material = new ShaderMaterial({
            vertexShader: `
                attribute vec2 textureOffset;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vTexOffset;

                void main() {
                    vUv = uv;
                    vNormal = normalize(normal);
                    vPosition = position;
                    vTexOffset = textureOffset;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D baseTexture;
                uniform vec2 tileOffset;
                uniform vec2 tileSize;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vTexOffset;

                void main() {
                    vec4 blockLighting;
                    float faceLight = 1.0;
                    vec2 tileSize = vec2(0.0625, 0.0625);
                    vec2 tileUV;

                    // Determine correct UV projection based on face normal
                    if (abs(vNormal.x) > 0.5) {  // Left/Right faces
                        faceLight = 0.8;
                        tileUV = vec2(vPosition.z, vPosition.y);
                    } else if (vNormal.y > 0.5) {  // Top Face
                        tileUV = vec2(vPosition.x, vPosition.z);
                    } else if (vNormal.y < -0.5) {  // Bottom Face
                        tileUV = vec2(vPosition.x, vPosition.z);
                        faceLight = 0.5;
                    } else {  // Front/Back faces
                        faceLight = 0.8;
                        tileUV = vec2(vPosition.x, vPosition.y);
                    }

                    // Apply tiling and offset
                    vec2 texCoord = vTexOffset + tileSize * fract(tileUV);

                    blockLighting = vec4(faceLight * vec3(1.0, 1.0, 1.0), 1.0);
                    gl_FragColor = texture2D(baseTexture, texCoord) * blockLighting;
                }
            `,
            uniforms: {
                baseTexture: { type: 't', value: TextureManager.terrain },
            },
            transparent,
        })

        const surfacemesh = new Mesh(geometry, material)
        surfacemesh.position.set(
            chunk.chunkX * chunk.chunkSize,
            0,
            chunk.chunkY * chunk.chunkSize
        )
        BlockGame.instance.renderer.sceneManager.add(surfacemesh)
        this.chunkMeshes.push(surfacemesh)

        const vertexArray = []
        const indexArray = []
        const textureOffsetArray = []

        for (let i = 0; i < vertices.length; ++i) {
            const q = vertices[i]
            vertexArray.push(q[0], q[1], q[2])
        }

        for (let i = 0; i < faces.length; ++i) {
            const q = faces[i]

            if (q.length === 5) {
                indexArray.push(q[0], q[1], q[2], q[0], q[2], q[3])

                for (let j = 0; j < 4; j++) {
                    textureOffsetArray.push(q[4][0], q[4][1])
                }
            }
        }

        // Convert arrays to TypedArrays
        geometry.setAttribute(
            'position',
            new Float32BufferAttribute(vertexArray, 3)
        )

        geometry.setIndex(indexArray)
        geometry.setAttribute(
            'textureOffset',
            new Float32BufferAttribute(textureOffsetArray, 2)
        )

        geometry.computeVertexNormals() // Ensures proper shading
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
    }

    makeVoxels(l, h, f) {
        var d = [h[0] - l[0], h[1] - l[1], h[2] - l[2]],
            v = new Int32Array(d[0] * d[1] * d[2]),
            n = 0
        for (var k = l[2]; k < h[2]; ++k)
            for (var j = l[1]; j < h[1]; ++j)
                for (var i = l[0]; i < h[0]; ++i, ++n) {
                    v[n] = f(i, j, k)
                }
        return { voxels: v, dims: d }
    }
}

export default ChunkRenderer
