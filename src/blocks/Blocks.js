import GrassBlock from './GrassBlock.js'
import DirtBlock from './DirtBlock.js'
import StoneBlock from './StoneBlock.js'
import SandBlock from './SandBlock.js'
import WaterBlock from './WaterBlock.js'

class Blocks {
    static {
        this.grassBlock = new GrassBlock()
        this.dirtBlock = new DirtBlock()
        this.stoneBlock = new StoneBlock()
        this.sandBlock = new SandBlock()
        this.waterBlock = new WaterBlock()

        this.ids = [
            null,
            this.grassBlock,
            this.dirtBlock,
            this.stoneBlock,
            this.sandBlock,
            this.waterBlock,
        ]
    }
}

export default Blocks
