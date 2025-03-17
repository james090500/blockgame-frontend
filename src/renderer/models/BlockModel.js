/* eslint-disable prettier/prettier */
class BlockModel {
    //BOTTOM LEFT
    //BOTTOM RIGHT
    //TOP RIGHT

    //BOTTOM LEFT
    //TOP RIGHT
    //TOP LEFT
    static {
        this.UV = [
            0, 0,
            1, 0,
            1, 1,
            0, 0,
            1, 1,
            0, 1
        ]

        this.LEFT = {
            name: 'LEFT',
            vertices: [
                0.0, 0.0, 0.0,
                0.0, 0.0, 1.0,
                0.0, 1.0, 1.0,
                0.0, 0.0, 0.0,
                0.0, 1.0, 1.0,
                0.0, 1.0, 0.0,
            ],
        }

        this.RIGHT = {
            name: 'RIGHT',
            vertices: [
                1.0, 0.0, 1.0,
                1.0, 0.0, 0.0,
                1.0, 1.0, 0.0,
                1.0, 0.0, 1.0,
                1.0, 1.0, 0.0,
                1.0, 1.0, 1.0
            ]
        }

        this.BACK = {
            name: 'BACK',
            vertices: [
                1.0, 0.0, 0.0,
                0.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                1.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                1.0, 1.0, 0.0,
            ]
        }

        this.FRONT = {
            name: 'FRONT',
            vertices: [
                0.0, 0.0, 1.0,
                1.0, 0.0, 1.0,
                1.0, 1.0, 1.0,
                0.0, 0.0, 1.0,
                1.0, 1.0, 1.0,
                0.0, 1.0, 1.0
            ],
        }

        this.BOTTOM = {
            name: 'BOTTOM',
            vertices: [
                0.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                1.0, 0.0, 1.0,
                0.0, 0.0, 0.0,
                1.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
            ]
        }
        this.TOP = {
            name: 'TOP',
            vertices: [
                0.0, 1.0, 1.0,
                1.0, 1.0, 1.0,
                1.0, 1.0, 0.0,
                0.0, 1.0, 1.0,
                1.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
            ]
        }
    }
}

export default BlockModel
