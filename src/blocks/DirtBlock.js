import TextureManager from '../utils/TextureManager.js'
import Block from './Block.js'

class GrassBlock extends Block {
    constructor() {
        super()
        this.setTexture(TextureManager.dirt_block)
    }
}

export default GrassBlock
