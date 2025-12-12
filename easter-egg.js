
// WaveSurfer is loaded globally from the UMD script tag
// Random Demo Assets are loaded from the demo-assets.json file
// The assets are then shuffled and loaded into the randomDemoAssets array
// When the audio finishes playing, a random asset is selected and loaded

// initialize the easter egg
let srcURL = "https://demos.audioshake.ai/demo-assets/shakeitup.mp3"

let randomDemoAssets = []


const wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#0A0F2C',
    progressColor: '#C100F0',
    // progressColor: '#00F5A0',
    barWidth: 3,
    url: srcURL,
    height: 60,
})

wavesurfer.on('interaction', () => {
    wavesurfer.setVolume(0.2);
    wavesurfer.play()
})

wavesurfer.on('finish', () => {
    wavesurfer.stop()
    updateEasterEgg()
})

async function updateEasterEgg() {
    console.log("updateEasterEgg")
    let randomAsset = randomDemoAssets[Math.floor(Math.random() * randomDemoAssets.length)];
    console.log("randomAsset.", randomAsset)

    wavesurfer.load(randomAsset.src)

    // document.getElementById("trackTitle").innerHTML = randomAsset.title


}

async function loadRandomDemoAsset() {
    state.isDemo = true
    const response = await fetch("./assets/demo-assets.json");
    const demoData = await response.json();
    randomDemoAssets = demoData.assets
    console.log("randomDemoAssets", randomDemoAssets)
}

loadRandomDemoAsset();