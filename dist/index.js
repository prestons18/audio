"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioInstance = void 0;
const child_process_1 = require("child_process");
class AudioPlayer {
    constructor(audioArray) {
        this.audioQueue = [];
        this.isPlaying = false;
        this.playInstance = null;
        this.controls = {
            play: (callback) => {
                if (!this.isPlaying && this.audioQueue.length > 0) {
                    this.playNextInQueue();
                }
                if (callback) {
                    callback();
                }
            },
            pause: () => {
                if (this.playInstance) {
                    this.playInstance.kill('SIGSTOP');
                }
            },
            resume: () => {
                if (this.playInstance) {
                    (0, child_process_1.exec)('kill -CONT $(pgrep play)', (err, stdout, stderr) => {
                        if (err) {
                            console.error("Error resuming playback:", err);
                        }
                    });
                }
            }
        };
        this.audioQueue = audioArray;
    }
    playNextInQueue() {
        if (!this.isPlaying && this.audioQueue.length > 0) {
            const filePath = this.audioQueue[0];
            this.playInstance = (0, child_process_1.exec)(`play ${filePath}`, (err, stdout, stderr) => {
                if (err) {
                    console.error("Error playing audio:", err);
                }
                this.isPlaying = false;
                this.audioQueue.shift();
                this.playNextInQueue();
            });
            this.isPlaying = true;
        }
    }
}
const audioInstance = (audioArray) => {
    return new AudioPlayer(audioArray);
};
exports.audioInstance = audioInstance;
