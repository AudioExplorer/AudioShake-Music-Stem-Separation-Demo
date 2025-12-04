// V17
// Application State


const state = {
    assets: [],
    selectedAsset: null,
    alignments: [],
    taskPayload: null,
    selectedAlignment: null,
    currentMedia: null,
    theme: localStorage.getItem('theme') || 'light',
    displaySidebar: true,
    selectedAlignmentJSON: null,
    editingSelectedAlignment: false,
    isDemo: false,
    completedTask: {}
};

// DOM Elements
const elements = {
    // Navigation
    authBtn: document.getElementById('authBtn'),
    themeToggle: document.getElementById('themeToggle'),
    consoleToggle: document.getElementById('consoleToggle'),
    caseStudyBtn: document.getElementById('caseStudyBtn'),
    faqBtn: document.getElementById('faqBtn'),
    faqContent: document.getElementById('faqContent'),

    // Sidebar
    sidebar: document.getElementById('sidebar'),
    // sidebarToggle: document.getElementById('sidebarToggle'),
    // sidebarOpenBtn: document.getElementById('sidebarOpenBtn'),
    debugOutput: document.getElementById('debugOutput'),
    clearDebug: document.getElementById('clearDebug'),

    // Asset Loader
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    urlInput: document.getElementById('urlInput'),
    loadUrlBtn: document.getElementById('loadUrlBtn'),
    loadDemoBtn: document.getElementById('loadDemoBtn'),

    assetSourceURLInput: document.getElementById('assetSourceURLInput'),
    addAssetBtn: document.getElementById('addAssetBtn'),


    // Assets
    assetsSection: document.getElementById('assetsSection'),
    assetsGrid: document.getElementById('assetsGrid'),
    assetCount: document.getElementById('assetCount'),

    // Player
    playerSection: document.getElementById('playerSection'),
    mediaPlayer: document.getElementById('mediaPlayer'),
    audioPlayer: document.getElementById('audioPlayer'),
    lyricsContainer: document.getElementById('lyricsContainer'),
    createAlignmentBtn: document.getElementById('createAlignmentBtn'),
    // tasks
    createSeparationTaskBtn: document.getElementById('createSeparationTaskBtn'),

    // Alignments
    alignmentsSection: document.getElementById('alignmentsSection'),
    alignmentsHeader: document.getElementById('alignmentsHeader'),
    alignmentsBody: document.getElementById('alignmentsBody'),
    alignmentsList: document.getElementById('alignmentsList'),
    refreshAlignments: document.getElementById('refreshAlignments'),
    filterSource: document.getElementById('filterSource'),
    skipInput: document.getElementById('skipInput'),
    takeInput: document.getElementById('takeInput'),

    // alignment tools
    alignmentTools: document.getElementById('alignmentTools'),
    downloadAlignmentButton: document.getElementById('downloadAlignmentButton'),

    // Modals
    authModal: document.getElementById('authModal'),
    faqModal: document.getElementById('faqModal'),
    caseStudyModal: document.getElementById('caseStudyModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveApiKey: document.getElementById('saveApiKey'),
    apiStatus: document.getElementById('apiStatus'),
    codeModal: document.getElementById('codeModal'),
    codeBtn: document.getElementById('codeBtn'),
    codeContent: document.getElementById('codeContent'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),

    // Toast
    toast: document.getElementById('taskToast')
};

async function loadIntro() {
    const response = await fetch('./intro.md');   // load file
    const markdown = await response.text();       // read raw MD

    // custom ext for target = _blank
    showdown.extension('targetBlank', function () {
        return [{
            type: 'output',
            regex: /<a\s+href="([^"]*)"/g,
            replace: '<a href="$1" target="_blank" rel="noopener noreferrer"'
        }];
    });


    const converter = new showdown.Converter({
        extensions: ['targetBlank'],
        rawHeaderId: true,
        simpleLineBreaks: true,
        parseInlineHTML: true,
        literalMidWordUnderscores: true,
        backslashEscapesHTMLTags: true,

        // THIS IS THE IMPORTANT ONE:
        noForcedInnerParagraph: true,

    });
    converter.setFlavor('github');
    const html = converter.makeHtml(markdown);    // MD → HTML

    document.getElementById('intro').innerHTML = html;
}


// Initialize App
async function init() {
    loadIntro();
    toggleSidebar(false);
    setupTheme();
    setupEventListeners();
    setupAPIListeners();
    await api.dbReady;
    checkAuth();
    toggleAlignmentTools(false)
}

// Theme
function setupTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    elements.themeToggle.querySelector('.icon').textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    setupTheme();
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    elements.authBtn.addEventListener('click', async () => await openModal('auth'));
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.consoleToggle.addEventListener('click', () => toggleSidebar(!state.displaySidebar));

    elements.clearDebug.addEventListener('click', clearDebugOutput);
    elements.addAssetBtn.addEventListener('click', loadNewAssetFromSource);

    // API Methods
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const method = e.target.dataset.method;
            executeAPIMethod(method);
        });
    });



    // case study
    elements.caseStudyBtn.addEventListener('click', () => {
        window.open("https://www.audioshake.ai/use-cases/lyric-transcription", "_blank");
    });


    // Asset Loader
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileUpload);
    elements.loadUrlBtn.addEventListener('click', handleURLLoad);
    elements.loadDemoBtn.addEventListener('click', loadDemoAssets);

    // Drag and Drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('drag-over');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('drag-over');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) loadAssetsFromFile(file);
    });

    // Player
    elements.createAlignmentBtn.addEventListener('click', createAlignment);
    elements.refreshAlignments.addEventListener('click', loadAlignments);

    // Run Task
    elements.createSeparationTaskBtn.addEventListener('click', createSeparationTask);

    //debug
    // elements.createSeparationTaskBtn.addEventListener('click', renderTest); // testing players


    // Alignments accordion
    elements.alignmentsHeader.addEventListener('click', toggleAlignmentsAccordion);

    // Alignments filtering
    elements.filterSource.addEventListener('input', filterAlignments);
    elements.skipInput.addEventListener('change', loadAlignments);
    elements.takeInput.addEventListener('change', loadAlignments);

    // alignment tools
    elements.downloadAlignmentButton.addEventListener('click', downloadJSON);



    // Media Player Events
    elements.mediaPlayer.addEventListener('timeupdate', updateLyricHighlight);
    elements.audioPlayer.addEventListener('timeupdate', updateLyricHighlight);

    // Modals
    elements.saveApiKey.addEventListener('click', saveAPIKey);
    elements.codeBtn.addEventListener('click', async () => await openModal('code'));
    elements.copyCodeBtn.addEventListener('click', copyCode);
    //faqBtn
    elements.faqBtn.addEventListener('click', async () => await openModal('faq'));

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // Code Tabs
    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            console.log("Selected Lang: ", e.target.dataset.lang)
            updateCodeExample(e.target.dataset.lang);
        });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
}

