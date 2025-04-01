import BlockGame from '../BlockGame.js'
import SceneManager from './SceneManager.js'
import { WebGPURenderer } from 'three/webgpu'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

class Renderer {
    constructor() {
        this.sceneManager = new SceneManager()

        this.renderer = new WebGPURenderer({
            canvas: BlockGame.instance.config.CANVAS,
            alpha: true,
            antialias: true,
        })

        // this.renderer = new WebGLRenderer({
        //     canvas: BlockGame.instance.config.CANVAS,
        //     alpha: true,
        // })

        // Shaders
        // this.composer = new EffectComposer(this.renderer)
        // this.renderPass = new RenderPass(
        //     this.sceneManager.scene,
        //     this.sceneManager.camera
        // )
        // this.fxaaPass = new ShaderPass(FXAAShader)
        // this.ssaoPass = new SSAOPass(
        //     this.sceneManager.scene,
        //     this.sceneManager.camera
        // )
        // this.outputPass = new OutputPass()

        // //SAO Test
        // this.ssaoPass.output = SSAOPass.OUTPUT.SSAO
        // this.ssaoPass.kernelRadius = 16
        // this.ssaoPass.minDistance = 0.5
        // this.ssaoPass.maxDistance = 1

        // this.composer.addPass(this.renderPass)
        // this.composer.addPass(this.fxaaPass)
        // this.composer.addPass(this.ssaoPass)
        // this.composer.addPass(this.outputPass)

        this.render = this.render.bind(this)

        this.renderer.init().then(() => BlockGame.instance.loop())
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
            // this.renderer.setSize(width, height, false)
            // this.composer.setSize(width, height)
            // this.ssaoPass.setSize(width, height)
            //
            // this.fxaaPass.material.uniforms['resolution'].value.x =
            //     1 / (canvas.clientWidth * pixelRatio)
            // this.fxaaPass.material.uniforms['resolution'].value.y =
            //     1 / (canvas.clientHeight * pixelRatio)
        }
        return needResize
    }
    /**
     * Animate the scene
     */
    render() {
        this.renderer.render(this.sceneManager.scene, this.sceneManager.camera)

        if (this.resizeRendererToDisplaySize()) {
            const camera = this.sceneManager.camera
            const canvas = BlockGame.instance.config.CANVAS

            camera.aspect = canvas.clientWidth / canvas.clientHeight
            camera.updateProjectionMatrix()

            this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
        }
    }
}

export default Renderer
