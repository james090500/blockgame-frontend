import BlockGame from '../BlockGame.js'
import SceneManager from './SceneManager.js'
import { WebGLRenderer } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'

class Renderer {
    constructor() {
        this.sceneManager = new SceneManager()

        this.renderer = new WebGLRenderer({
            canvas: BlockGame.instance.config.CANVAS,
            alpha: true,
        })

        // Shaders
        this.composer = new EffectComposer(this.renderer)
        this.renderPass = new RenderPass(
            this.sceneManager.scene,
            this.sceneManager.camera
        )
        this.fxaaPass = new ShaderPass(FXAAShader)

        this.composer.addPass(this.renderPass)
        this.composer.addPass(this.fxaaPass)

        this.render = this.render.bind(this)
    }
    /**
     * Make sure the renderer is the same size as the canvas
     */
    resizeRendererToDisplaySize() {
        const canvas = BlockGame.instance.config.CANVAS
        const pixelRatio = window.devicePixelRatio
        const width = Math.floor(canvas.clientWidth * pixelRatio)
        const height = Math.floor(canvas.clientHeight * pixelRatio)
        const needResize =
            Math.abs(canvas.width - width) > 1 ||
            Math.abs(canvas.height - height) > 1
        if (needResize) {
            this.renderer.setSize(width, height, false)
            this.composer.setSize(width, height)

            this.fxaaPass.material.uniforms['resolution'].value.x =
                1 / (canvas.clientWidth * pixelRatio)
            this.fxaaPass.material.uniforms['resolution'].value.y =
                1 / (canvas.clientHeight * pixelRatio)
        }
        return needResize
    }
    /**
     * Animate the scene
     */
    render() {
        this.composer.render()

        if (this.resizeRendererToDisplaySize()) {
            const camera = this.sceneManager.camera
            const canvas = BlockGame.instance.config.CANVAS

            camera.aspect = canvas.clientWidth / canvas.clientHeight
            camera.updateProjectionMatrix()
        }
    }
}

export default Renderer
