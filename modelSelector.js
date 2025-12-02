// ---------------------------
// MODEL JSON
// ---------------------------
const modelData = [
    {
        "name": "Instrumental",
        "model": "instrumental",
        "description": "Generates an instrumental-only version by removing vocals. For best quality, use the high_quality variant.",
        "variant": "high_quality"
    },
    {
        "name": "Drums",
        "model": "drums",
        "description": "Isolates percussion and rhythmic elements."
    },
    {
        "name": "Vocals",
        "model": "vocals",
        "description": "Extracts vocal elements from a mix. Supports the high_quality variant for improved clarity.",
        "variant": "high_quality"
    },
    {
        "name": "Bass",
        "model": "bass",
        "description": "Separates bass instruments and low-frequency sounds."
    },
    {
        "name": "Guitar",
        "model": "guitar",
        "description": "Isolates guitar stems (acoustic, electric, classical)."
    },
    {
        "name": "Piano",
        "model": "piano",
        "description": "Extracts piano or keyboard instruments."
    },
    {
        "name": "Strings",
        "model": "strings",
        "description": "Isolates orchestral string instruments like violin, cello, and viola."
    },
    {
        "name": "Wind",
        "model": "wind",
        "description": "Extracts wind instruments such as flute and saxophone."
    },
    {
        "name": "Other",
        "model": "other",
        "description": "Captures remaining instrumentation after main stems are removed."
    },
    {
        "name": "Other-x-Guitar",
        "model": "other-x-guitar",
        "description": "Residual instrumentation after removing vocals, drums, bass, and guitar."
    }
];
// [
//     { name: "Instrumental", model: "instrumental" },
//     { name: "Drums", model: "drums" },
//     { name: "Vocals", model: "vocals" },
//     { name: "Bass", model: "bass" },
//     { name: "Guitar", model: "guitar" },
//     { name: "Piano", model: "piano" },
//     { name: "Strings", model: "strings" },
//     { name: "Wind", model: "wind" },
//     { name: "Other", model: "other" },
//     { name: "Other-x-Guitar", model: "other-x-guitar" }
// ];

const availableList = document.getElementById("availableList");
const taskList = document.getElementById("taskList");
const debugEl = document.getElementById("modelPreviewOutput");

const maxModels = 10;

// ---------------------------
// RENDER LEFT LIST
// ---------------------------
modelData.forEach(stem => {
    const li = createItem(stem.model, stem.name);
    li.draggable = true;
    availableList.appendChild(li);
});

function createItem(model, label) {
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.model = model;
    li.textContent = label;
    return li;
}

// ---------------------------
// DRAG EVENTS (LEFT → RIGHT)
// ---------------------------
let draggedItem = null;




document.addEventListener("dragstart", (e) => {
    if (e.target.classList.contains("item")) {
        draggedItem = e.target;
        draggedItem.classList.add("dragging");
    }
});

document.addEventListener("dragend", () => {
    if (draggedItem) draggedItem.classList.remove("dragging");
    draggedItem = null;
});

// Allow dropping on taskList
taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(taskList, e.clientY);
    const dragging = document.querySelector(".dragging");

    if (!dragging) return;

    if (dragging.parentElement === taskList) {
        // Reordering inside right panel
        if (afterElement == null) {
            taskList.appendChild(dragging);
        } else {
            taskList.insertBefore(dragging, afterElement);
        }
    }
});

taskList.addEventListener("drop", (e) => {
    if (!draggedItem) return;

    const model = draggedItem.dataset.model;

    // Already in list?
    if ([...taskList.children].some(li => li.dataset.model === model)) {
        updateTaskPayload();
        return;
    }

    // Enforce max models
    if (taskList.children.length >= maxModels) {
        updateTaskPayload();
        return;
    }

    // Create new item for the task list
    const li = createItem(model, draggedItem.textContent);

    // Add remove button
    const remove = document.createElement("span");
    remove.className = "remove-btn";
    remove.textContent = "✕";
    remove.addEventListener("click", () => {
        taskList.removeChild(li);
        updateTaskPayload();
    });

    li.appendChild(remove);
    li.draggable = true;
    taskList.appendChild(li);

    updateTaskPayload();
});

// ---------------------------
// UTIL — Find element position for reordering
// ---------------------------
function getDragAfterElement(container, y) {
    const items = [...container.querySelectorAll(".item:not(.dragging)")];

    return items.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ---------------------------
// OUTPUT — selected models
// ---------------------------
function updateTaskPayload() {
    debugEl.textContent = '';
    if (!state.selectedAsset) {
        showToast('Please select an asset first');
        debugEl.textContent = 'Please select an asset first';
        return;
    }
    const url = (state.selectedAsset) ? state.selectedAsset.src : "Please select an asset "
    const models = [...taskList.children].map(li => li.dataset.model);
    const formats = [...document.querySelectorAll('input[name="format"]:checked')].map(f => f.value);

    let variant = undefined;
    let residual = true;

    const language = (document.getElementById("languageInput").value != "" || document.getElementById("languageInput").length > 2) ? document.getElementById("languageInput").value : "en"

    if (language.length > 2) {
        debugEl.textContent = "Language code is 2 characters max!"
        showToast("Language code is 2 characters")
        return
    }

    const isResidual = document.getElementById("inputResidual").checked;
    const targets = [...taskList.children].map((li) => {
        let model = li.dataset.model
        let obj = {
            model: li.dataset.model,
            formats: formats,
            language: language
        }
        if (model == "instrumental" || model == "vocals") {
            variant = "high_quality"
            obj.variant = variant
        }

        if (isResidual) {
            obj.residual = true
        }

        return obj


    }
    );

    let task = {
        url: url,
        targets: targets
    }

    // update the Payload state
    state.taskPayload = task;

    debugEl.textContent = JSON.stringify(
        task,
        null,
        2
    );

}

// UI Helper function for alterting the user how much time they have to download the stems

function getTaskExpiryInfo(completedTask) {
    if (!completedTask?.targets?.length) return null;

    const taskId = completedTask.id;
    const outputs = completedTask.targets[0].output || [];

    // Extract all ?Expires= timestamps
    const expiries = outputs
        .map(o => {
            const m = o.link.match(/Expires=(\d+)/);
            return m ? Number(m[1]) : null;
        })
        .filter(Boolean);

    if (expiries.length === 0) {
        return { taskId, expiresAt: null, expiresInMinutes: null, expiryMessage: "No expiry found" };
    }

    // Latest expiry across all outputs
    const latestExpiryUnix = Math.max(...expiries);
    const expiresAt = new Date(latestExpiryUnix * 1000);

    const now = new Date();
    const diffMs = expiresAt - now;
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));

    // Build a human readable message
    let expiryMessage;
    if (totalMinutes <= 0) {
        expiryMessage = "Expired";
    } else if (totalMinutes < 60) {
        expiryMessage = `expires in ${totalMinutes} minutes`;
    } else {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (minutes === 0) {
            expiryMessage = `expires in ${hours} hour${hours > 1 ? "s" : ""}`;
        } else {
            expiryMessage = `expires in ${hours} hour${hours > 1 ? "s" : ""} ${minutes} min`;
        }
    }

    return {
        taskId,
        expiresAt,
        expiresInMinutes: totalMinutes,
        expiryMessage
    };
}

updateTaskPayload();