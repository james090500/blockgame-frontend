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

        TextureManager.grass_block_top = loader.load(
            'public/blocks/grass_block_top.png',
            (texture) => {
                texture.minFilter = texture.magFilter = NearestFilter
                texture.wrapS = texture.wrapT = RepeatWrapping
            }
        )

        TextureManager.dirt_block = loader.load(
            'public/blocks/dirt.png',
            (texture) => {
                texture.minFilter = texture.magFilter = NearestFilter
                texture.wrapS = texture.wrapT = RepeatWrapping
            }
        )

        TextureManager.stone_block = loader.load(
            'public/blocks/stone.png',
            (texture) => {
                texture.minFilter = texture.magFilter = NearestFilter
                texture.wrapS = texture.wrapT = RepeatWrapping
            }
        )
    }
}

export default TextureManager
