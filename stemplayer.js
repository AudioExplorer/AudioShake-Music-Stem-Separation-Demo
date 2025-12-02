let audioContext = null;
let stemPlayers = [];
let isPlaying = false;
let startTime = 0;
let pausedAt = 0;

// Play All button
document.getElementById("playAllBtn").onclick = () => {
    if (!isPlaying) playAllStems();
    else pauseAllStems();
};

const refreshStemsBtn = document.getElementById("refreshStemsBtn");
refreshStemsBtn.addEventListener('click', refreshStems);

async function refreshStems() {
    showToast("Refresing Stems")
    const taskId = completedTask.id
    if (taskId) {
        result = await api.getTask(taskId);
        addDebugEntry(result, 'success');
        console.log(result);
        // toto update completedTask
        loadStems(result);
    }
}

async function loadStems(completedTask) {

    // note add this to real api
    const expiry = getTaskExpiryInfo(completedTask)
    showToast(`Source separation complete! \n Downloads ${expiry.expiryMessage}`);

    const container = document.querySelector(".stems-placeholder");
    container.innerHTML = `<h3>${completedTask.id} ${expiry.expiryMessage}</h3>`;

    // todo show hide not working 
    if (expiry.expiryMessage == 'Expired') {
        container.textContent = "Stems have expired Refresh";
        document.getElementById("refreshStemsBtn").classList.remove('hidden');

        document.getElementById("playAllBtn").classList.remove('hidden');

        return;
    }

    const outputs = completedTask?.targets?.[0]?.output;
    if (!Array.isArray(outputs) || outputs.length === 0) {
        container.textContent = "No stems found.";
        return;
    }

    if (!audioContext) audioContext = new AudioContext();
    stemPlayers = []; // reset

    // DAW-style vertical track stack
    const trackStack = document.createElement("div");
    trackStack.style.display = "flex";
    trackStack.style.flexDirection = "column";
    trackStack.style.gap = "12px";
    trackStack.style.width = "100%";
    trackStack.style.padding = "14px";
    trackStack.style.alignItems = "center";
    container.appendChild(trackStack);

    for (const stem of outputs) {
        const stemName = stem.name;

        // format the name
        const label = stemName
            .replace(/(_)/g, ' ')   // replace underscores with spaces
            .toLowerCase()          // convert to lowercase
            .split(' ')             // split the string into an array of words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))  // capitalize first letter of each word
            .join(' ');              // join back to a single string

        const url = stem.link;

        // === DAW-STYLE TRACK ROW ===
        const track = document.createElement("div");
        track.style.display = "flex";
        track.style.alignItems = "center";
        track.style.background = "#f6f6f6ff";
        track.style.color = "#6466f1";
        track.style.padding = "12px";
        track.style.borderRadius = "12px";
        track.style.boxShadow = "0 2px 6px rgba(0,0,0,0.35)";

        track.style.border = "2px solid #6466f1";
        track.style.minHeight = "80px";
        track.style.gap = "12px";

        // LEFT SIDE: Track Controls
        const leftControls = document.createElement("div");
        leftControls.style.display = "flex";
        leftControls.style.flexDirection = "column";
        leftControls.style.gap = "6px";
        leftControls.style.minWidth = "200px";

        const title = document.createElement("div");
        title.textContent = label;
        title.style.fontWeight = "600";
        title.style.fontSize = "14px";
        title.style.marginBottom = "4px";

        // Mute/Solo/Download buttons row
        const buttonRow = document.createElement("div");
        buttonRow.style.display = "flex";
        buttonRow.style.gap = "6px";
        buttonRow.style.flexWrap = "wrap";

        const muteBtn = document.createElement("button");
        muteBtn.textContent = "M";
        muteBtn.style.width = "36px";
        muteBtn.style.height = "28px";
        muteBtn.style.fontSize = "12px";
        muteBtn.style.fontWeight = "bold";
        muteBtn.style.cursor = "pointer";

        const soloBtn = document.createElement("button");
        soloBtn.textContent = "S";
        soloBtn.style.width = "36px";
        soloBtn.style.height = "28px";
        soloBtn.style.fontSize = "12px";
        soloBtn.style.fontWeight = "bold";
        soloBtn.style.cursor = "pointer";

        const downloadBtn = document.createElement("a");
        downloadBtn.href = url;
        downloadBtn.download = stemName + ".mp3";
        downloadBtn.textContent = "↓";
        downloadBtn.style.width = "36px";
        downloadBtn.style.height = "28px";
        downloadBtn.style.fontSize = "16px";
        downloadBtn.style.fontWeight = "bold";
        downloadBtn.style.cursor = "pointer";
        downloadBtn.style.display = "flex";
        downloadBtn.style.alignItems = "center";
        downloadBtn.style.justifyContent = "center";
        downloadBtn.style.textDecoration = "none";
        downloadBtn.style.border = "1px solid #555";
        downloadBtn.style.borderRadius = "4px";
        downloadBtn.style.background = "#2a2a2a";
        downloadBtn.style.color = "#fff";
        downloadBtn.title = "Download " + stemName;

        // Volume fader
        const volumeContainer = document.createElement("div");
        volumeContainer.style.display = "flex";
        volumeContainer.style.alignItems = "center";
        volumeContainer.style.gap = "6px";

        const volumeLabel = document.createElement("span");
        volumeLabel.textContent = "Vol:";
        volumeLabel.style.fontSize = "11px";
        volumeLabel.style.color = "#999";

        const volumeSlider = document.createElement("input");
        volumeSlider.type = "range";
        volumeSlider.min = "0";
        volumeSlider.max = "100";
        volumeSlider.value = "100";
        volumeSlider.style.width = "80px";

        volumeContainer.appendChild(volumeLabel);
        volumeContainer.appendChild(volumeSlider);

        buttonRow.appendChild(muteBtn);
        buttonRow.appendChild(soloBtn);
        buttonRow.appendChild(downloadBtn);

        leftControls.appendChild(title);
        leftControls.appendChild(buttonRow);
        leftControls.appendChild(volumeContainer);

        // RIGHT SIDE: Waveform area (audio element)
        const waveformArea = document.createElement("div");
        waveformArea.style.flex = "1";
        waveformArea.style.display = "flex";
        waveformArea.style.alignItems = "center";
        waveformArea.style.background = "#6466f1";
        waveformArea.style.borderRadius = "4px";
        waveformArea.style.padding = "8px";
        waveformArea.style.minHeight = "60px";

        // Audio element (hidden controls, we'll use the global play button)
        const audio = document.createElement("audio");
        audio.controls = false;
        audio.src = url;
        audio.preload = "metadata"; // Load metadata to enable captureStream
        audio.style.width = "100%";
        // Note: Not setting crossOrigin to avoid CORS issues with signed URLs

        // Waveform container with canvas
        const waveformContainer = document.createElement("div");
        waveformContainer.style.width = "100%";
        waveformContainer.style.height = "60px";
        waveformContainer.style.position = "relative";
        waveformContainer.style.cursor = "pointer";
        waveformContainer.style.background = "#6466f1";
        waveformContainer.style.borderRadius = "2px";

        // Canvas for waveform
        const canvas = document.createElement("canvas");
        canvas.width = 1000; // High resolution
        canvas.height = 60;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        waveformContainer.appendChild(canvas);

        // Playhead line
        const playhead = document.createElement("div");
        playhead.style.position = "absolute";
        playhead.style.left = "0%";
        playhead.style.top = "0";
        playhead.style.width = "2px";
        playhead.style.height = "100%";
        playhead.style.background = "#ff4444";
        playhead.style.pointerEvents = "none";
        playhead.style.zIndex = "10";
        playhead.style.boxShadow = "0 0 4px rgba(255, 68, 68, 0.5)";
        waveformContainer.appendChild(playhead);

        waveformArea.appendChild(waveformContainer);

        track.appendChild(leftControls);
        track.appendChild(waveformArea);
        trackStack.appendChild(track);

        const item = {
            name: stemName,
            url,
            audio,
            muted: false,
            solo: false,
            volume: 1,
            canvas,
            playhead,
            waveformContainer,
            muteBtn,
            soloBtn,
        };

        stemPlayers.push(item);

        // Draw waveform once when metadata loads
        audio.addEventListener('loadedmetadata', () => {
            drawStaticWaveformFromAudio(audio, canvas, stemName);
        }, { once: true });

        // ========== VOLUME SLIDER ==========
        volumeSlider.oninput = () => {
            item.volume = volumeSlider.value / 100;
            updateAudioVolume(item);
        };

        // ========== MUTE ==========
        muteBtn.onclick = () => {
            item.muted = !item.muted;
            if (item.muted) {
                muteBtn.style.background = "#ff4444";
                muteBtn.style.color = "#fff";
            } else {
                muteBtn.style.background = "";
                muteBtn.style.color = "";
            }
            applySoloMuteLogic();
        };

        // ========== SOLO ==========
        soloBtn.onclick = () => {
            item.solo = !item.solo;

            // Update button appearance
            if (item.solo) {
                soloBtn.style.background = "#44ff44";
                soloBtn.style.color = "#000";
            } else {
                soloBtn.style.background = "";
                soloBtn.style.color = "";
            }

            // Update all track buttons to reflect solo state
            stemPlayers.forEach(s => {
                if (s.solo) {
                    s.soloBtn.style.background = "#44ff44";
                    s.soloBtn.style.color = "#000";
                } else {
                    s.soloBtn.style.background = "";
                    s.soloBtn.style.color = "";
                }
            });

            applySoloMuteLogic();
        };

        // ========== WAVEFORM CLICK TO SEEK ==========
        waveformContainer.onclick = (e) => {
            const rect = waveformContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const newTime = percentage * audio.duration;

            // Update all stems to the new time
            stemPlayers.forEach(s => {
                s.audio.currentTime = newTime;
            });
            pausedAt = newTime;
        };

        // ========== UPDATE PLAYHEAD POSITION ==========
        audio.ontimeupdate = () => {
            if (audio.duration) {
                const percentage = (audio.currentTime / audio.duration) * 100;
                playhead.style.left = percentage + "%";
            }
        };
    }
}

