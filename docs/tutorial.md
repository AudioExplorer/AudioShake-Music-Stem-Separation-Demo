# Generating Stems with the AudioShake Demo

This guide walks you through using the AudioShake Demo Application to separate a music track into individual stems (vocals, drums, bass, etc.).

## Prerequisites
- An **AudioShake API Key**. You can obtain one from the [AudioShake Dashboard](https://dashboard.audioshake.ai).

---

## Step 1: Authorization
Before interacting with the API, you must authorize the application.

1. Click the **Authorize** button (🔑 icon) in the top right corner of the navigation bar.
2. Enter your API Key in the modal window.
3. Click **Save**.
4. The button should update to show a green checkmark (`Authorized`).

> **Note**: Your API key is stored locally in your browser (using IndexedDB) so you don't need to re-enter it on every refresh.

## Step 2: Load a Media Asset
You need an audio or video file to process. The demo supports three ways to load assets:

### Option A: Use Demo Assets (Recommended for testing)
1. In the **Load Demo Assets** section, click the **"Load AudioShake Demo Assets"** button.
2. This will load a pre-configured sample track (`shakeitup.mp3`).

### Option B: From a Public URL
1. Scroll to **"Create asset from your source URL"**.
2. Paste a publicly accessible link to an audio/video file (e.g., MP3, WAV, MP4).
   - *Note: The URL must be directly accessible (no login pages).*
3. Click **Add Asset**.

### Option C: Bulk Load via JSON
1. Drag and drop a `demo-assets.json` file into the "Bulk Load" area. You can create one using the [Create Demo Assets Tool](https://www.npmjs.com/package/create-demo-assets).

## Step 3: Select the Asset
Once loaded, your media will appear in the **Demo Assets** grid.

1. Click on the card for the asset you want to process.
2. The asset card will highlight in blue, and the **Task Builder** section will appear below.

## Step 4: Configure the Separation Task
Use the **Task Builder** to define exactly what stems you want.

1. Look at the **Available Models** list on the left (e.g., *Vocals, Drums, Bass, Other*).
2. **Drag and Drop** the desired stems into the **Selected Models** list on the right.
   - *Example: To get an instrumental and acapella, drag "Vocals" and "Instrumental" to the right.*
3. **Configure Formats**:
   - Inside the selected model card, check the formats you need (e.g., `mp3`, `wav`).
   - You can also toggle `residual` if you want the "leftover" audio minus that stem.
4. Review the **Task Payload Preview** to see the JSON that will be sent to the API.

## Step 5: Create & Run
1. Click the **Create Separation Task** button.
2. A toast notification will appear: "Creating Separation task...".
3. Monitor the **Debug Output** in the right sidebar (click "API Console" if hidden) to see real-time updates.
4. The file will be uploaded (if needed) and processed. This may take a few minutes depending on file length.

## Step 6: Playback & Download
Once processing is complete (`status: completed`), the **Stem Player** will appear.

- **Playback**: Click **Play All** to start all stems in sync.
- **Mix**: Use the volume sliders to adjust levels.
- **Solo/Mute**: 
    - Click **S** to Solo a specific stem (mutes all others).
    - Click **M** to Mute a specific stem.
- **Download**: Click the **↓** arrow button next to a track to download the individual file.

---

## Troubleshooting
- **"Please select an asset first"**: Make sure you clicked an asset card and it is highlighted.
- **"Unauthorized"**: Re-check your API key in the Authorize modal.
- **No Waveforms**: If waveforms don't load but audio plays, it is likely a CORS issue with the source file server. This is visual only; separation still works.
