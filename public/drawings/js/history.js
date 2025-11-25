// History and undo/redo functionality
class HistoryManager {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50;
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('redoBtn').addEventListener('click', () => {
            this.redo();
        });
    }

    saveState(description = 'Action') {
        // Remove any history after current index (when doing new action after undo)
        if (this.currentIndex < this.history.length - 1) {
            this.history.splice(this.currentIndex + 1);
        }

        // Create state snapshot
        const state = {
            timestamp: Date.now(),
            description: description,
            canvasData: this.captureCanvasState(),
            layersData: this.captureLayersState(),
            properties: this.capturePropertiesState()
        };

        this.history.push(state);

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }

        this.updateUndoRedoButtons();
    }

    captureCanvasState() {
        const canvas = window.canvasManager.mainCanvas;
        return {
            width: canvas.width,
            height: canvas.height,
            dataURL: canvas.toDataURL()
        };
    }

    captureLayersState() {
        if (!window.layerManager) return null;
        
        return {
            activeLayerIndex: window.layerManager.activeLayerIndex,
            layers: window.layerManager.exportLayers()
        };
    }

    capturePropertiesState() {
        if (!window.toolManager) return null;
        
        return {
            currentTool: window.toolManager.currentTool,
            properties: { ...window.toolManager.properties }
        };
    }

    undo() {
        if (!this.canUndo()) return false;

        this.currentIndex--;
        this.restoreState(this.history[this.currentIndex]);
        this.updateUndoRedoButtons();
        
        return true;
    }

    redo() {
        if (!this.canRedo()) return false;

        this.currentIndex++;
        this.restoreState(this.history[this.currentIndex]);
        this.updateUndoRedoButtons();
        
        return true;
    }

    restoreState(state) {
        // Restore canvas
        this.restoreCanvas(state.canvasData);
        
        // Restore layers
        if (state.layersData && window.layerManager) {
            this.restoreLayers(state.layersData);
        }
        
        // Restore properties
        if (state.properties && window.toolManager) {
            this.restoreProperties(state.properties);
        }
    }

    restoreCanvas(canvasData) {
        const canvas = window.canvasManager.mainCanvas;
        const ctx = window.canvasManager.mainCtx;

        // Resize if needed
        if (canvas.width !== canvasData.width || canvas.height !== canvasData.height) {
            window.canvasManager.resizeCanvas(canvasData.width, canvasData.height);
        }

        // Load image
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = canvasData.dataURL;
    }

    restoreLayers(layersData) {
        window.layerManager.importLayers(layersData.layers);
        window.layerManager.activeLayerIndex = layersData.activeLayerIndex;
    }

    restoreProperties(propertiesData) {
        window.toolManager.currentTool = propertiesData.currentTool;
        Object.assign(window.toolManager.properties, propertiesData.properties);
        
        // Update UI controls
        this.updatePropertiesUI(propertiesData.properties);
        
        // Update active tool button
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === propertiesData.currentTool);
        });
    }

    updatePropertiesUI(properties) {
        const strokeColorEl = document.getElementById('strokeColor');
        if (strokeColorEl && properties.strokeColor) {
            strokeColorEl.value = properties.strokeColor;
        }

        const fillColorEl = document.getElementById('fillColor');
        if (fillColorEl && properties.fillColor) {
            fillColorEl.value = properties.fillColor;
        }

        const strokeWidthEl = document.getElementById('strokeWidth');
        const widthDisplayEl = document.getElementById('widthDisplay');
        if (strokeWidthEl && properties.strokeWidth) {
            strokeWidthEl.value = properties.strokeWidth;
            if (widthDisplayEl) {
                widthDisplayEl.textContent = properties.strokeWidth + 'px';
            }
        }

        const opacityEl = document.getElementById('opacity');
        const opacityDisplayEl = document.getElementById('opacityDisplay');
        if (opacityEl && properties.opacity !== undefined) {
            opacityEl.value = properties.opacity;
            if (opacityDisplayEl) {
                opacityDisplayEl.textContent = Math.round(properties.opacity * 100) + '%';
            }
        }
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
            undoBtn.style.opacity = this.canUndo() ? '1' : '0.5';
        }

        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
            redoBtn.style.opacity = this.canRedo() ? '1' : '0.5';
        }
    }

    jumpToState(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.history.length) return false;

        this.currentIndex = targetIndex;
        this.restoreState(this.history[this.currentIndex]);
        this.updateHistoryUI();
        this.updateUndoRedoButtons();
        
        return true;
    }

    clearHistory() {
        this.history = [];
        this.currentIndex = -1;
        this.updateHistoryUI();
        this.updateUndoRedoButtons();
    }

    getHistorySize() {
        return this.history.length;
    }

    getMemoryUsage() {
        let totalSize = 0;
        
        this.history.forEach(state => {
            if (state.canvasData && state.canvasData.dataURL) {
                // Rough estimate: base64 string length
                totalSize += state.canvasData.dataURL.length;
            }
        });
        
        return {
            bytes: totalSize,
            megabytes: (totalSize / (1024 * 1024)).toFixed(2)
        };
    }

    optimizeHistory() {
        // Remove older states if memory usage is too high
        const usage = this.getMemoryUsage();
        
        if (usage.megabytes > 100) { // More than 100MB
            const itemsToRemove = Math.floor(this.history.length * 0.3); // Remove 30%
            this.history.splice(0, itemsToRemove);
            this.currentIndex = Math.max(0, this.currentIndex - itemsToRemove);
            
            this.updateHistoryUI();
            this.updateUndoRedoButtons();
            
            console.log(`History optimized: removed ${itemsToRemove} items`);
        }
    }

    exportHistory() {
        return {
            history: this.history,
            currentIndex: this.currentIndex,
            timestamp: Date.now()
        };
    }

    importHistory(historyData) {
        if (!historyData || !Array.isArray(historyData.history)) return false;

        this.history = historyData.history;
        this.currentIndex = historyData.currentIndex;
        
        // Validate current index
        if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
            this.currentIndex = this.history.length - 1;
        }
        
        this.updateHistoryUI();
        this.updateUndoRedoButtons();
        
        return true;
    }

    // Throttled save state to prevent too many saves during continuous drawing
    saveStateThrottled = Utils.throttle((description) => {
        this.saveState(description);
    }, 100);

    // Debounced save state for final action completion
    saveStateDebounced = Utils.debounce((description) => {
        this.saveState(description);
    }, 300);
}