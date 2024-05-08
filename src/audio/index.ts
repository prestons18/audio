import { exec } from 'child_process';

class AudioPlayer {
    private audioQueue: string[] = [];
    private isPlaying = false;
    private playInstance: any = null;

    controls = {
        play: (callback?: () => void) => {
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
                exec('kill -CONT $(pgrep play)', (err, stdout, stderr) => {
                    if (err) {
                        console.error("Error resuming playback:", err);
                    }
                });
            }
        }
    };

    constructor(audioArray: string[]) {
        this.audioQueue = audioArray;
    }

    private playNextInQueue(): void {
        if (!this.isPlaying && this.audioQueue.length > 0) {
            const filePath = this.audioQueue[0];
            this.playInstance = exec(`play ${filePath}`, (err, stdout, stderr) => {
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

export const audioInstance = (audioArray: string[]): AudioPlayer => {
    return new AudioPlayer(audioArray);
};
