import {
    ShaderMaterial,
    Mesh,
    BufferGeometry,
    Float32BufferAttribute,
    Vector2,
} from 'three'
import TextureManager from '../../utils/TextureManager.js'
import Blocks from '../../blocks/Blocks.js'
import BlockGame from '../../BlockGame'

class ChunkRenderer {
    render(world, chunk) {
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
                    vec2 tileSize = vec2(0.0625, 0.0625);

                    vec2 tileUV = vec2(dot(vNormal.zxy, vPosition), dot(vNormal.yzx, vPosition));
                    vec2 texCoord = vTexOffset + tileSize * fract(tileUV);
                    gl_FragColor = texture2D(baseTexture, texCoord);
                }
            `,
            uniforms: {
                baseTexture: { type: 't', value: TextureManager.terrain },
            },
        })

        const surfacemesh = new Mesh(geometry, material)
        surfacemesh.position.set(
            chunk.chunkX * chunk.chunkSize,
            0,
            chunk.chunkY * chunk.chunkSize
        )
        BlockGame.instance.renderer.sceneManager.add(surfacemesh)

        const data = this.makeVoxels(
            [0, 0, 0],
            [chunk.chunkSize, chunk.chunkHeight, chunk.chunkSize],
            function (x, y, z) {
                const index = chunk.getBlock(x, y, z)
                return index
            }
        )
        const result = this.GreedyMesh(data.voxels, data.dims)

        const vertices = []
        const indices = []
        const uvs = []
        const textureOffset = []

        for (let i = 0; i < result.vertices.length; ++i) {
            const q = result.vertices[i]
            vertices.push(q[0], q[1], q[2])
        }

        for (let i = 0; i < result.faces.length; ++i) {
            const q = result.faces[i]

            if (q.length === 6) {
                const uv = q[4] // Now using UVs instead of colors
                indices.push(q[0], q[1], q[2], q[0], q[2], q[3]) // Two triangles

                for (let j = 0; j < 4; j++) {
                    uvs.push(uv[j][0], uv[j][1])
                    textureOffset.push(q[5][0], q[5][1])
                }
            }
        }

        // Convert arrays to TypedArrays
        geometry.setAttribute(
            'position',
            new Float32BufferAttribute(vertices, 3)
        )

        geometry.setIndex(indices)
        geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
        geometry.setAttribute(
            'textureOffset',
            new Float32BufferAttribute(textureOffset, 2)
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

    //https://mikolalysenko.github.io/MinecraftMeshes2/js/greedy.js
    GreedyMesh(volume, dims) {
        var mask = new Int32Array(4096)

        function f(i, j, k) {
            return volume[i + dims[0] * (j + dims[1] * k)]
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
            }
            q[d] = 1
            for (x[d] = -1; x[d] < dims[d]; ) {
                //Compute mask
                var n = 0
                for (x[v] = 0; x[v] < dims[v]; ++x[v])
                    for (x[u] = 0; x[u] < dims[u]; ++x[u], ++n) {
                        var a = 0 <= x[d] ? f(x[0], x[1], x[2]) : 0,
                            b =
                                x[d] < dims[d] - 1
                                    ? f(x[0] + q[0], x[1] + q[1], x[2] + q[2])
                                    : 0
                        if (!!a === !!b) {
                            mask[n] = 0
                        } else if (!!a) {
                            mask[n] = a
                        } else {
                            mask[n] = -b
                        }
                    }
                //Increment x[d]
                ++x[d]
                //Generate mesh for mask using lexicographic ordering
                n = 0
                for (j = 0; j < dims[v]; ++j)
                    for (i = 0; i < dims[u]; ) {
                        var c = mask[n]
                        if (!!c) {
                            //Compute width
                            for (
                                w = 1;
                                c === mask[n + w] && i + w < dims[u];
                                ++w
                            ) {}
                            //Compute height (this is slightly awkward
                            var done = false
                            for (h = 1; j + h < dims[v]; ++h) {
                                for (k = 0; k < w; ++k) {
                                    if (c !== mask[n + k + h * dims[u]]) {
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

                            const block = Blocks.ids[c]
                            const uvBase = block.uv()
                            console.log(uvBase)
                            const uvs = [
                                [uvBase[0], uvBase[1]], // Bottom-left
                                [uvBase[0] + uvBase[2], uvBase[1]], // Bottom-right
                                [uvBase[0] + uvBase[2], uvBase[1] + uvBase[3]], // Top-right
                                [uvBase[0], uvBase[1] + uvBase[3]], // Top-left
                            ]

                            faces.push([
                                vertex_count,
                                vertex_count + 1,
                                vertex_count + 2,
                                vertex_count + 3,
                                uvs,
                                block.textureOffset(),
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
