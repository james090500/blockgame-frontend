import { TextureLoader, NearestFilter } from 'three'

class TextureManager {
    static {
        // Ground
        let loader = new TextureLoader()
        TextureManager.grass_block_top = loader.load(
            'public/blocks/grass_block_top.png',
            (texture) => {
                texture.minFilter = NearestFilter
                texture.magFilter = NearestFilter
            }
        )

        TextureManager.dirt_block = loader.load(
            'public/blocks/dirt.png',
            (texture) => {
                texture.minFilter = NearestFilter
                texture.magFilter = NearestFilter
            }
        )

        TextureManager.stone_block = loader.load(
            'public/blocks/stone.png',
            (texture) => {
                texture.minFilter = NearestFilter
                texture.magFilter = NearestFilter
            }
        )
    }
}

export default TextureManager
