import { exec, execSync, ChildProcess } from 'child_process';

class AudioPlayer {
    private audioQueue: string[] = [];
    private isPlaying = false;
    private playInstance: ChildProcess | null = null;
    private elapsedTime: number = 0;
    private startTime: number | null = null;
    private timer: NodeJS.Timeout | null = null;

    constructor(audioArray: string[]) {
        this.audioQueue = audioArray;
    }

    private getPlatform(): 'win32' | 'unix' {
        return process.platform === 'win32' ? 'win32' : 'unix';
    }

    private isFFPlayInstalled(): boolean {
        try {
            execSync('ffplay -version', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    private ffPlayHandler(callback: () => void): void {
        if (!this.isFFPlayInstalled()) {
            console.error("[@prestonarnold/audio] FFPlay is not installed, cannot run `play` functions!");
            return;
        }
        callback();
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
            this.startTime = Date.now();
            this.startTimer();
        }
    }

    private startTimer(): void {
        this.stopTimer();
        this.timer = setInterval(() => {
            if (this.startTime !== null) {
                this.elapsedTime = Date.now() - this.startTime;
            }
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    controls = {
        play: (callback?: () => void) => {
            this.ffPlayHandler(() => {
                if (!this.isPlaying && this.audioQueue.length > 0) {
                    this.playNextInQueue();
                }
                if (callback) {
                    callback();
                }
            });
        },
        pause: () => {
            this.ffPlayHandler(() => {
                if (this.playInstance) {
                    if (this.getPlatform() === 'win32') {
                        exec(`taskkill /PID ${this.playInstance.pid} /T /F`);
                    } else {
                        this.playInstance.kill('SIGSTOP');
                    }
                    this.isPlaying = false;
                    this.stopTimer();
                }
            });
        },
        resume: () => {
            this.ffPlayHandler(() => {
                if (!this.isPlaying && this.audioQueue.length > 0) {
                    const filePath = this.audioQueue[0];
                    if (this.getPlatform() === 'win32') {
                        this.playInstance = exec(`ffplay -nodisp -autoexit -ss ${this.elapsedTime / 1000} ${filePath}`, (err, stdout, stderr) => {
                            if (err) {
                                console.error("Error resuming playback:", err);
                            }
                            this.isPlaying = true;
                            this.startTime = Date.now() - this.elapsedTime;
                            this.startTimer();
                        });
                    } else if (this.playInstance) {
                        exec('kill -CONT $(pgrep ffplay)', (err, stdout, stderr) => {
                            if (err) {
                                console.error("Error resuming playback:", err);
                            }
                        });
                    }
                }
            });
        }
    };
}

export const audioInstance = (audioArray: string[]): AudioPlayer => {
    return new AudioPlayer(audioArray);
};
