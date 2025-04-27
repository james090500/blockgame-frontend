import Block from './Block.js'

class GrassBlock extends Block {
    constructor(id) {
        super()
        this.id = id
        this.texture = 3
    }

    getTexture(face) {
        if (face == 'top') {
            return this.textureOffset(0)
        } else if (face == 'bottom') {
            return this.textureOffset(2)
        } else {
            return this.textureOffset()
        }
    }
}

export default GrassBlock
