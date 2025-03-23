class Block {
    texture

    setTexture(texture) {
        this.texture = texture
    }

    uv() {
        const tileScale = 16 / 256

        const x = this.texture % 16
        const y = Math.floor(this.texture / 16)

        const u = x * tileScale
        const v = 1 - y * tileScale

        return [u, v, tileScale, tileScale]
    }

    textureOffset(face = null) {
        const tileScale = 16 / 256

        const x = this.texture % 16
        const y = Math.floor(this.texture / 16)

        const u = x * tileScale
        const v = 1 - y * tileScale - tileScale

        return [u, v]
    }
}

export default Block
