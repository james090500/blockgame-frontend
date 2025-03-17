class Config {
    constructor(options) {
        return {
            PAUSED: true,
            CANVAS: options.canvas,
            USERNAME: options.username,
            ON_LOCK: options.onLock,
            ON_UNLOCK: options.onUnlock,
            ON_UPDATEPLAYERS: options.onUpdatePlayers,
        }
    }
}

export default Config
