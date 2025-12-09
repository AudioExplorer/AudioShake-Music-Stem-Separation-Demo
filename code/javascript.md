const API_KEY = "${api_key}";
const payload = ${payload};

async function createTask() {
    console.log("🚀 Creating task...");

    const response = await fetch("https://api.audioshake.ai/tasks", {
        method: "POST",
        headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const task = await response.json();
    const taskId = task.id;
    console.log("Created task:", taskId);

    pollTask(taskId);
}

async function pollTask(taskId) {
    while (true) {
        const status = await fetch(`https://api.audioshake.ai/tasks/${taskId}`, {
            headers: { "x-api-key": API_KEY }
        }).then(r => r.json());

        const allDone = status.targets.every(t => t.status === "completed");

        if (allDone) {
            console.log("\nAll targets completed.\n");
            for (const target of status.targets) {
                console.log(`Target: ${target.model}`);
                for (const output of target.output ?? []) {
                    console.log(`  - ${output.format}: ${output.link}`);
                }
            }
            break;
        }

        console.log("Waiting...");
        await new Promise(r => setTimeout(r, 2000));
    }
}

createTask();