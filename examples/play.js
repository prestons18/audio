import { audioInstance } from "@prestonarnold/audio";

const audioArray = [
    "/path/to/audio.mp3",
    "/path/to/another/audio.mp3"
];

const player = audioInstance(audioArray);

player.controls.play();
