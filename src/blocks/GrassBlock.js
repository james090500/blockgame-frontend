import Block from './Block.js'

class GrassBlock extends Block {
    constructor() {
        super()
        this.id = 1
        this.texture = 0
    }

    textureOffset(face) {
        const tileScale = 16 / 256

        const x = this.texture % 16
        const y = Math.floor(this.texture / 16)

        const u = x * tileScale
        const v = 1 - y * tileScale - tileScale

        if (face == 'top') {
            return [u, v]
        } else {
            return [u + tileScale * 3, v]
        }
    }
}

export default GrassBlock
