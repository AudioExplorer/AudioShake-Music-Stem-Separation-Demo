
// WaveSurfer is loaded globally from the UMD script tag
// todo -- change to evergreen url
let url = "https://demos.spatial-explorer.com/demo-assets/shakeitup.mp3"
const wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#4F4A85',
    progressColor: '#383351',
    url: url,
})

wavesurfer.on('interaction', () => {
    wavesurfer.play()
})
