// Main application file - Initialize and coordinate all components
class IllustrationEditor {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Initialize core managers
            this.initializeManagers();
            
            // Bind global events
            this.bindGlobalEvents();
            
            // Set up modals
            this.setupModals();
            
            // Set up file operations
            this.setupFileOperations();
            
            // Set up zoom controls
            this.setupZoomControls();
            
            // Set up text tool modal
            this.setupTextModal();
            
            // Initial state save
            setTimeout(() => {
                window.historyManager.saveState('Initial state');
            }, 100);
            
            this.isInitialized = true;
            console.log('Illustration Editor initialized successfully');
            
        } catch (error) {
            console.error('Error initializing Illustration Editor:', error);
            this.showError('Failed to initialize the application');
        }
    }

    initializeManagers() {
        // Initialize managers in the correct order
        window.historyManager = new HistoryManager();
        window.canvasManager = new CanvasManager();
        window.toolManager = new ToolManager();
        window.layerManager = new LayerManager();
        window.imageEditor = new ImageEditor();
        
        console.log('All managers initialized');
    }

    bindGlobalEvents() {
        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleWindowResize();
        }, 250));

        // Prevent accidental page leave
        window.addEventListener('beforeunload', (e) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        
        // Context menu prevention on canvas
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        });
    }

    handleGlobalKeydown(event) {
        // Tool shortcuts
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            switch (event.key.toLowerCase()) {
                case 'v':
                    this.setTool('select');
                    event.preventDefault();
                    break;
                case 'p':
                    this.setTool('pen');
                    event.preventDefault();
                    break;
                case 'b':
                    this.setTool('brush');
                    event.preventDefault();
                    break;
                case 'e':
                    this.setTool('eraser');
                    event.preventDefault();
                    break;
                case 'l':
                    this.setTool('line');
                    event.preventDefault();
                    break;
                case 'r':
                    this.setTool('rectangle');
                    event.preventDefault();
                    break;
                case 'c':
                    this.setTool('circle');
                    event.preventDefault();
                    break;
                case 't':
                    this.setTool('text');
                    event.preventDefault();
                    break;
                case 'escape':
                    this.cancelCurrentOperation();
                    break;
            }
        }
        
        // Brush size shortcuts
        if (event.key === '[') {
            this.adjustBrushSize(-1);
            event.preventDefault();
        } else if (event.key === ']') {
            this.adjustBrushSize(1);
            event.preventDefault();
        }
    }

    setTool(toolName) {
        window.toolManager.setTool(toolName);
    }

    adjustBrushSize(delta) {
        const strokeWidthEl = document.getElementById('strokeWidth');
        const widthDisplayEl = document.getElementById('widthDisplay');
        
        if (strokeWidthEl) {
            const currentSize = parseInt(strokeWidthEl.value);
            const newSize = Utils.clamp(currentSize + delta, 1, 50);
            
            strokeWidthEl.value = newSize;
            if (widthDisplayEl) {
                widthDisplayEl.textContent = newSize + 'px';
            }
            
            window.toolManager.setProperty('strokeWidth', newSize);
        }
    }

    cancelCurrentOperation() {
        if (window.canvasManager) {
            window.canvasManager.cancelCurrentOperation();
        }
        
        // Close any open modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    setupModals() {
        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close button handlers
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    setupFileOperations() {
        // Save document
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveDocument();
        });

        // Export document
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportDocument();
        });
    }

    newDocument() {
        if (confirm('Create a new document? This will clear your current work.')) {
            window.canvasManager.clearCanvas();
            window.layerManager.layers = [];
            window.layerManager.createDefaultLayer();
            window.historyManager.clearHistory();
            window.historyManager.saveState('New document');
        }
    }

    openFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,image/*';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.type === 'application/json') {
                // Load project file
                this.loadProject(file);
            } else if (file.type.startsWith('image/')) {
                // Load image
                await window.imageEditor.loadImage(file);
            }
        });
        
        input.click();
    }

    async loadProject(file) {
        try {
            const text = await file.text();
            const project = JSON.parse(text);
            
            if (project.version && project.layers && project.canvas) {
                // Load layers
                window.layerManager.importLayers(project.layers);
                
                // Load canvas dimensions
                window.canvasManager.resizeCanvas(project.canvas.width, project.canvas.height);
                
                // Load history if available
                if (project.history) {
                    window.historyManager.importHistory(project.history);
                }
                
                console.log('Project loaded successfully');
            } else {
                throw new Error('Invalid project file format');
            }
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project file');
        }
    }

    saveDocument() {
        const project = {
            version: '1.0',
            timestamp: Date.now(),
            canvas: {
                width: window.canvasManager.mainCanvas.width,
                height: window.canvasManager.mainCanvas.height
            },
            layers: window.layerManager.exportLayers(),
            history: window.historyManager.exportHistory()
        };
        
        const blob = new Blob([JSON.stringify(project, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `illustration_${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    exportDocument() {
        const canvas = window.canvasManager.mainCanvas;
        
        // Show export options
        const format = prompt('Export format (png/jpg):', 'png');
        if (!format) return;
        
        const quality = format === 'jpg' ? 
            parseFloat(prompt('Quality (0.1-1.0):', '0.9')) : 1;
        
        window.canvasManager.exportCanvas(format, quality);
    }

    setupZoomControls() {
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            window.canvasManager.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            window.canvasManager.zoomOut();
        });

        document.getElementById('zoomFitBtn').addEventListener('click', () => {
            window.canvasManager.fitToScreen();
        });
    }

    setupTextModal() {
        const modal = document.getElementById('textModal');
        const textInput = document.getElementById('textInput');
        const fontFamily = document.getElementById('fontFamily');
        const fontSize = document.getElementById('fontSize');
        const boldBtn = document.getElementById('boldBtn');
        const italicBtn = document.getElementById('italicBtn');
        const addTextBtn = document.getElementById('addTextBtn');
        const cancelTextBtn = document.getElementById('cancelTextBtn');

        let isBold = false;
        let isItalic = false;

        boldBtn.addEventListener('click', () => {
            isBold = !isBold;
            boldBtn.classList.toggle('active', isBold);
        });

        italicBtn.addEventListener('click', () => {
            isItalic = !isItalic;
            italicBtn.classList.toggle('active', isItalic);
        });

        addTextBtn.addEventListener('click', () => {
            const text = textInput.value.trim();
            if (text) {
                const textTool = window.toolManager.tools.text;
                textTool.addText(
                    text,
                    fontFamily.value,
                    parseInt(fontSize.value),
                    isBold,
                    isItalic
                );
                
                window.historyManager.saveState('Add text');
            }
            modal.style.display = 'none';
        });

        cancelTextBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Enter key to add text
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addTextBtn.click();
            }
        });
    }

    handleWindowResize() {
        // Update canvas positioning
        const overlayCanvas = window.canvasManager.overlayCanvas;
        const mainCanvas = window.canvasManager.mainCanvas;
        
        overlayCanvas.style.left = mainCanvas.offsetLeft + 'px';
        overlayCanvas.style.top = mainCanvas.offsetTop + 'px';
    }

    showError(message) {
        // Simple error display - could be enhanced with better UI
        alert('Error: ' + message);
    }

    showLoading(show = true) {
        // Simple loading indicator - could be enhanced
        const loading = document.querySelector('.loading') || 
            this.createLoadingElement();
        
        loading.style.display = show ? 'block' : 'none';
    }

    createLoadingElement() {
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.textContent = 'Loading...';
        document.body.appendChild(loading);
        return loading;
    }

    // Performance monitoring
    getPerformanceInfo() {
        const usage = window.historyManager.getMemoryUsage();
        const layersCount = window.layerManager.layers.length;
        const canvasSize = window.canvasManager.mainCanvas.width * 
                          window.canvasManager.mainCanvas.height;
        
        return {
            historyMemoryUsage: usage,
            layersCount: layersCount,
            canvasPixels: canvasSize,
            isInitialized: this.isInitialized
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.illustrationEditor = new IllustrationEditor();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.historyManager) {
        // Optimize history when page becomes visible again
        window.historyManager.optimizeHistory();
    }
});