// AudioShake API Client
/**
 * AudioShakeAPI Class
 *
 * A client wrapper for the AudioShake API that handles authentication,
 * task management, and result polling. It persists the API key using
 * IndexedDB so the user stays logged in across sessions.
 */
class AudioShakeAPI {
    /**
     * Initializes the API client.
     * Sets up the base URL, database configuration, and event listeners.
     */
    constructor() {
        // Base API URL
        this.baseURL = 'https://api.audioshake.ai';
        // Current API Key
        this.apiKey = null;

        // IndexedDB Configuration
        this.dbName = 'audioshake_alignment_demo';
        this.storeName = 'credentials';
        this.db = null;

        // Event listeners storage
        this.listeners = {};

        // Initialize the database connection
        this.initDB();
    }

    // --- IndexedDB Setup ---

    /**
     * Initialize IndexedDB
     * Returns a Promise that resolves when the database is successfully opened.
     * Handles the 'onupgradeneeded' event to create the object store if it's missing.
     * 
     * @returns {Promise<void>}
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                this.loadStoredKey();
                resolve();
            };

            // Create the schema if this is the first time running or version changed
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    /**
     * Load Stored Key
     * Retrieves the API key from the local IndexedDB.
     * If a key is found, it updates the instance state and emits 'keyLoaded'.
     */
    async loadStoredKey() {
        try {
            const key = await this.getFromDB('apiKey');
            if (key) {
                this.apiKey = key;
                this.emit('keyLoaded', key);
            }
        } catch (err) {
            console.error('Error loading stored key:', err);
        }
    }

