import { audioInstance } from "../src/audio"; // Change to package

const audioArray = [
    "/path/to/audio.mp3",
    "/path/to/another/audio.mp3"
];

const player = audioInstance(audioArray);

player.controls.play();
