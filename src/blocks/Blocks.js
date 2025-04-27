import GrassBlock from './GrassBlock.js'
import DirtBlock from './DirtBlock.js'
import StoneBlock from './StoneBlock.js'
import SandBlock from './SandBlock.js'
import WaterBlock from './WaterBlock.js'
import LogBlock from './LogBlock.js'
import LeaveBlock from './LeaveBlock.js'

class Blocks {
    static {
        this.grassBlock = new GrassBlock(1)
        this.dirtBlock = new DirtBlock(2)
        this.stoneBlock = new StoneBlock(3)
        this.sandBlock = new SandBlock(4)
        this.waterBlock = new WaterBlock(5)
        this.logBlock = new LogBlock(6)
        this.leaveBlock = new LeaveBlock(7)

        this.ids = [
            null,
            this.grassBlock,
            this.dirtBlock,
            this.stoneBlock,
            this.sandBlock,
            this.waterBlock,
            this.logBlock,
            this.leaveBlock,
        ]
    }
}

export default Blocks
