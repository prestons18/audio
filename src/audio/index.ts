import { exec, execSync, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import si from "systeminformation"

export class AudioManager {
    private audioQueue: string[] = [];
    private isPlaying = false;
    private playInstance: ChildProcess | null = null;
    private elapsedTime: number = 0;
    private startTime: number | null = null;
    private totalDuration: number | null = null;
    private timer: NodeJS.Timeout | null = null;
    private eventEmitter: EventEmitter = new EventEmitter();

    /**
     * Constructs an instance of AudioManager.
     */
    constructor() {}

    /**
     * Sets the array of audio file paths to play.
     * @param {string[]} audioArray - Array of audio file paths.
     */
    public setAudioQueue(audioArray: string[]): void {
        this.audioQueue = audioArray;
    }

    /**
     * Returns the current platform ('win32' or 'unix').
     * @returns {'win32' | 'unix'} The platform type.
     */
    private getPlatform(): 'win32' | 'unix' {
        return process.platform === 'win32' ? 'win32' : 'unix';
    }

    /**
     * Checks if ffplay is installed by attempting to execute `ffplay -version`.
     * @returns {boolean} True if ffplay is installed, false otherwise.
     */
    private isFFPlayInstalled(): boolean {
        try {
            execSync('ffplay -version', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Handles operations that depend on ffplay by checking if ffplay is installed.
     * @param {() => void} callback - Function to execute if ffplay is installed.
     */
    private ffPlayHandler(callback: () => void): void {
        if (!this.isFFPlayInstalled()) {
            console.error("[@prestonarnold/audio] FFPlay is not installed, cannot run `play` functions!");
            return;
        }
        callback();
    }

    /**
     * Starts playing the next audio file in the queue.
     */
    private playNextInQueue(): void {
        if (!this.isPlaying && this.audioQueue.length > 0) {
            const filePath = this.audioQueue[0];
            this.playInstance = exec(`ffplay -nodisp -autoexit -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filePath}`, (err, stdout, stderr) => {
                if (err) {
                    console.error("Error playing audio:", err);
                    this.isPlaying = false;
                    this.audioQueue.shift();
                    this.playNextInQueue();
                }
            });

            this.playInstance.on('exit', (code, signal) => {
                this.isPlaying = false;
                this.audioQueue.shift();
                this.playNextInQueue();
            });

            this.playInstance.stdout?.on('data', (data) => {
                const duration = parseFloat(data.toString());
                if (!isNaN(duration)) {
                    this.totalDuration = duration * 1000;
                    this.eventEmitter.emit('duration', this.totalDuration);
                }
            });

            this.isPlaying = true;
            this.startTime = Date.now();
            this.startTimer();
        }
    }

    /**
     * Starts the elapsed time timer.
     */
    private startTimer(): void {
        this.stopTimer();
        this.timer = setInterval(() => {
            if (this.startTime !== null) {
                this.elapsedTime = Date.now() - this.startTime;
                this.eventEmitter.emit('timeupdate', this.elapsedTime);
            }
        }, 1000);
    }

    /**
     * Stops the elapsed time timer.
     */
    private stopTimer(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Handles errors by logging them.
     * @param {Error | unknown} error - The error object.
     */
    private handleError(error: Error | unknown) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        } else {
            console.error("Unknown error:", error);
        }
    }

    /**
     * Formats milliseconds into a 'MM:SS' format string.
     * @param {number} milliseconds - The time in milliseconds to format.
     * @returns {string} The formatted time string.
     */
    private formatTime(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Retrieves the current playing time as a formatted string.
     * @returns {string} The formatted current playing time.
     */
    public playingTime(): string {
        if (!this.isPlaying || this.totalDuration === null) {
            return "00:00 - 00:00";
        }
        const elapsedFormatted = this.formatTime(this.elapsedTime);
        const totalFormatted = this.formatTime(this.totalDuration);
        return `${elapsedFormatted} - ${totalFormatted}`;
    }

    /**
     * Retrieves all available audio devices.
     * @returns {string[]} Array of audio device information strings.
     */
    public async audioDevices(): Promise<string[]> {
        try {
            if (this.getPlatform() === 'win32') {
                const data = await si.audio() as unknown as string[]

                console.log(data)

                return data;
            } else {
                const command = 'aplay -L';
                const output = execSync(command, { encoding: 'utf8' });
                return output.split('\n').filter(line => line.trim() !== '');
            }
        } catch (error) {
            console.error("Error retrieving audio devices:", error);
            return [];
        }
    }

    /**
     * Controls object with methods to play, pause, and resume playback.
     */
    public controls = {
        /**
         * Starts playback of the audio queue.
         * @param {() => void} [callback] - Optional callback function to execute after playback starts.
         */
        play: (callback?: () => void) => {
            this.ffPlayHandler(() => {
                if (this.audioQueue.length === 0) {
                    console.warn("No audio files in the queue. Use setAudioQueue() to set the audio files.");
                    return;
                }
                if (!this.isPlaying) {
                    this.playNextInQueue();
                }
                if (callback) {
                    callback();
                }
            });
        },

        /**
         * Pauses the currently playing audio.
         */
        pause: () => {
            this.ffPlayHandler(() => {
                if (this.audioQueue.length === 0) {
                    console.warn("No audio files in the queue. Use setAudioQueue() to set the audio files.");
                    return;
                }
                if (this.playInstance) {
                    try {
                        if (this.getPlatform() === 'win32') {
                            execSync(`taskkill /PID ${this.playInstance.pid} /T /F`);
                        } else {
                            this.playInstance.kill('SIGSTOP');
                        }
                        this.isPlaying = false;
                        this.stopTimer();
                    } catch (error) {
                        this.handleError(error);
                    }
                }
            });
        },

        /**
         * Resumes playback of the paused audio.
         */
        resume: () => {
            this.ffPlayHandler(() => {
                if (this.audioQueue.length === 0) {
                    console.warn("No audio files in the queue. Use setAudioQueue() to set the audio files.");
                    return;
                }
                if (!this.isPlaying) {
                    const filePath = this.audioQueue[0];
                    try {
                        if (this.getPlatform() === 'win32') {
                            this.playInstance = exec(`ffplay -nodisp -autoexit -ss ${this.elapsedTime / 1000} ${filePath}`, (err, stdout, stderr) => {
                                if (err) {
                                    console.error("Error resuming playback:", err);
                                    this.handleError(err);
                                }
                                this.isPlaying = true;
                                this.startTime = Date.now() - this.elapsedTime;
                                this.startTimer();
                            });
                        } else {
                            exec('kill -CONT $(pgrep ffplay)', (err, stdout, stderr) => {
                                if (err) {
                                    console.error("Error resuming playback:", err);
                                    this.handleError(err);
                                }
                            });
                        }
                    } catch (error) {
                        this.handleError(error);
                    }
                }
            });
        }
    };

    /**
     * Registers a listener for specific events.
     * @param {'timeupdate' | 'duration'} event - The event name ('timeupdate' or 'duration').
     * @param {(data: number) => void} listener - The callback function to invoke when the event is triggered.
     */
    public on(event: 'timeupdate' | 'duration', listener: (data: number) => void): void {
        this.eventEmitter.on(event, listener);
    }

    /**
     * Unregisters a listener for specific events.
     * @param {'timeupdate' | 'duration'} event - The event name ('timeupdate' or 'duration').
     * @param {(data: number) => void} listener - The callback function to remove from the event listeners.
     */
    public off(event: 'timeupdate' | 'duration', listener: (data: number) => void): void {
        this.eventEmitter.off(event, listener);
    }
}

/**
 * Factory function to create an instance of AudioManager.
 * @returns {AudioManager} An instance of AudioManager.
 */
export const audioInstance = (): AudioManager => {
    return new AudioManager();
};