// =====================================================
// AUDIO VOLUME CONTROL
// =====================================================
function updateAudioVolume(item) {
    const anySolo = stemPlayers.some(s => s.solo);
    const shouldMute = anySolo ? !item.solo : item.muted;
    item.audio.volume = shouldMute ? 0 : item.volume;
}

// =====================================================
// SOLO / MUTE LOGIC
// =====================================================
function applySoloMuteLogic() {
    stemPlayers.forEach(s => {
        updateAudioVolume(s);
    });
}

// =====================================================
// SYNCED PLAYBACK USING <audio> ELEMENTS
// =====================================================
function playAllStems() {
    stemPlayers.forEach(s => {
        s.audio.currentTime = pausedAt; // sync position
        s.audio.play();
    });

    isPlaying = true;
    document.getElementById("playAllBtn").textContent = "Pause All";
}

function pauseAllStems() {
    if (!isPlaying) return;

    // capture the pause position from the FIRST active audio
    const first = stemPlayers[0];
    pausedAt = first.audio.currentTime;

    stemPlayers.forEach(s => s.audio.pause());

    isPlaying = false;
    document.getElementById("playAllBtn").textContent = "Play All";
}

// =====================================================
// STATIC WAVEFORM VISUALIZATION
// =====================================================
async function drawStaticWaveformFromAudio(audio, canvas, stemName) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Create a TEMPORARY AudioContext just for waveform analysis
    // This won't interfere with playback since we close it immediately
    try {
        const tempAudioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create a temporary audio element to load and analyze the audio
        const tempAudio = new Audio(audio.src);
        tempAudio.crossOrigin = "anonymous"; // Try to enable CORS

        // Wait for it to load
        await new Promise((resolve, reject) => {
            tempAudio.addEventListener('canplay', resolve, { once: true });
            tempAudio.addEventListener('error', reject, { once: true });
        });

        // Create source and analyser
        const source = tempAudioContext.createMediaElementSource(tempAudio);
        const analyser = tempAudioContext.createAnalyser();
        analyser.fftSize = 4096;

        source.connect(analyser);
        analyser.connect(tempAudioContext.destination);

        // Sample the audio
        const samplePoints = Math.min(width, 300);
        const duration = tempAudio.duration;
        const waveformData = [];

        for (let i = 0; i < samplePoints; i++) {
            const time = (i / samplePoints) * duration;
            tempAudio.currentTime = time;

            await new Promise(resolve => setTimeout(resolve, 20));

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let j = 0; j < dataArray.length; j++) {
                sum += dataArray[j];
            }
            waveformData.push(sum / dataArray.length);
        }

        // Clean up
        tempAudio.pause();
        source.disconnect();
        tempAudioContext.close();

        // Draw the waveform
        drawWaveformFromData(ctx, waveformData, width, height);

    } catch (error) {
        console.log('Could not create real waveform, using placeholder:', error.message);
        // Fallback to placeholder
        drawPlaceholderWaveform(ctx, width, height, stemName);
    }
}

