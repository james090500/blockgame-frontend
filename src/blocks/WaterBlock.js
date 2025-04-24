import Block from './Block.js'

class WaterBlock extends Block {
    constructor() {
        super()
        this.id = 5
        this.texture = 205
        this.transparent = true
        this.solid = false
    }
}

export default WaterBlock
