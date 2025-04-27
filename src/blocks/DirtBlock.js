import Block from './Block.js'

class GrassBlock extends Block {
    constructor(id) {
        super()
        this.id = id
        this.texture = 2
    }
}

export default GrassBlock
