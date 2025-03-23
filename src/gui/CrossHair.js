import { ShaderMaterial, Sprite } from 'three'
import BlockGame from '../BlockGame.js'

class CrossHair {
    constructor() {
        //https://codepen.io/driezis/pen/jOPzjLG
        var pMat = new ShaderMaterial({
            uniforms: {
                main_color: { value: { r: 1, g: 1, b: 1 } },
                border_color: { value: { r: 0, g: 0, b: 0.1 } },

                thickness: { value: 0.005 },
                height: { value: 0.02 },
                offset: { value: 0.01 },
                border: { value: 0.003 },

                opacity: { value: 1 },
                center: { value: { x: 0.5, y: 0.5 } },
                rotation: { value: 0 },
            },
            vertexShader: `
                    uniform float rotation;
                    uniform vec2 center;
                    #include <common>
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
                        vec2 scale;
                        scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
                        scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
                        #ifndef USE_SIZEATTENUATION
                            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
                            if ( isPerspective ) scale *= - mvPosition.z;
                        #endif
                        vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
                        vec2 rotatedPosition;
                        rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
                        rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
                        mvPosition.xy += rotatedPosition;
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
            fragmentShader: `
                uniform vec3 main_color;
                uniform vec3 border_color;
                uniform float opacity;

                uniform float thickness;
                uniform float height;
                uniform float offset;
                uniform float border;

                varying vec2 vUv;
                void main() {

                    float a = (step(abs(vUv.x - 0.5), thickness)) * step(abs(vUv.y - 0.5), height + offset) * step(offset, abs(vUv.y - 0.5)) + (step(abs(vUv.y - 0.5), thickness)) * step(abs(vUv.x - 0.5), height + offset) * step(offset, abs(vUv.x - 0.5));
                    float b = (step(abs(vUv.x - 0.5), thickness - border)) * step(abs(vUv.y - 0.5), height + offset - border) * step(offset + border, abs(vUv.y - 0.5)) + (step(abs(vUv.y - 0.5), thickness - border)) * step(abs(vUv.x - 0.5), height + offset - border) * step(offset + border, abs(vUv.x - 0.5));
                    gl_FragColor = vec4( mix(border_color, main_color, b), a * opacity);
                }
             `,
            transparent: true,
        })

        this.mesh = new Sprite(pMat)

        this.mesh.position.set(0, 0, -1)

        this.mesh.renderOrder = 999
        this.mesh.material.depthTest = false
        this.mesh.material.transparent = true

        BlockGame.instance.renderer.sceneManager.camera.add(this.mesh)
    }
}

export default CrossHair
