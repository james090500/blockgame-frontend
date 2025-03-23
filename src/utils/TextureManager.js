import { TextureLoader, NearestFilter, RepeatWrapping } from 'three'

class TextureManager {
    static {
        // Ground
        let loader = new TextureLoader()
        TextureManager.terrain = loader.load(
            'public/terrain.png',
            (texture) => {
                texture.minFilter = texture.magFilter = NearestFilter
            }
        )
    }
}

export default TextureManager
