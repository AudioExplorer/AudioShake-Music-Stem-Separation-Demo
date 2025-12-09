// Code Examples

// Each function returns code example for that language with api key and source url injected

async function loadCodeMD(mdfile, YOUR_API_KEY) {
    const response = await fetch(mdfile);   // load file
    const markdown = await response.text();       // read raw MD

    // replace all ${api_key} and ${asset_url}
    let injectedMD = markdown
        .replace(/\$\{api_key\}/g, YOUR_API_KEY)
        .replace(/\$\{payload\}/g, await taskPayload())

    return injectedMD;
}

async function loadSwiftCodeMD(mdfile, YOUR_API_KEY) {
    const response = await fetch(mdfile);   // load file
    const markdown = await response.text();       // read raw MD

    // replace all ${api_key} and ${asset_url}
    let injectedMD = markdown
        .replace(/\$\{api_key\}/g, YOUR_API_KEY)
        // .replace(/\$\{asset_url\}/g, sourceURL)
        .replace(/\$\{payload\}/g, await transformPayload(state.taskPayload));

    return injectedMD;
}


async function transformPayload(payload) {

    /**
     * 
     * todo transform json payload to swift dict
     * 
     * Example payload:
      [
            "url": videoURL,
            "targets": [[
                "model": "alignment",
                "formats": ["json"],
                "language": "en"
            ]]
     * 
     */

}


async function taskPayload() {
    if (state.taskPayload == null) {
        return `{
  "url": "https://demos.spatial-explorer.com/demo-assets/Wordless.wav",
  "targets": [
    {
      "model": "vocals",
      "formats": [
        "mp3"
      ],
      "variant": "high_quality",
      "residual": true
    }
  ]`
    } else {
        return JSON.stringify(state.taskPayload, null, 2)
    }

}

async function updateCodeExample(lang) {
    let YOUR_API_KEY = (api.hasAPIKey) ? api.apiKey : "YOUR_API_KEY";
    let sourceURL = (state.selectedAsset != undefined) ? state.selectedAsset.src : 'https://example.com/audio.mp3'

    let payload = "";
    if (payload == undefined) {
        payload = JSON.stringify(state.taskPayload, null, 2)
    } else {
        payload = `{
    url: 'https://example.com/audio.mp3',
        targets: [
            {
                model: 'alignment',
                formats: ['json'],
                language: 'en'
            }
        ]
    }`
    }


    const examples = {
        swift: await loadSwiftCodeMD("./code/swift.md", YOUR_API_KEY),
        javascript: await loadCodeMD("./code/javascript.md", YOUR_API_KEY),
        node: await loadCodeMD("./code/node.md", YOUR_API_KEY),
        curl: await loadCodeMD("./code/curl.md", YOUR_API_KEY),
        python: await loadCodeMD("./code/python.md", YOUR_API_KEY),
    };

    elements.codeContent.textContent = examples[lang] || examples.javascript;
}

function copyCode() {
    const code = elements.codeContent.textContent;
    navigator.clipboard.writeText(code).then(() => {
        const originalText = elements.copyCodeBtn.textContent;
        elements.copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => {
            elements.copyCodeBtn.textContent = originalText;
        }, 2000);
    });
}

// returns swift literal from js object
async function transformPayload(payload) {
    if (!payload) return "";

    const toSwiftLiteral = (value, indent = 8) => {
        const pad = " ".repeat(indent);

        // Array → Swift array literal
        if (Array.isArray(value)) {
            if (value.length === 0) return "[]";

            return "[\n" +
                value
                    .map(v => pad + toSwiftLiteral(v, indent + 4))
                    .join(",\n") +
                "\n" + " ".repeat(indent - 4) + "]";
        }

        // Object → Swift dictionary literal
        if (value && typeof value === "object") {
            const entries = Object.entries(value);
            if (entries.length === 0) return "[:]";

            return "[\n" +
                entries
                    .map(([k, v]) =>
                        `${pad}"${k}": ${toSwiftLiteral(v, indent + 4)}`
                    )
                    .join(",\n") +
                "\n" + " ".repeat(indent - 4) + "]";
        }

        // Strings
        if (typeof value === "string") {
            return `"${value}"`;
        }

        // Booleans or numbers
        return String(value);
    };

    return toSwiftLiteral(payload);
}
