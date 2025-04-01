import DebugGui from './DebugGui.js'
import CrossHair from './CrossHair.js'
import BlockOverlay from './BlockOverlay.js'

class PlayerGui {
    constructor() {
        this.debugGui = new DebugGui()
        // this.crossHair = new CrossHair()
        this.blockOverlay = new BlockOverlay()
    }

    render() {
        this.debugGui.render()
    }
}

export default PlayerGui
