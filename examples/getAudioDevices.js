const { audioInstance } = require("../dist/index")

const player = audioInstance();

async function getAudioDevices() {
    const audioDevices = await player.audioDevices();
    console.log(audioDevices)

}

getAudioDevices()