import DebugGui from './DebugGui.js'
import CrossHair from './CrossHair.js'

class PlayerGui {
    constructor() {
        this.debugGui = new DebugGui()
        this.crossHair = new CrossHair()
    }

    render() {
        this.debugGui.render()
    }
}

export default PlayerGui
