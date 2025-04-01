import { TextureLoader, NearestFilter } from 'three/webgpu'

class TextureManager {
    static {
        // Ground
        let loader = new TextureLoader()
        TextureManager.terrain = loader.load('terrain.png', (texture) => {
            texture.minFilter = texture.magFilter = NearestFilter
        })
    }
}

export default TextureManager
