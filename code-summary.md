# AudioShake Demo Application - Technical Deep Dive

## Executive Summary
This Single Page Application (SPA) acts as a reference implementation for the AudioShake API. It demonstrates two primary capabilities: **Source Separation** (stem creation) and **Alignment** (lyric syncing). The app is built with "Vanilla" JavaScript (ES6+), avoiding heavy frameworks to keep the API integration patterns clear and portable.

## 1. Architecture Overview
- **Pattern**: Module-based architecture using ES6 modules.
- **State Management**: Centralized reactive state in `app.js`.
- **API Layer**: Singleton class pattern in `api.js` handling all network communication.
- **persistence**: Mixed strategy using `localStorage` for UI preferences (theme) and `IndexedDB` for sensitive data (API Credentials).

## 2. Core Modules Implementation

### 2.1 Core Controller (`app.js`)
The `app.js` file serves as the "brain," connecting UI events to API logic.
- **State Object**: A simple `state` object tracks the application lifecycle (`assets`, `selectedAsset`, `taskPayload`, `alignments`). It is not a proxy-based reactive system; UI updates are triggered explicitly by function calls (e.g., `renderAssets()`, `loadStems()`).
- **Initialization Flow**:
  1. `loadIntro()`: Fetches/parses markdown content.
  2. `api.dbReady`: Awaits IndexedDB initialization before checking auth.
  3. `checkAuth()`: Auto-authorizes if a key is found in local storage.
- **Asset Logic**: Supports three loading modes:
  1. **Demo Preset**: Hardcoded JSON in `loadDemoAssets`.
  2. **File Upload**: Parses drag-and-dropped JSON files.
  3. **URL**: Fetches JSON from a remote endpoint.

### 2.2 API Client (`api.js`)
A robust wrapper around `fetch` designed for resilience.
- **IndexedDB for Auth**: Unlike typical apps using `localStorage` for tokens, this uses `IndexedDB` (Database: `audioshake_alignment_demo`, Store: `credentials`) to store the API Key. This provides better isolation and storage limits than localStorage.
- **Polling Strategy**: The `pollTask` method implements a **Recurisve Timeout** pattern (not `setInterval`).
  - *Why*: This ensures that a new poll request is only sent *after* the previous one completes, preventing race conditions or request flooding on slow networks.
  - *Logic*: Checks status -> if not complete, waits `interval` -> calls itself recursively.
- **Event Emitter**: Implements a lightweight Pub/Sub pattern (`on`, `emit`) to notify other modules when the API key changes validation state.

### 2.3 Audio Engine (`stemplayer.js`)
A complex module mimicking a Digital Audio Workstation (DAW).
- **Playback Strategy**:
  - Uses multiple HTML5 `<audio>` elements (one per stem).
  - **Synchronization**: It does not use the Web Audio API for *scheduling* (which can be complex for long files). Instead, it relies on DOM synchronization:
    - `playAllStems()`: Sets all elements to the same `currentTime` (`pausedAt`), then calls `.play()` on all.
    - `pauseAllStems()`: Captures `currentTime` from the *leader* (first track) to ensure resumption is accurate.
- **Waveform Rendering**:
  - **Primary**: Integrates `WaveSurfer.js` v7. It uses the `media` backend option, meaning WaveSurfer attaches to the existing `<audio>` element rather than fetching the file itself. This minimizes CORS issues and memory duplication.
  - **Fallback**: If WaveSurfer fails (e.g., decoding error), `drawPlaceholderWaveform` renders a procedural "fake" waveform on a generic `<canvas>` to ensure the UI remains broken.
- **Logic**:
  - `applySoloMuteLogic()`: Iterates all tracks. If *any* track is Solo, all non-Solo tracks are muted (volume = 0). If no tracks are Solo, acts on individual Mute states.

### 2.4 Task Builder (`modelSelector.js`)
- **Dynamic Payload**: It doesn't just list models; it builds a valid AudioShake API JSON payload on the fly.
- **Drag & Drop**: Implements native HTML5 Drag and Drop API (`dragstart`, `dragover`, `drop`) to move items between "Available" and "Selected" lists. It manages the `taskPayload` state directly.

## 3. Data Flow Walkthroughs

### Scenario A: Creating a Separation Task
1. **User Action**: Drags "Vocals" and "Drums" to the selected list.
2. **Logic (`modelSelector.js`)**: `updateTaskPayload()` constructs a JSON object: `{ url: "...", targets: [{ model: 'vocals', ...}] }`.
3. **User Action**: Clicks "Create Task".
4. **Network (`api.js`)**: Calls `POST /tasks`. Returns a generic Task Object.
5. **Polling (`api.js`)**: `pollTask` begins checking the ID every 4s.
6. **Completion**: When status is `completed`, `loadStems(task)` is called.
7. **Rendering (`stemplayer.js`)**: Iterates through `task.targets[0].output`, creating a UI row and `<audio>` element for every stem found.

### Scenario B: Alignment & Lyrics
1. **Data**: Alignment data is fetched as JSON, containing `lines` -> `words` -> `{ text, start, end }`.
2. **Rendering (`app.js`)**: `renderLyrics()` creates a `<span>` for every word.
   - **Metadata**: Start/End times are attached to the DOM via `dataset` (`data-start`, `data-end`).
3. **Sync**: On `timeupdate` event from the audio player:
   - `updateLyricHighlight()` iterates all word spans.
   - Compares `currentTime` vs `dataset.start/end`.
   - Toggles `.active` class for highlighting.
4. **Editing**: Clicking a word replaces the `<span>` with an `<input>`. Blur/Enter saves the change back to the in-memory JSON (local edit only).

## 4. Key "Gotchas" / Maintenance Notes
- **CORS**: The app loads media directly. If the source server does not send `Access-Control-Allow-Origin`, WaveSurfer (and potentially the audio element) will fail to render waveforms, though playback might still work via standard HTTP requests.
- **GitIgnore**: The `server.mjs` file is ignored, suggesting usage of a local node server (likely just serving static files) that isn't committed.
- **Performance**: The lyric highlighter iterates *all* words on every timeupdate. For very long alignment files (e.g. podcasts), this might need optimization (e.g., binary search or maintaining an active index).