function drawWaveformFromData(ctx, data, width, height) {
    const centerY = height / 2;
    ctx.fillStyle = '#4080ff';

    const barWidth = width / data.length;

    for (let i = 0; i < data.length; i++) {
        // Normalize to 0-1 range
        const normalized = data[i] / 255;

        // Calculate bar height
        const barHeight = normalized * centerY * 1.5;
        const x = i * barWidth;
        const y = centerY - barHeight / 2;

        ctx.fillRect(x, y, Math.max(1, barWidth), Math.max(2, barHeight));
    }
}

function drawPlaceholderWaveform(ctx, width, height, stemName) {
    // Create a realistic audio waveform pattern using random variations
    // Different seed for each stem name
    const seed = stemName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = seededRandom(seed);

    const centerY = height / 2;
    ctx.fillStyle = '#3070d0';

    // Simulate realistic audio with varying amplitudes
    for (let i = 0; i < width; i++) {
        // Create envelope with varying intensity
        const envelope = Math.sin(i / width * Math.PI * 3) * 0.5 + 0.5;

        // Add multiple frequency components for realistic look
        const lowFreq = Math.sin(i / 10) * 0.3;
        const midFreq = Math.sin(i / 3) * 0.2;
        const highFreq = (random() - 0.5) * 0.5;

        // Combine frequencies with envelope
        const amplitude = (lowFreq + midFreq + highFreq) * envelope;

        // Draw vertical bar
        const barHeight = Math.abs(amplitude) * centerY * 1.5;
        const y = centerY - barHeight / 2;

        ctx.fillRect(i, y, 1, barHeight);
    }
}

// Simple seeded random number generator
function seededRandom(seed) {
    let s = seed;
    return function () {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}