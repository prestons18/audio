import { AudioManager } from "./audio";

/**
 * Factory function to create an instance of AudioManager.
 * @returns {AudioManager} An instance of AudioManager.
 */
export const audioInstance = (): AudioManager => {
    return new AudioManager();
}