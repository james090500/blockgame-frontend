import GrassBlock from './GrassBlock.js'
import DirtBlock from './DirtBlock.js'
import StoneBlock from './StoneBlock.js'
import SandBlock from './SandBlock.js'
import WaterBlock from './WaterBlock.js'

class Blocks {
    static {
        this.ids = [
            null,
            new GrassBlock(),
            new DirtBlock(),
            new StoneBlock(),
            new SandBlock(),
            new WaterBlock(),
        ]
    }
}

export default Blocks
