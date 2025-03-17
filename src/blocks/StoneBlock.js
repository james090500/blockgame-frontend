import TextureManager from '../utils/TextureManager.js'
import Block from './Block.js'

class StoneBlock extends Block {
    constructor() {
        super()
        this.setTexture(TextureManager.stone_block)
    }
}

export default StoneBlock
