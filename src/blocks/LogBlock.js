import Block from './Block.js'

class LogBlock extends Block {
    constructor(id) {
        super()
        this.id = id
        this.texture = 20
    }

    getTexture(face) {
        if (face == 'top' || face == 'bottom') {
            return this.textureOffset(21)
        } else {
            return this.textureOffset()
        }
    }
}

export default LogBlock
