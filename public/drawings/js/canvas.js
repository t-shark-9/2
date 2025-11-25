// Canvas management and drawing system
class CanvasManager {
    constructor() {
        this.mainCanvas = document.getElementById('mainCanvas');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        this.currentTool = 'select';
        this.isDrawing = false;
        this.startPoint = null;
        this.currentPath = [];
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        
        this.setupCanvas();
        this.bindEvents();
    }

    setupCanvas() {
        // Set initial canvas size
        this.resizeCanvas(800, 600);
        
        // Set up canvas styling
        this.mainCtx.lineCap = 'round';
        this.mainCtx.lineJoin = 'round';
        this.overlayCtx.lineCap = 'round';
        this.overlayCtx.lineJoin = 'round';
        
        // Enable image smoothing
        this.mainCtx.imageSmoothingEnabled = true;
        this.overlayCtx.imageSmoothingEnabled = true;
    }

    resizeCanvas(width, height) {
        this.mainCanvas.width = width;
        this.mainCanvas.height = height;
        this.overlayCanvas.width = width;
        this.overlayCanvas.height = height;
        
        // Reposition overlay canvas
        this.overlayCanvas.style.left = this.mainCanvas.offsetLeft + 'px';
        this.overlayCanvas.style.top = this.mainCanvas.offsetTop + 'px';
    }

    bindEvents() {
        // Mouse events
        this.mainCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.mainCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.mainCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.mainCanvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

        // Touch events for mobile
        this.mainCanvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.mainCanvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.mainCanvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Prevent context menu
        this.mainCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Zoom events
        this.mainCanvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleMouseDown(event) {
        event.preventDefault();
        const coords = Utils.getCanvasCoordinates(this.mainCanvas, event);
        this.startDrawing(coords, event);
    }

    handleMouseMove(event) {
        event.preventDefault();
        const coords = Utils.getCanvasCoordinates(this.mainCanvas, event);
        this.continueDrawing(coords, event);
    }

    handleMouseUp(event) {
        event.preventDefault();
        this.stopDrawing();
    }

    handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const coords = Utils.getCanvasCoordinates(this.mainCanvas, event.touches[0]);
            this.startDrawing(coords, event);
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const coords = Utils.getCanvasCoordinates(this.mainCanvas, event.touches[0]);
            this.continueDrawing(coords, event);
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.stopDrawing();
    }

    handleWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Utils.clamp(this.zoom * delta, 0.1, 5);
        
        if (newZoom !== this.zoom) {
            this.setZoom(newZoom);
        }
    }

    handleKeyDown(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'z':
                    event.preventDefault();
                    if (event.shiftKey) {
                        window.historyManager.redo();
                    } else {
                        window.historyManager.undo();
                    }
                    break;
                case 'y':
                    event.preventDefault();
                    window.historyManager.redo();
                    break;
                case 's':
                    event.preventDefault();
                    this.exportCanvas();
                    break;
                case 'n':
                    event.preventDefault();
                    this.clearCanvas();
                    break;
                case '=':
                case '+':
                    event.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                    event.preventDefault();
                    this.zoomOut();
                    break;
                case '0':
                    event.preventDefault();
                    this.resetZoom();
                    break;
            }
        }

        // ESC to cancel current operation
        if (event.key === 'Escape') {
            this.cancelCurrentOperation();
        }
    }

    handleKeyUp(event) {
        // Handle key releases if needed
    }

    startDrawing(coords, event) {
        this.isDrawing = true;
        this.startPoint = coords;
        this.currentPath = [coords];

        // Save state for undo
        window.historyManager.saveState();

        // Handle different tools
        const tool = window.toolManager.getCurrentTool();
        tool.onStart && tool.onStart(coords, this.mainCtx, this.overlayCtx);

        // Update cursor
        this.updateCursor();
    }

    continueDrawing(coords, event) {
        if (!this.isDrawing) return;

        this.currentPath.push(coords);

        // Handle different tools
        const tool = window.toolManager.getCurrentTool();
        tool.onMove && tool.onMove(coords, this.mainCtx, this.overlayCtx, this.startPoint);
    }

    stopDrawing() {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        // Handle different tools
        const tool = window.toolManager.getCurrentTool();
        tool.onEnd && tool.onEnd(this.mainCtx, this.overlayCtx, this.startPoint, this.currentPath);

        // Clear overlay
        this.clearOverlay();

        // Reset path
        this.currentPath = [];
        this.startPoint = null;

        // Update layers
        window.layerManager.updateCurrentLayer();
    }

    cancelCurrentOperation() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.clearOverlay();
            this.currentPath = [];
            this.startPoint = null;
            
            // Restore previous state
            window.historyManager.undo();
        }
    }

    updateCursor() {
        const wrapper = document.querySelector('.canvas-wrapper');
        wrapper.className = 'canvas-wrapper';
        
        switch (this.currentTool) {
            case 'pen':
                wrapper.classList.add('pen-cursor');
                break;
            case 'brush':
                wrapper.classList.add('brush-cursor');
                break;
            case 'eraser':
                wrapper.classList.add('eraser-cursor');
                break;
            default:
                // Default cursor
                break;
        }
    }

    setTool(toolName) {
        this.currentTool = toolName;
        this.updateCursor();
        
        // Cancel current operation if switching tools
        this.cancelCurrentOperation();
    }

    clearCanvas() {
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.clearOverlay();
        window.historyManager.saveState();
    }

    clearOverlay() {
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    setZoom(zoom) {
        this.zoom = zoom;
        this.mainCanvas.style.transform = `scale(${zoom})`;
        this.overlayCanvas.style.transform = `scale(${zoom})`;
        
        // Update zoom display
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(zoom * 100) + '%';
        }
    }

    zoomIn() {
        this.setZoom(Utils.clamp(this.zoom * 1.2, 0.1, 5));
    }

    zoomOut() {
        this.setZoom(Utils.clamp(this.zoom / 1.2, 0.1, 5));
    }

    resetZoom() {
        this.setZoom(1);
    }

    fitToScreen() {
        const container = this.mainCanvas.parentElement;
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        const scaleX = containerWidth / this.mainCanvas.width;
        const scaleY = containerHeight / this.mainCanvas.height;
        const scale = Math.min(scaleX, scaleY);
        
        this.setZoom(scale);
    }

    exportCanvas(format = 'png', quality = 1) {
        const dataURL = this.mainCanvas.toDataURL(`image/${format}`, quality);
        Utils.downloadCanvas(this.mainCanvas, `illustration.${format}`);
    }

    importImage(file) {
        return Utils.loadImageFromFile(file).then(img => {
            // Resize canvas to fit image if needed
            const maxWidth = 1200;
            const maxHeight = 800;
            
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            this.resizeCanvas(width, height);
            this.mainCtx.drawImage(img, 0, 0, width, height);
            
            window.historyManager.saveState();
            window.layerManager.updateCurrentLayer();
            
            return { width, height };
        });
    }

    getImageData() {
        return this.mainCtx.getImageData(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    }

    putImageData(imageData, x = 0, y = 0) {
        this.mainCtx.putImageData(imageData, x, y);
        window.layerManager.updateCurrentLayer();
    }

    applyFilter(filterType, intensity = 1) {
        const imageData = this.getImageData();
        const filteredData = Utils.applyFilter(imageData, filterType, intensity);
        this.putImageData(filteredData);
        window.historyManager.saveState();
    }
}