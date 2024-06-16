import { audioInstance } from "../src/audio/index"

const audioArray = [
    "/path/to/audio.mp3",
    "/path/to/another/audio.mp3"
];

const player = audioInstance();

player.setAudioQueue(audioArray)

player.controls.play();