// API Listeners
function setupAPIListeners() {
    api.on('keyLoaded', (key) => {
        if (key) updateAuthButton(true);
    });

    api.on('keyUpdated', (key) => {
        updateAuthButton(true);
    });
}

// Auth
function checkAuth() {
    if (api.hasAPIKey()) {
        document.getElementById('apiKeyInput').value = api.getAPIKey()
        updateAuthButton(true);
    }
}

function updateAuthButton(authorized) {
    if (authorized) {
        elements.authBtn.innerHTML = '<span class="icon">✓</span> Authorized';
        elements.authBtn.classList.add('authorized');
    } else {
        elements.authBtn.innerHTML = '<span class="icon">🔑</span> Authorize';
        elements.authBtn.classList.remove('authorized');
    }
}

async function saveAPIKey() {
    const key = elements.apiKeyInput.value.trim();
    if (!key) {
        showAPIStatus('Please enter an API key', 'error');
        return;
    }

    try {
        await api.setAPIKey(key);
        showAPIStatus('API key saved successfully!', 'success');
        updateAuthButton(true);
        setTimeout(() => closeModal('auth'), 1500);
    } catch (err) {
        showAPIStatus(`Error: ${err.message}`, 'error');
    }
}

function showAPIStatus(message, type) {
    elements.apiStatus.textContent = message;
    elements.apiStatus.className = `api-status ${type}`;
}

// Sidebar
function toggleSidebar(open) {
    if (open) {
        elements.sidebar.classList.remove('hidden');
        elements.consoleToggle.textContent = 'Close API Console';
    } else {
        elements.sidebar.classList.add('hidden');
        elements.consoleToggle.innerHTML = 'API Console';
    }
    state.displaySidebar = !state.displaySidebar
}

// Alignments Accordion
function toggleAlignmentsAccordion(e) {
    if (e.target.closest('.alignments-controls')) return;
    elements.alignmentsHeader.classList.toggle('collapsed');
    elements.alignmentsBody.classList.toggle('collapsed');
}

