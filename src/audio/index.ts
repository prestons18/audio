import { exec, ChildProcess } from 'child_process';

class AudioPlayer {
    private audioQueue: string[] = [];
    private isPlaying = false;
    private playInstance: ChildProcess | null = null;

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
                if (process.platform === 'win32') {
                    exec(`taskkill /PID ${this.playInstance.pid} /T /F`);
                } else {
                    this.playInstance.kill('SIGSTOP');
                }
            }
        },
        resume: () => {
            if (this.playInstance) {
                if (process.platform === 'win32') {
                    console.error("Resume not supported on Windows");
                } else {
                    exec('kill -CONT $(pgrep ffplay)', (err, stdout, stderr) => {
                        if (err) {
                            console.error("Error resuming playback:", err);
                        }
                    });
                }
            }
        }
    };

    constructor(audioArray: string[]) {
        this.audioQueue = audioArray;
    }

    private playNextInQueue(): void {
        if (!this.isPlaying && this.audioQueue.length > 0) {
            const filePath = this.audioQueue[0];
            this.playInstance = exec(`ffplay -nodisp -autoexit ${filePath}`, (err, stdout, stderr) => {
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
