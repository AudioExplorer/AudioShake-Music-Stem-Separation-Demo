// ---------------------------
// MODEL JSON
// ---------------------------
const modelData = [
    { "name": "Instrumental", "model": "instrumental", "variant": "high_quality" },
    { "name": "Drums", "model": "drums" },
    { "name": "Vocals", "model": "vocals", "variant": "high_quality" },
    { "name": "Bass", "model": "bass" },
    { "name": "Guitar", "model": "guitar" },
    { "name": "Piano", "model": "piano" },
    { "name": "Strings", "model": "strings" },
    { "name": "Wind", "model": "wind" },
    { "name": "Other", "model": "other" },
    { "name": "Other-x-Guitar", "model": "other-x-guitar" }
];

const availableList = document.getElementById("availableList");
const taskList = document.getElementById("taskList");
const debugEl = document.getElementById("modelPreviewOutput");
const maxModels = 10;


// ---------------------------
// RENDER AVAILABLE LIST
// ---------------------------
modelData.forEach(stem => {
    const li = createItem(stem.model, stem.name);
    li.dataset.originalName = stem.name;
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
// BUILD A MODEL CARD (v3.2)
// ---------------------------
function buildModelCard(li, model) {
    li.replaceChildren(); // wipe everything in a safe, atomic way

    // ----- HEADER -----
    const header = document.createElement("div");
    header.className = "model-header";

    const title = document.createElement("span");
    title.className = "model-title";
    title.textContent = li.dataset.originalName || model;

    const remove = document.createElement("span");
    remove.className = "remove-btn";
    remove.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M3 3 L9 9 M9 3 L3 9" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
`;

    remove.addEventListener("click", () => {
        taskList.removeChild(li);

        // Restore to available list
        const restored = createItem(model, li.dataset.originalName || model);
        restored.draggable = true;
        availableList.appendChild(restored);

        refreshAvailableListState();
        updateTaskPayload();
    });

    header.append(title, remove);

    // ----- OPTIONS -----
    const options = document.createElement("div");
    options.className = "model-options";

    options.innerHTML = `
        <div class="format-row">
            <label><input type="checkbox" class="fmt" value="wav"> wav</label>
            <label><input type="checkbox" class="fmt" value="mp3" checked> mp3</label>
            <label><input type="checkbox" class="fmt" value="mov"> mov</label>
            <label><input type="checkbox" class="fmt" value="mp4"> mp4</label>
        </div>

        <div class="residual-row">
            <label><input type="checkbox" class="residual-toggle"> residual</label>
        </div>
    `;

    // ANY option change → update payload
    options.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", updateTaskPayload);
    });

    // Final assembly
    li.append(header, options);
}


// ---------------------------
// DRAGGING LOGIC
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

taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const after = getDragAfterElement(taskList, e.clientY);
    const dragging = document.querySelector(".dragging");

    if (!dragging) return;

    if (dragging.parentElement === taskList) {
        if (!after) taskList.appendChild(dragging);
        else taskList.insertBefore(dragging, after);
    }
});

taskList.addEventListener("drop", () => {
    if (!draggedItem) return;

    const model = draggedItem.dataset.model;

    if ([...taskList.children].some(li => li.dataset.model === model)) return;

    if (taskList.children.length >= maxModels) {
        showToast("Max 10 models allowed");
        return;
    }

    const li = draggedItem;
    buildModelCard(li, model);

    li.draggable = true;
    taskList.appendChild(li);

    // Remove placeholder <p> if present
    const placeholder = taskList.querySelector("p");
    if (placeholder) placeholder.remove();

    refreshAvailableListState();
    updateTaskPayload();
});


// ---------------------------
// REORDER HELPER
// ---------------------------
function getDragAfterElement(container, y) {
    const items = [...container.querySelectorAll(".item:not(.dragging)")];

    return items.reduce((closest, child) => {
        const rect = child.getBoundingClientRect();
        const offset = y - (rect.top + rect.height / 2);

        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }

        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}


// ---------------------------
// DISABLE SELECTED MODELS IN LEFT LIST
// ---------------------------
function refreshAvailableListState() {
    const selected = [...taskList.children].filter(li => li.tagName === "LI").map(li => li.dataset.model);

    [...availableList.children].forEach(li => {
        if (selected.includes(li.dataset.model)) {
            li.classList.add("disabled");
            li.draggable = false;
        } else {
            li.classList.remove("disabled");
            li.draggable = true;
        }
    });
}


// ---------------------------
// UPDATE PAYLOAD (v3.2 SAFE VERSION)
// ---------------------------
function updateTaskPayload() {
    debugEl.textContent = "";

    if (!state.selectedAsset) {
        debugEl.textContent = "Please select an asset first";
        return;
    }

    const url = state.selectedAsset.src;

    const targets = [...taskList.children]
        .filter(li => li.tagName === "LI") // Ignore placeholder <p>
        .map(li => {
            const model = li.dataset.model;
            const optionsContainer = li.querySelector(".model-options");

            if (!optionsContainer) return null;

            const formats = [...optionsContainer.querySelectorAll(".fmt:checked")]
                .map(f => f.value);

            if (formats.length === 0) {
                showToast(`${model} requires at least one format`);
                throw new Error(`${model} must select at least one format`);
            }

            const residual = optionsContainer.querySelector(".residual-toggle")?.checked;

            const obj = { model, formats };

            if (model === "instrumental" || model === "vocals") {
                obj.variant = "high_quality";
            }

            if (residual) obj.residual = true;

            return obj;
        })
        .filter(Boolean); // Remove nulls

    const task = { url, targets };
    state.taskPayload = task;

    debugEl.textContent = JSON.stringify(task, null, 2);
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