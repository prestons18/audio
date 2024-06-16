"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioInstance = exports.AudioManager = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const systeminformation_1 = __importDefault(require("systeminformation"));
class AudioManager {
    /**
     * Constructs an instance of AudioManager.
     */
    constructor() {
        this.audioQueue = [];
        this.isPlaying = false;
        this.playInstance = null;
        this.elapsedTime = 0;
        this.startTime = null;
        this.totalDuration = null;
        this.timer = null;
        this.eventEmitter = new events_1.EventEmitter();
        /**
         * Controls object with methods to play, pause, and resume playback.
         */
        this.controls = {
            /**
             * Starts playback of the audio queue.
             * @param {() => void} [callback] - Optional callback function to execute after playback starts.
             */
            play: (callback) => {
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
                                (0, child_process_1.execSync)(`taskkill /PID ${this.playInstance.pid} /T /F`);
                            }
                            else {
                                this.playInstance.kill('SIGSTOP');
                            }
                            this.isPlaying = false;
                            this.stopTimer();
                        }
                        catch (error) {
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
                                this.playInstance = (0, child_process_1.exec)(`ffplay -nodisp -autoexit -ss ${this.elapsedTime / 1000} ${filePath}`, (err, stdout, stderr) => {
                                    if (err) {
                                        console.error("Error resuming playback:", err);
                                        this.handleError(err);
                                    }
                                    this.isPlaying = true;
                                    this.startTime = Date.now() - this.elapsedTime;
                                    this.startTimer();
                                });
                            }
                            else {
                                (0, child_process_1.exec)('kill -CONT $(pgrep ffplay)', (err, stdout, stderr) => {
                                    if (err) {
                                        console.error("Error resuming playback:", err);
                                        this.handleError(err);
                                    }
                                });
                            }
                        }
                        catch (error) {
                            this.handleError(error);
                        }
                    }
                });
            }
        };
    }
    /**
     * Sets the array of audio file paths to play.
     * @param {string[]} audioArray - Array of audio file paths.
     */
    setAudioQueue(audioArray) {
        this.audioQueue = audioArray;
    }
    /**
     * Returns the current platform ('win32' or 'unix').
     * @returns {'win32' | 'unix'} The platform type.
     */
    getPlatform() {
        return process.platform === 'win32' ? 'win32' : 'unix';
    }
    /**
     * Checks if ffplay is installed by attempting to execute `ffplay -version`.
     * @returns {boolean} True if ffplay is installed, false otherwise.
     */
    isFFPlayInstalled() {
        try {
            (0, child_process_1.execSync)('ffplay -version', { stdio: 'ignore' });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Handles operations that depend on ffplay by checking if ffplay is installed.
     * @param {() => void} callback - Function to execute if ffplay is installed.
     */
    ffPlayHandler(callback) {
        if (!this.isFFPlayInstalled()) {
            console.error("[@prestonarnold/audio] FFPlay is not installed, cannot run `play` functions!");
            return;
        }
        callback();
    }
    /**
     * Starts playing the next audio file in the queue.
     */
    playNextInQueue() {
        var _a;
        if (!this.isPlaying && this.audioQueue.length > 0) {
            const filePath = this.audioQueue[0];
            this.playInstance = (0, child_process_1.exec)(`ffplay -nodisp -autoexit -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filePath}`, (err, stdout, stderr) => {
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
            (_a = this.playInstance.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
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
    startTimer() {
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
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    /**
     * Handles errors by logging them.
     * @param {Error | unknown} error - The error object.
     */
    handleError(error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        }
        else {
            console.error("Unknown error:", error);
        }
    }
    /**
     * Formats milliseconds into a 'MM:SS' format string.
     * @param {number} milliseconds - The time in milliseconds to format.
     * @returns {string} The formatted time string.
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    /**
     * Retrieves the current playing time as a formatted string.
     * @returns {string} The formatted current playing time.
     */
    playingTime() {
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
    audioDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.getPlatform() === 'win32') {
                    const data = yield systeminformation_1.default.audio();
                    console.log(data);
                    return data;
                }
                else {
                    const command = 'aplay -L';
                    const output = (0, child_process_1.execSync)(command, { encoding: 'utf8' });
                    return output.split('\n').filter(line => line.trim() !== '');
                }
            }
            catch (error) {
                console.error("Error retrieving audio devices:", error);
                return [];
            }
        });
    }
    /**
     * Registers a listener for specific events.
     * @param {'timeupdate' | 'duration'} event - The event name ('timeupdate' or 'duration').
     * @param {(data: number) => void} listener - The callback function to invoke when the event is triggered.
     */
    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }
    /**
     * Unregisters a listener for specific events.
     * @param {'timeupdate' | 'duration'} event - The event name ('timeupdate' or 'duration').
     * @param {(data: number) => void} listener - The callback function to remove from the event listeners.
     */
    off(event, listener) {
        this.eventEmitter.off(event, listener);
    }
}
exports.AudioManager = AudioManager;
/**
 * Factory function to create an instance of AudioManager.
 * @returns {AudioManager} An instance of AudioManager.
 */
const audioInstance = () => {
    return new AudioManager();
};
exports.audioInstance = audioInstance;
