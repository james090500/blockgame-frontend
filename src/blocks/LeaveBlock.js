import Block from './Block.js'

class LeaveBlock extends Block {
    constructor(id) {
        super()
        this.id = id
        this.texture = 52
        this.transparent = true
    }
}

export default LeaveBlock