    /**
     * Get Value from DB
     * Helper method to get a value from the object store.
     * 
     * @param {string} key - The key to retrieve
     * @returns {Promise<any>} - The stored value
     */
    async getFromDB(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save Value to DB
     * Helper method to save a value to the object store.
     * 
     * @param {string} key - The key to store
     * @param {any} value - The value to save
     * @returns {Promise<void>}
     */
    async saveToDB(key, value) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.put(value, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Set API Key
     * Updates the API key in memory and saves it to the database.
     * @param {string} key - The new API key
     */
    async setAPIKey(key) {
        this.apiKey = key;
        await this.saveToDB('apiKey', key);
        this.emit('keyUpdated', key);
    }

    /**
     * Get API Key
     * @returns {string|null} - The current API key
     */
    getAPIKey() {
        return this.apiKey;
    }

    /**
     * Check if API Key exists
     * @returns {boolean}
     */
    hasAPIKey() {
        return !!this.apiKey;
    }

    /**
     * Clear API Key
     * Removes the key from memory and the database (Logout).
     */
    async clearAPIKey() {
        this.apiKey = null;
        if (this.db) {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            await store.delete('apiKey');
        }
        this.emit('keyCleared');
    }

    // --- Event Emitter ---

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Emit an event
     * Calls all registered listeners for the event.
     * @param {string} event - Event name
     * @param {any} data - Data to pass to listeners
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // --- API Request Handling ---

    /**
     * Make API Request
     * Centralized function to perform fetch requests to the API.
     * Automatically adds auth headers and parses JSON responses.
     * 
     * @param {string} endpoint - API endpoint (e.g., '/tasks')
     * @param {Object} options - Fetch options (method, body, headers)
     * @returns {Promise<Object>} - API response data
     * @throws {Error} - On network failure or HTTP errors
     */
    async request(endpoint, options = {}) {
        if (!this.apiKey) {
            throw new Error('API key not set. Please authorize first.');
        }

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'Access-Control-Request-Headers': 'Authorization, Content-Type',
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);

            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = { message: text, status: response.status };
            }

            // Check for HTTP error status codes (4xx and 5xx)
            if (!response.ok && typeof data !== 'object' || data === null) {
                throw new Error(`API Error: ${data}`);
            } else if (!response.ok && response.status >= 400 && response.status < 600) {
                let errorMessage = '';
                // check for common errors and set the error message accordingly
                switch (response.status) {
                    case 401:
                        errorMessage = 'Unauthorized: Missing or incorrect API key';
                        break;
                    case 403:
                        errorMessage = 'Forbidden: Access is denied for this request';
                        break;
                    default:
                        errorMessage = `HTTP Error: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            return data;
        } catch (err) {
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw err;
        }
    }



    // --- Task Creation ---

    /**
     * Create Task
     * Generic method to create a new processing task.
     * 
     * @param {string} url - URL of the audio file to process
     * @param {Array} targets - List of processing configurations (models, formats)
     * @param {string} [callbackUrl] - Optional URL for webhook completion notification
     * @returns {Promise<Object>} - The created task object
     */
    async createTask(url, targets, callbackUrl = null) {
        const payload = {
            url,
            targets,
            ...(callbackUrl && { callbackUrl })
        };

        return await this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Create Alignment Task (Helper)
     * Simplified method for creating lyrics alignment tasks.
     * 
     * @param {string} url - Audio file URL
     * @param {Array<string>} formats - Output formats (default: ['json'])
     * @param {string} language - Language code (default: 'en')
     * @returns {Promise<Object>}
     */
    async createAlignmentTask(url, formats = ['json'], language = 'en') {
        return await this.createTask(url, [
            {
                model: 'alignment',
                formats,
                language
            }
        ]);
    }

    /**
     * Create Separation Task (Wrapper)
     * Adapter method for creating stem separation or other tasks.
     * 
     * @param {Object} task - Object containing {url, targets}
     * @returns {Promise<Object>}
     */
    async createSepTask(task) {
        return await this.createTask(task.url, task.targets);
    }


    // --- Task Status & History ---

    /**
     * Get Task by ID
     * Retrieves the current status of a specific task.
     * @param {string} taskId - The ID of the task
     * @returns {Promise<Object>}
     */
    async getTask(taskId) {
        return await this.request(`/tasks/${taskId}`);
    }

    /**
     * List Tasks
     * Retrieves a list of tasks, supporting pagination and filtering.
     * @param {Object} params - Query parameters (e.g. { limit: 10, page: 1 })
     * @returns {Promise<Object>}
     */
    async listTasks(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = queryParams ? `/tasks?${queryParams}` : '/tasks';
        return await this.request(endpoint);
    }

    /**
     * Get Task Statistics
     * Retrieves account usage or other statistics.
     * @param {string} name - The statistic to retrieve (default: 'usage')
     * @returns {Promise<Object>}
     */
    async getTaskStatistics(name = 'usage') {
        return await this.request(`/tasks/statistics?name=${name}`);
    }

    // --- Polling System ---

    /**
     * Poll Task Status
     * Periodically checks the status of a task until it succeeds, fails, or times out.
     * 
     * @param {string} taskId - ID of the task to monitor
     * @param {Function} onUpdate - Callback invoked with task data on every poll
     * @param {number} maxAttempts - Max poll attempts before timeout (default: 60)
     * @param {number} interval - Interval between polls in ms (default: 4000)
     * @returns {Promise<Object>} - Resolves with the completed task object
     */
    async pollTask(taskId, onUpdate, maxAttempts = 60, interval = 4000) {
        let attempts = 0;
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    attempts++;
                    const task = await this.getTask(taskId);

                    if (onUpdate) {
                        onUpdate(task);
                    }

                    // Check the first target's status (Demo assumes single target per task)
                    const target = task.targets?.[0];

                    if (!target) {
                        reject(new Error('No targets found in task'));
                        return;
                    }

                    if (target.status === 'completed') {
                        resolve(task);
                    } else if (target.status === 'failed') {
                        reject(new Error(target.error || 'Task failed'));
                    } else if (attempts >= maxAttempts) {
                        reject(new Error('Polling timeout - task still processing'));
                    } else {
                        setTimeout(poll, interval);
                    }
                } catch (err) {
                    reject(err);
                }
            };
            poll();
        });
    }


    // --- Utilities ---

    /**
     * Fetch Alignment JSON
     * Retrieves the actual alignment result data from the provided URL.
     * @param {string} url - URL of the alignment JSON file
     * @returns {Promise<Object>} - The parsed JSON data
     */
    async fetchAlignment(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch alignment: ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            throw new Error(`Error fetching alignment data: ${err.message}`);
        }
    }

    /**
     * Validate API Key
     * Performs a lightweight request (listing tasks) to verify if the API key is valid.
     * @returns {Promise<boolean>} - True if the key is valid, false otherwise
     */
    async validateKey() {
        try {
            await this.listTasks({ limit: 1 });
            return true;
        } catch (err) {
            return false;
        }
    }
}

// Export singleton instance
const api = new AudioShakeAPI();