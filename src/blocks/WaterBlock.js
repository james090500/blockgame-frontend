import Block from './Block.js'

class WaterBlock extends Block {
    constructor(id) {
        super()
        this.id = id
        this.texture = 205
        this.transparent = true
        this.solid = false
    }
}

export default WaterBlock
