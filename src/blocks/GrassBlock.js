import TextureManager from '../utils/TextureManager.js'
import Block from './Block.js'

class GrassBlock extends Block {
    constructor() {
        super()
        this.setTexture(TextureManager.grass_block_top)
    }
}

export default GrassBlock