// Filter Alignments
function filterAlignments() {
    const filterText = elements.filterSource.value.toLowerCase();
    const items = elements.alignmentsList.querySelectorAll('.alignment-item');

    items.forEach(item => {
        const sourceText = item.querySelector('.alignment-info')?.textContent.toLowerCase() || '';
        if (sourceText.includes(filterText)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Debug Output
function addDebugEntry(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `debug-entry ${type}`;

    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `
        <div class="debug-timestamp">${timestamp}</div>
        <div>${JSON.stringify(message, null, 2)}</div>
    `;

    elements.debugOutput.appendChild(entry);
    elements.debugOutput.scrollTop = elements.debugOutput.scrollHeight;
}

function clearDebugOutput() {
    elements.debugOutput.innerHTML = '';
}


// API Methods
async function executeAPIMethod(method) {
    if (!api.hasAPIKey()) {
        showToast('Please authorize first');
        await openModal('auth');
        return;
    }

    try {
        let result;
        switch (method) {
            case 'createTask':
                if (!state.selectedAsset) {
                    showToast('Please select an asset first');
                    return;
                }
                // result = await api.createAlignmentTask(state.selectedAsset.src);
                result = await api.createTask(state.selectedAsset.src, [
                    // {
                    //     model: 'alignment',
                    //     formats,
                    //     language: "us"
                    // }
                ]);

                addDebugEntry(result, 'success');
                showToast('Task created successfully');
                break;

            case 'getTask':
                const taskId = prompt('Enter Task ID:');
                if (taskId) {
                    result = await api.getTask(taskId);
                    addDebugEntry(result, 'success');
                }
                break;

            case 'listTasks':
                result = await api.listTasks({ take: 10 });
                addDebugEntry(result, 'success');
                break;
        }
    } catch (err) {
        addDebugEntry({ error: err.message }, 'error');
        showToast(`Error: ${err.message}`);
    }
}

// Asset Loading
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) await loadAssetsFromFile(file);
}

async function loadAssetsFromFile(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        loadAssets(data.assets || data);
    } catch (err) {
        showToast(`Error loading file: ${err.message}`);
    }
}

async function handleURLLoad() {
    const url = elements.urlInput.value.trim();
    if (!url) return;

    try {
        const response = await fetch(url);
        const data = await response.json();
        loadAssets(data.assets || data);
    } catch (err) {
        showToast(`Error loading URL: ${err.message}`);
    }
}



// URL helper function
function getFilenameFromUrlRegex(url) {
    // Match everything after the last '/' and before any '?'
    const match = url.match(/\/([^/?]+)(?:\?|$)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function loadNewAssetFromSource() {
    const sourceURL = elements.assetSourceURLInput.value.trim();
    // todo get the filename from the url 
    const title = getFilenameFromUrlRegex(sourceURL) || "Untitled";
    const allowedExtensions = ['mp3', 'mp4', 'wav', 'flac', 'mov', 'aac'];
    const format = (() => {
        // Clean URL by removing query parameters and fragments
        const cleanedURL = sourceURL.split('?')[0].split('#')[0];
        const fileName = cleanedURL.split('/').pop(); // Get the last part of the URL (file name)
        const extension = fileName.split('.').pop().toLowerCase(); // Extract the extension

        // Check if the extension is allowed
        if (!allowedExtensions.includes(extension)) {
            console.warn(`Unsupported file type: ${extension}. Defaulting to 'audio/mpeg'.`);
            return 'audio/mpeg'; // Default MIME type for unsupported files
        }

        // Map the extension to its correct MIME type
        const mimeByExtension = {
            mp3: 'audio/mpeg',
            mp4: 'video/mp4',
            wav: 'audio/wav',
            flac: 'audio/flac',
            mov: 'video/quicktime',
            aac: 'audio/aac',
            mp4a: 'audio/mp4',
            aiff: 'audio/aiff',
            pcm: 'audio/pcm'
        };

        return mimeByExtension[extension];
    })();

    const newAsset = {
        assets: [
            {
                src: `${sourceURL}`,
                title: `${title}`,
                format: `${format}`
            }
        ]
    };

    loadAssets(newAsset.assets);
    // Proceed with asset creation or processing using `sourceURL`, `title`, and `format`
    console.log(`Asset created with URL: ${sourceURL}, Title: ${title}, MIME Type: ${format}`);
}


async function loadDemoAssets() {
    state.isDemo = true

    const demoData = {
        "assets": [
            {
                "src": "https://demos.spatial-explorer.com/demo-assets/Wordless.wav",
                "title": "Wordless.wav",
                "format": "audio/wav",
                "expiry": null
            },
        ]
    };
    loadAssets(demoData.assets);
}

async function loadAssets(assets) {
    state.assets = assets;
    renderAssets();
    elements.assetsSection.style.display = 'block';
    showToast(`Loaded ${assets.length} assets`);
    loadAlignments()
}

function renderAssets() {
    elements.assetCount.textContent = `${state.assets.length} assets`;
    elements.assetsGrid.innerHTML = '';

    state.assets.forEach((asset, index) => {
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <div class="asset-format">${getFormatLabel(asset.format)}</div>
            <div class="asset-title" title="${asset.title}">${asset.title}</div>
        `;

        card.addEventListener('click', () => selectAsset(index));
        elements.assetsGrid.appendChild(card);
    });
}

function getFormatLabel(format) {
    if (format.includes('video')) return '🎬 Video';
    if (format.includes('audio')) return '🎵 Audio';
    if (format.includes('json')) return '📄 JSON';
    return '📎 File';
}

function createWave(elementID = 'audioPlayer') {
    const wave = WaveSurfer.create({
        container: '#wave',
        backend: 'MediaElement',   // <-- critical
        mediaControls: false,
        media: document.getElementById(elementID),
        waveColor: '#999',
        progressColor: '#f00',
    });
}
function selectAsset(index) {


    clearAlignments()
    state.selectedAsset = state.assets[index];
    createWave('audioPlayer')
    // todo update the alignment filter to be fuzzy 
    elements.filterSource.value = state.selectedAsset.title.split(".")[0]

    document.querySelectorAll('.asset-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });

    loadMedia(state.selectedAsset);
    elements.playerSection.style.display = 'block';
    if (!state.isDemo) {
        loadAlignments();
    }

}

async function loadMedia(asset) {

    const isVideo = asset.format.includes('video');

    if (isVideo) {
        elements.mediaPlayer.src = asset.src;
        elements.mediaPlayer.style.display = 'block';
        elements.audioPlayer.style.display = 'none';
        state.currentMedia = elements.mediaPlayer;
    } else {
        elements.audioPlayer.src = asset.src;
        elements.audioPlayer.style.display = 'block';
        elements.mediaPlayer.style.display = 'none';
        state.currentMedia = elements.audioPlayer;
    }

    if (state.isDemo) {
        // toggleAlignmentTools(show)
        const res = await fetch("./alignment-wordless.json");
        const data = await res.json();
        // console.log(data.lines)
        state.selectedAlignmentJSON = data
        renderLyrics(data);
    }
}

// tasks

function renderTest() {
    console.log("render test")
    // note this is a demo task and is not a real task and must be updated before running in debug mode. 
    completedTask = {
        "id": "cmip9mj55000v10zgtvsbr48a",
        "createdAt": "2025-12-03T00:25:14.345Z",
        "updatedAt": "2025-12-03T00:25:14.345Z",
        "clientId": "cmfwwqtsu0mbs3u96rqylxjj5",
        "targets": [
            {
                "id": "cmip9mj55000x10zg2fxma8eo",
                "createdAt": "2025-12-03T00:25:14.345Z",
                "updatedAt": "2025-12-03T00:25:34.376Z",
                "url": "https://demos.spatial-explorer.com/demo-assets/Audiio_Drakeford_The_Venture_Stronger_Than_One.wav",
                "model": "bass",
                "taskId": "cmip9mj55000v10zgtvsbr48a",
                "status": "completed",
                "formats": [
                    "mp3"
                ],
                "output": [
                    {
                        "name": "bass",
                        "format": "mp3",
                        "type": "audio/mpeg",
                        "link": "https://d1fr0j5lr1ap87.cloudfront.net/prod/regular/output/cmfwwqtsu0mbs3u96rqylxjj5/cmip9mj55000v10zgtvsbr48a/targets/cmip9mj55000x10zg2fxma8eo/output/bass.mp3?Expires=1764725288&Key-Pair-Id=K32ZZ0L6PLWPIJ&Signature=R5g2WS7VxyZSDEqxlOvt2VY46pJl0St2IDUsK9hJTy6~l0nv-ymWEhkLLwvZX8LtxTAeY9hL1yMc5WUmi5kwHoTTGNLgoxT6q6BfsyLb3wkh5RyLrcM9KOdFwqXLm-EtItmSQdVA~5ZG~Sxg1mk01PlEerl21oiiowYuSyPUutVaa-SPQTUmCZwmMqOpiNbx7Fdodx0kp6599SoZHxJWI4pk5-n2dmHQ9Qwm-3XeStLhaf8~ZYx2U1TJLjXk7F5mzpXeAzwcqE6aYRNhAYIBGve-M9q8ECkA4ek~eKsL7bzq0dBZyE~5tJlheR3vlwPfkCIFeu2V7ywvOeQQOc6cHg__"
                    },
                    {
                        "name": "bass_residual",
                        "format": "mp3",
                        "type": "audio/mpeg",
                        "link": "https://d1fr0j5lr1ap87.cloudfront.net/prod/regular/output/cmfwwqtsu0mbs3u96rqylxjj5/cmip9mj55000v10zgtvsbr48a/targets/cmip9mj55000x10zg2fxma8eo/output/bass_residual.mp3?Expires=1764725288&Key-Pair-Id=K32ZZ0L6PLWPIJ&Signature=ITD1H2kZ4wGZqjd6LxxQd4NfJTEGTzXLTalxmhM8XxwnOnGv5p-XcsltzX1dcNxkOod1kp-3uRiBTXgywTxD5HLC2GhLDeBEfoePaowv1MB1SWWBVAcpwMihLP4-14ZRFHyxX~M9nlYqcrk9ZnsB~XNKqxtn72w5bGkC7HGdBEhN2u8xaDk34fvFxCI7VEpvCK~mAebbtXq4D-EWzY-vzyxx40KgKE1p28CIJWXas6wM0YCfAeCjTtIVFNvtHXfhRZu83o7unAAOnXlcYYoS1SU---LN2XNBhdVSQkDNQMX52jPmbPWXKwCzlmc8Q9AUDnhDydsbgh6bh9PZD5VmUA__"
                    }
                ],
                "cost": 3,
                "error": null,
                "duration": 172.78915405273438,
                "variant": null,
                "residual": true,
                "language": "en"
            },
            {
                "id": "cmip9mj55000w10zg9dm0919u",
                "createdAt": "2025-12-03T00:25:14.345Z",
                "updatedAt": "2025-12-03T00:25:34.376Z",
                "url": "https://demos.spatial-explorer.com/demo-assets/Audiio_Drakeford_The_Venture_Stronger_Than_One.wav",
                "model": "vocals",
                "taskId": "cmip9mj55000v10zgtvsbr48a",
                "status": "completed",
                "formats": [
                    "mp3"
                ],
                "output": [
                    {
                        "name": "vocals_residual_high_quality",
                        "format": "mp3",
                        "type": "audio/mpeg",
                        "link": "https://d1fr0j5lr1ap87.cloudfront.net/prod/regular/output/cmfwwqtsu0mbs3u96rqylxjj5/cmip9mj55000v10zgtvsbr48a/targets/cmip9mj55000w10zg9dm0919u/output/vocals_residual_high_quality.mp3?Expires=1764725288&Key-Pair-Id=K32ZZ0L6PLWPIJ&Signature=RqF~gDKB4AIt-Yt5~lCMtQegT0ja53qdFx5Vbuz7UL4YpP8oYD0GNla44djSKRgsaCo06SnVUCT9fgGl~cts9y43kseHwvfjHaF0rI7yabjGRzXxMDnpW5xev~tEn0Dek-dIUZQ7dFuhUpUL-UlLi8v0~piheYt4fEfVUG2w1SeqKWMX5Sx2FkmVSxLCVimG2mmNMocEx9HJ92WTEvJew9ckwROnrDwSzQKIAzzT9lDzD3Oy1h1y6VPgiCUypgq6eluJqUobX2rBMRreWngYDBjKYUrDmuYc6JDN0eeO-cGqll43TVqA6V94x3wwLBsJKZfjtloKf8H0I37sepVHYQ__"
                    },
                    {
                        "name": "vocals_high_quality",
                        "format": "mp3",
                        "type": "audio/mpeg",
                        "link": "https://d1fr0j5lr1ap87.cloudfront.net/prod/regular/output/cmfwwqtsu0mbs3u96rqylxjj5/cmip9mj55000v10zgtvsbr48a/targets/cmip9mj55000w10zg9dm0919u/output/vocals_high_quality.mp3?Expires=1764725288&Key-Pair-Id=K32ZZ0L6PLWPIJ&Signature=C3OQqP-jrjndxBtajVJMe1XoUrXkxrRQEf0~jvE0S3MHcGbsEGTeYF3ftaSvIEZt2EpCh-4EeQsj1rwJ4AQKNnObvr~Wjx-o2JO8WrMhQGJ80Ws7iczwfDWn3gAgwV7KJcnSQ6qeeKhUIArHjtkkM1s0G4rQwUhp7sA~945A0lCvJGBTjPGNabooxfmdQrop8rEnbQB0txCcbecfYzJrm9K-RAooPJksQh2MFES6cFxkNgziIgpao1RlOb-gONiSLIst4po1l7JNk7wd6JLC~Ndqk0-zvWNcDF0SQSph2PN7nm7Ur37Txccf577yKVI1a3PxeUKUOej412HjEMGoyg__"
                    }
                ],
                "cost": 4.5,
                "error": null,
                "duration": 172.78915405273438,
                "variant": "high_quality",
                "residual": true,
                "language": "en"
            },
            {
                "id": "cmip9mj55000y10zgygt786vp",
                "createdAt": "2025-12-03T00:25:14.345Z",
                "updatedAt": "2025-12-03T00:25:52.517Z",
                "url": "https://demos.spatial-explorer.com/demo-assets/Audiio_Drakeford_The_Venture_Stronger_Than_One.wav",
                "model": "guitar",
                "taskId": "cmip9mj55000v10zgtvsbr48a",
                "status": "completed",
                "formats": [
                    "mp3"
                ],
                "output": [
                    {
                        "name": "guitar",
                        "format": "mp3",
                        "type": "audio/mpeg",
                        "link": "https://d1fr0j5lr1ap87.cloudfront.net/prod/regular/output/cmfwwqtsu0mbs3u96rqylxjj5/cmip9mj55000v10zgtvsbr48a/targets/cmip9mj55000y10zgygt786vp/output/guitar.mp3?Expires=1764725288&Key-Pair-Id=K32ZZ0L6PLWPIJ&Signature=M4eqbAtkGH664VBlKozk4OwzL9FUlrCEnZQZ4dlaWty1xd7vKpeXXzOXFnzQsHK3sVPN~exDI783wT9JM1AhXhGe6ZCAskY5YCEEODTgUtoeuG9WYUlDhD19dZjr1~c3kPzPhKrFYstagasUtXTqf5OzjR9xmUaV1pMU4YUlXrNk4RGS83DN7kJXwYAx8BkucwpyYvM5d5tNOByCaYfedAmJ0TMuX0~HrogHPVKCnz7d3Dv3LGc6MZSHLKr--Ef~~VBbCL2k3n-9xjAhqyO~9tdej-u2DGgWNtg9ppoaOrP6RHbGz5SjPdbb0je~CHXPbcPTjgd71LjiLOLj12LDNw__"
                    },
                    {
                        "name": "guitar_residual",
                        "format": "mp3",
                        "type": "audio/mpeg",
                        "link": "https://d1fr0j5lr1ap87.cloudfront.net/prod/regular/output/cmfwwqtsu0mbs3u96rqylxjj5/cmip9mj55000v10zgtvsbr48a/targets/cmip9mj55000y10zgygt786vp/output/guitar_residual.mp3?Expires=1764725288&Key-Pair-Id=K32ZZ0L6PLWPIJ&Signature=NWXtsMEccczOicjmJxY1ZW50jpTWY9qD1aH4Wz7YMArM-7xvhZi9RzqKWBRPYH3n3ZWGz9DxUIyXvElP5QgaVgDMkC08IfEXW4cADPW0J1w-O4dQYCSsRQg2~U0T~lU1dl3bx9hCaUVV7dGlrD6Nj561LTegeJ0UzKVGj8U8rH51mrZtjnWopdK7VVJUs8CHgIJYPT5i~D0Ze0nXArvYt~0TWHgLY~w-vOg~~4b~lh8YnU9-W0x-414w5Ps1v-AMQoOhgIwDfyxPKxGlhAIHota~HnpX~TpggDLysxUP9dhuLYI2wAcoc64aHNf6r4UU0~zW0C0uvaEBHUPCoaeP7g__"
                    }
                ],
                "cost": 3,
                "error": null,
                "duration": 172.78915405273438,
                "variant": null,
                "residual": true,
                "language": "en"
            },
            {
                "id": "cmip9mj55000z10zgxyl93640",
                "createdAt": "2025-12-03T00:25:14.345Z",
                "updatedAt": "2025-12-03T00:25:31.677Z",
                "url": "https://demos.spatial-explorer.com/demo-assets/Audiio_Drakeford_The_Venture_Stronger_Than_One.wav",
                "model": "drums",
                "taskId": "cmip9mj55000v10zgtvsbr48a",
                "status": "completed",
                "formats": [
                    "mp3"
                ],
                "output": [
                    {
                        "name": "drums",
                        "format": "mp3",
                        "type": "audio/mpeg",
                        "link": "https://d1fr0j5lr1ap87.cloudfront.net/prod/regular/output/cmfwwqtsu0mbs3u96rqylxjj5/cmip9mj55000v10zgtvsbr48a/targets/cmip9mj55000z10zgxyl93640/output/drums.mp3?Expires=1764725288&Key-Pair-Id=K32ZZ0L6PLWPIJ&Signature=JiwC1HXB1s0n30iKTl7u~OagXuP2RO16WdXKIOm~a3QVh0h2nYplVEjDcLYq9M9fgA0UnUJ17q4zqKomfD8XIxIsAff4AZWSL31SsmQFltfjiv1~w8pTP4Xmo2iv6gvgxTd0HrVEspp3aCA7LxEHs9vOxu8KhjbOwZ5TdRXG0J0TURQhBl2ZLmeiENCQlVRgUPttZ9uP7OCVugEen2XfPBAY0feI8ZXJpUVzeqgvhXRitLocTIxhgps~58Xz4AC--R0Ugr5vZrzumt~a7U1ug5fcys99e9xWVsffpcXqv39PE5cfvfp8dUY3Ds~U9B-t6vMWl8YeDA1I5oaExiTZMg__"
                    },
                    {
                        "name": "drums_residual",
                        "format": "mp3",
                        "type": "audio/mpeg",
                        "link": "https://d1fr0j5lr1ap87.cloudfront.net/prod/regular/output/cmfwwqtsu0mbs3u96rqylxjj5/cmip9mj55000v10zgtvsbr48a/targets/cmip9mj55000z10zgxyl93640/output/drums_residual.mp3?Expires=1764725288&Key-Pair-Id=K32ZZ0L6PLWPIJ&Signature=caDK~q-RlI3rzKuq9cK0YQRnU13~pQSVx2CZwDkRnFRgIjBxCnaV97Vo531XWtyTg00m9L1UpG507nwyMdd3N7bWbBsfwGiv9w0Eocyk7tZV09fQX1DaDQ2Qz0fHuTpW~fMUXcaSREoDq43CND~qLHfojsZswlwSZ2C803Shq7a7PDNH6VcP2jqHSRVjPE0zA~Yg2lIHEE4ZlN2tab8stMMIky~2P67lF5tpnjI5xyAx2zM5nIwXFLFB6ytAaeC5523RUJgEMUOeCF2Joj~QoKhqX-djQtl2zvo~dQK4U3Wo2~a-sXhmTwAhRV~fKugn-1c42eDLIiQePlz4jd8RUg__"
                    }
                ],
                "cost": 3,
                "error": null,
                "duration": 172.78915405273438,
                "variant": null,
                "residual": true,
                "language": "en"
            }
        ]
    };

    console.log(completedTask.targets.length)
    state.completedTask = completedTask;
    loadStems(completedTask)
}


async function createSeparationTask() {
    if (!api.hasAPIKey()) {
        await openModal('auth');
        return;
    }
    console.log(state.taskPayload)

    if (!state.taskPayload) {
        showToast('Please build a task payload first');
        return;
    }

    try {
        showToast('Creating Separation task...');
        const task = await api.createSepTask(state.taskPayload);
        addDebugEntry(task, 'success');

        showToast('Processing... This may take a few minutes');
        const completedTask = await api.pollTask(task.id, (update) => {
            addDebugEntry(update, 'info');
        });

        showToast('Separation completed!');

        loadStems(completedTask);

    } catch (err) {
        showToast(`Error: ${err.message}`);  // ✅ Correct
        addDebugEntry({ error: err.message }, 'error');
    }
}


// Alignments
async function createAlignment() {
    if (!api.hasAPIKey()) {
        await openModal('auth');
        return;
    }

    if (!state.selectedAsset) {
        showToast('Please select an asset first');
        return;
    }

    try {
        showToast('Creating alignment task...');
        const task = await api.createAlignmentTask(state.selectedAsset.src);
        addDebugEntry(task, 'success');

        showToast('Processing... This may take a few minutes');
        const completedTask = await api.pollTask(task.id, (update) => {
            addDebugEntry(update, 'info');
        });

        showToast('Alignment completed!');
        loadAlignments();

        const alignmentTarget = completedTask.targets?.find(t => t.model === 'alignment');
        if (alignmentTarget?.output?.length > 0) {
            const alignmentOutput = alignmentTarget.output.find(o => o.format === 'json');
            if (alignmentOutput?.link) {
                loadAlignmentData(alignmentOutput.link);
            }
        }
    } catch (err) {
        showToast(`Error: ${err.message}`);  // ✅ Correct
        addDebugEntry({ error: err.message }, 'error');
    }
}

async function loadAlignments() {

    if (!api.hasAPIKey()) return;

    const skip = parseInt(elements.skipInput.value) || 0;
    const take = parseInt(elements.takeInput.value) || 100;

    try {
        const tasks = await api.listTasks({ skip, take });
        state.alignments = Array.isArray(tasks) ? tasks.filter(task =>
            task.targets?.some(t => t.model === 'alignment')
        ) : [];
        renderAlignments();
        elements.alignmentsSection.style.display = 'block';

        if (elements.filterSource.value) {
            filterAlignments();
        }
    } catch (err) {
        if (String(err.message).includes('403')) {
            showToast(
                'Alignment data is no longer available. Results are only stored for 72 hours — please re-run the alignment.',
                'error'
            );
        } else {
            showToast(`Error loading alignment: ${err.message}`, 'error');
        }

        console.error(err);
    }
}

// helper for copy task ID
// Add this as an onclick handler directly
function copyTaskId(element) {
    const taskId = element.textContent;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(taskId).then(() => {
            showCopyFeedback(element);
        }).catch(() => copyFallback(taskId, element));
    } else {
        copyFallback(taskId, element);
    }
}

function copyFallback(text, element) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showCopyFeedback(element);
}

function showCopyFeedback(element) {
    const original = element.textContent;
    element.textContent = '✓ Copied!';
    setTimeout(() => element.textContent = original, 2000);
}

function renderAlignments() {
    elements.alignmentsList.innerHTML = '';

    if (state.alignments.length === 0) {
        elements.alignmentsList.innerHTML = '<div style="color: var(--text-secondary); padding: 16px; text-align: center;">No alignments found</div>';
        return;
    }

    state.alignments.forEach((task, index) => {
        const alignmentTarget = task.targets?.find(t => t.model === 'alignment');
        if (!alignmentTarget) return;

        const item = document.createElement('div');
        item.className = 'alignment-item';

        const urlParts = (alignmentTarget.url || '').split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];

        item.innerHTML = `
            <div class="alignment-header">
            <!--   <span class="alignment-id">${task.id}</span>  -->
                <span class="alignment-id" onclick="copyTaskId(this)" style="cursor: pointer;">${task.id}</span>
                <span class="status-badge ${alignmentTarget.status}">${alignmentTarget.status}</span>
            </div>
            <div class="alignment-info">
                Source: ${filename || 'Unknown'}
            </div>
            <div class="alignment-info">
                Created: ${new Date(task.createdAt).toLocaleString()}
            </div>
        `;

        if (alignmentTarget.status === 'completed' && alignmentTarget.output?.length > 0) {
            item.addEventListener('click', () => selectAlignment(index));
            item.style.cursor = 'pointer';
        } else if (alignmentTarget.status === 'processing') {
            item.style.opacity = '0.6';
        } else if (alignmentTarget.status === 'failed') {
            item.style.cursor = 'not-allowed';
            if (alignmentTarget.error) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alignment-info';
                errorDiv.style.color = 'var(--error)';
                errorDiv.textContent = `Error: ${alignmentTarget.error}`;
                item.appendChild(errorDiv);
            }
        }

        elements.alignmentsList.appendChild(item);
    });
}

function selectAlignment(index) {
    state.selectedAlignment = state.alignments[index];

    document.querySelectorAll('.alignment-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });

    const alignmentTarget = state.selectedAlignment.targets?.find(t => t.model === 'alignment');
    if (!alignmentTarget) {
        showToast('No alignment target found');
        addDebugEntry({ error: 'No alignment target in task', task: state.selectedAlignment }, 'error');
        return;
    }

    if (alignmentTarget.status !== 'completed') {
        showToast(`Alignment status: ${alignmentTarget.status}`);
        return;
    }

    if (!alignmentTarget.output || alignmentTarget.output.length === 0) {
        showToast('No output available for this alignment');
        addDebugEntry({ error: 'No output in completed alignment', target: alignmentTarget }, 'error');
        return;
    }

    const alignmentOutput = alignmentTarget.output.find(o =>
        o.format === 'json' || o.type?.includes('json')
    );

    if (!alignmentOutput?.link) {
        showToast('No JSON output found');
        addDebugEntry({ error: 'No JSON output', outputs: alignmentTarget.output }, 'error');
        return;
    }

    const taskUrl = alignmentTarget.url;
    if (taskUrl && state.assets.length === 0) {
        loadMedia({ src: taskUrl, title: 'Task Media', format: 'audio/mpeg' });
        elements.playerSection.style.display = 'block';
    }

    loadAlignmentData(alignmentOutput.link);
}

function toggleAlignmentTools(show) {

    if (show) {
        elements.alignmentTools.classList.remove('hidden');

    } else {
        elements.alignmentTools.classList.add('hidden');
    }



    // downloadAlignmentButton
    // editAlignmenButton

}

function downloadJSON() {
    let json = state.selectedAlignmentJSON
    const data = JSON.stringify(json, null, 2); // pretty-print
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "alignment.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}



async function loadAlignmentData(alignmentUrl) {
    try {
        toggleAlignmentTools(true)
        addDebugEntry({ info: `Fetching alignment from: ${alignmentUrl}` }, 'info');

        // normal fetch
        const data = await api.fetchAlignment(alignmentUrl);
        addDebugEntry({ success: 'Alignment data loaded', structure: Object.keys(data) }, 'success');
        renderLyrics(data);

    } catch (err) {
        if (String(err).includes('403')) {
            showToast(
                'Alignment data is no longer available. Results are only stored for 72 hours — please re-run the alignment.');
        } else {
            showToast(`Error loading alignment: ${err}`);

        }

        console.error(err);
    }
}

function clearAlignments() {
    elements.lyricsContainer.innerHTML = 'Select an alignment or create a new one to view synced lyrics';
    toggleAlignmentTools(false)
}

// Simplified renderLyrics method - always editable with playback alignment
function renderLyrics(alignmentData) {
    state.selectedAlignmentJSON = alignmentData;
    elements.lyricsContainer.innerHTML = '';

    let lines = [];
    if (alignmentData.lines) {
        lines = alignmentData.lines;
    } else if (alignmentData.words) {
        lines = [{ words: alignmentData.words }];
    } else if (alignmentData.segments) {
        lines = alignmentData.segments;
    } else if (Array.isArray(alignmentData)) {
        lines = [{ words: alignmentData }];
    }

    if (lines.length === 0) {
        elements.lyricsContainer.innerHTML = '<div class="lyrics-placeholder">No lyrics data available</div>';
        addDebugEntry({ error: 'Cannot parse alignment', structure: Object.keys(alignmentData) }, 'error');
        return;
    }

    let totalWords = 0;

    lines.forEach((lineData, lineIndex) => {
        const words = lineData.words || [];
        if (words.length === 0) return;

        const lineDiv = document.createElement('div');
        lineDiv.className = 'lyrics-line';

        words.forEach((wordData, wordIndex) => {
            const wordText = wordData.text || wordData.word || '';
            const start = wordData.start || wordData.startTime || 0;
            const end = wordData.end || wordData.endTime || 0;

            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = wordText.trim();
            span.dataset.start = start;
            span.dataset.end = end;
            span.dataset.index = totalWords;
            span.dataset.lineIndex = lineIndex;
            span.dataset.wordIndex = wordIndex;

            // Click to edit
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                convertToInput(span, lineIndex, wordIndex);
            });

            lineDiv.appendChild(span);
            totalWords++;
        });

        elements.lyricsContainer.appendChild(lineDiv);
    });

    addDebugEntry({ success: `Loaded ${totalWords} words in ${lines.length} lines` }, 'success');
}

// Convert span to input for editing
function convertToInput(span, lineIndex, wordIndex) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'word-input';
    input.value = span.textContent;
    input.dataset.start = span.dataset.start;
    input.dataset.end = span.dataset.end;
    input.dataset.index = span.dataset.index;
    input.dataset.lineIndex = lineIndex;
    input.dataset.wordIndex = wordIndex;

    // Set media player to this word's timestamp
    if (state.currentMedia) {
        state.currentMedia.currentTime = parseFloat(span.dataset.start);
    }

    // Replace span with input
    span.parentElement.replaceChild(input, span);
    input.focus();
    input.select();

    // Save on blur
    input.addEventListener('blur', () => {
        saveEdit(input);
    });

    // Save on Enter, cancel on Escape
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit(input);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit(input);
        }
    });
}

// Save edit and convert back to span
function saveEdit(input) {
    const newText = input.value.trim();
    const lineIndex = parseInt(input.dataset.lineIndex);
    const wordIndex = parseInt(input.dataset.wordIndex);
    const start = parseFloat(input.dataset.start);
    const end = parseFloat(input.dataset.end);

    // Update the JSON
    if (state.selectedAlignmentJSON.lines &&
        state.selectedAlignmentJSON.lines[lineIndex] &&
        state.selectedAlignmentJSON.lines[lineIndex].words[wordIndex]) {

        const originalText = state.selectedAlignmentJSON.lines[lineIndex].words[wordIndex].text || '';
        const trailingWhitespace = originalText.match(/\s*$/)?.[0] || '';

        // Update word text with preserved whitespace
        state.selectedAlignmentJSON.lines[lineIndex].words[wordIndex].text = newText + trailingWhitespace;

        // Update line text
        const line = state.selectedAlignmentJSON.lines[lineIndex];
        line.text = line.words.map(w => w.text || w.word || '').join('');

        // Update full text
        if (state.selectedAlignmentJSON.text !== undefined) {
            state.selectedAlignmentJSON.text = state.selectedAlignmentJSON.lines
                .map(l => l.text || l.words.map(w => w.text || w.word || '').join(''))
                .join('');
        }
    }

    // Convert back to span
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = newText;
    span.dataset.start = input.dataset.start;
    span.dataset.end = input.dataset.end;
    span.dataset.index = input.dataset.index;
    span.dataset.lineIndex = input.dataset.lineIndex;
    span.dataset.wordIndex = input.dataset.wordIndex;

    span.addEventListener('click', (e) => {
        e.stopPropagation();
        convertToInput(span, parseInt(span.dataset.lineIndex), parseInt(span.dataset.wordIndex));
    });

    input.parentElement.replaceChild(span, input);
}

// Cancel edit and revert to original text
function cancelEdit(input) {
    const lineIndex = parseInt(input.dataset.lineIndex);
    const wordIndex = parseInt(input.dataset.wordIndex);

    // Get original text
    let originalText = '';
    if (state.selectedAlignmentJSON.lines &&
        state.selectedAlignmentJSON.lines[lineIndex] &&
        state.selectedAlignmentJSON.lines[lineIndex].words[wordIndex]) {
        originalText = state.selectedAlignmentJSON.lines[lineIndex].words[wordIndex].text || '';
    }

    // Convert back to span with original text
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = originalText.trim();
    span.dataset.start = input.dataset.start;
    span.dataset.end = input.dataset.end;
    span.dataset.index = input.dataset.index;
    span.dataset.lineIndex = input.dataset.lineIndex;
    span.dataset.wordIndex = input.dataset.wordIndex;

    span.addEventListener('click', (e) => {
        e.stopPropagation();
        convertToInput(span, parseInt(span.dataset.lineIndex), parseInt(span.dataset.wordIndex));
    });

    input.parentElement.replaceChild(span, input);
}


function updateLyricHighlight() {
    if (!state.currentMedia) return;

    const currentTime = state.currentMedia.currentTime;
    const words = elements.lyricsContainer.querySelectorAll('.word');

    words.forEach(word => {
        const start = parseFloat(word.dataset.start);
        const end = parseFloat(word.dataset.end);

        if (currentTime >= start && currentTime <= end) {
            word.classList.add('active');
            word.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            word.classList.remove('active');
        }
    });
}


//helper 
function stripEmptyTextNodes(root) {
    [...root.childNodes].forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
            root.removeChild(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            stripEmptyTextNodes(node);
        }
    });
}
// Modals
async function openModal(type) {
    console.log(type)
    if (type === 'auth') {
        elements.authModal.classList.add('active');
        let key = api.getAPIKey()
        elements.apiKeyInput.value = (key != undefined) ? key : "";
        elements.apiKeyInput.type = "text" //debug key value
        elements.apiKeyInput.focus();
    } else if (type === 'code') {
        elements.codeModal.classList.add('active');
        updateCodeExample('javascript');
    } else if (type === 'faq') {
        elements.faqModal.classList.add('active');
        const response = await fetch("./faq.md");   // load file
        const markdown = await response.text();       // read raw MD
        // // faqModal, faqContent 
        console.log(markdown)
        // read raw MD
        // custom ext for target = _blank
        showdown.extension('targetBlank', function () {
            return [{
                type: 'output',
                regex: /<a\s+href="([^"]*)"/g,
                replace: '<a href="$1" target="_blank" rel="noopener noreferrer"'
            }];
        });

        const converter = new showdown.Converter({
            extensions: ['targetBlank'],
            rawHeaderId: true,
            simpleLineBreaks: true,
            parseInlineHTML: true,
            literalMidWordUnderscores: true,
            backslashEscapesHTMLTags: true,

            // THIS IS THE IMPORTANT ONE:
            noForcedInnerParagraph: true,

        });

        converter.setFlavor('github');
        // const html = converter.makeHtml(markdown);    // MD → HTML
        // console.log(html)
        // elements.faqContent.innerHTML = html
        const wrapper = document.createElement("div");
        html = converter.makeHtml(markdown);

        html = html.replace(/"/g, "");
        wrapper.innerHTML = html
        stripEmptyTextNodes(wrapper);

        elements.faqContent.innerHTML = wrapper.innerHTML;
    }

}

function closeModal(type) {
    if (type === 'auth') {
        elements.authModal.classList.remove('active');
    } else if (type === 'code') {
        elements.codeModal.classList.remove('active');
    } else if (type === 'faq') {
        elements.faqModal.classList.remove('active');
    }
}


// Toast
function showToast(message, duration = 3000) {
    elements.toast.textContent = message;
    elements.toast.classList.add('active');

    setTimeout(() => {
        elements.toast.classList.remove('active');
    }, duration);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
