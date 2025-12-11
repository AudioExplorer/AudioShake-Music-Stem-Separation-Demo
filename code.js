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

    // Parse the JSON string payload into an object
    let payloadObj;
    try {
        const payloadStr = await taskPayload(); // get the payload string
        payloadObj = JSON.parse(payloadStr);
    } catch (e) {
        console.error("Error parsing payload for Swift transformation:", e);
        payloadObj = {};
    }

    // replace all ${api_key} and ${asset_url}
    let injectedMD = markdown
        .replace(/\$\{api_key\}/g, YOUR_API_KEY)
        .replace(/\$\{payload\}/g, transformPayload(payloadObj));

    return injectedMD;
}





async function taskPayload() {
    if (state.taskPayload == null) {
        return `{
  "url": "https://demos.audioshake.ai/demo-assets/Audiio_Drakeford_The_Venture_Stronger_Than_One.wav",
  "targets": [
    {
      "model": "vocals",
      "formats": [
        "mp3"
      ],
      "variant": "high_quality"
    },
    {
      "model": "bass",
      "formats": [
        "mp3"
      ]
    },
    {
      "model": "drums",
      "formats": [
        "mp3"
      ]
    },
    {
      "model": "piano",
      "formats": [
        "mp3"
      ]
    }
  ]
}`
    } else {
        return JSON.stringify(state.taskPayload, null, 2)
    }

}

async function updateCodeExample(lang) {
    let YOUR_API_KEY = (api.hasAPIKey) ? api.apiKey : "YOUR_API_KEY";

    const examples = {
        swift: await loadSwiftCodeMD("./code/swift.md", YOUR_API_KEY),
        ios: await loadSwiftCodeMD("./code/ios.md", YOUR_API_KEY),
        javascript: await loadCodeMD("./code/javascript.md", YOUR_API_KEY),
        node: await loadCodeMD("./code/node.md", YOUR_API_KEY),
        curl: await loadCodeMD("./code/curl.md", YOUR_API_KEY),
        python: await loadCodeMD("./code/python.md", YOUR_API_KEY)
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

/***
 * 
 * goal transform any json to swift dictionary
 [
            "url": videoURL,
            "targets": [
                [
                    "model": "vocals",
                    "formats": ["mp3"],
                    "variant": "high_quality",
                    "residual": true
                ]
            ]
]
  
 */


// returns swift literal from js object
function transformPayload(payload) {
    if (!payload && payload !== false && payload !== 0) return ""; // stricter check

    // Updated default indent to 4 to match top-level swift.md structure
    const toSwiftLiteral = (value, indent = 4) => {
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

