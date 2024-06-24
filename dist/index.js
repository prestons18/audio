"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioInstance = void 0;
const audio_1 = require("./audio");
/**
 * Factory function to create an instance of AudioManager.
 * @returns {AudioManager} An instance of AudioManager.
 */
const audioInstance = () => {
    return new audio_1.AudioManager();
};
exports.audioInstance = audioInstance;
//# sourceMappingURL=index.js.map