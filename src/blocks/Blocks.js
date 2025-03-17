import GrassBlock from './GrassBlock.js'
import DirtBlock from './DirtBlock.js'
import StoneBlock from './StoneBlock.js'

class Blocks {
    static {
        this.ids = [null, new GrassBlock(), new DirtBlock(), new StoneBlock()]
    }
}

export default Blocks
