// Drawing tools implementation
class ToolManager {
    constructor() {
        this.currentTool = 'select';
        this.tools = {};
        this.properties = {
            strokeColor: '#000000',
            fillColor: '#ffffff',
            strokeWidth: 2,
            opacity: 1,
            fontSize: 16,
            fontFamily: 'Arial',
            bold: false,
            italic: false
        };
        
        this.initializeTools();
        this.bindEvents();
    }

    initializeTools() {
        this.tools = {
            select: new SelectTool(),
            pen: new PenTool(),
            brush: new BrushTool(),
            eraser: new EraserTool(),
            line: new LineTool(),
            rectangle: new RectangleTool(),
            circle: new CircleTool(),
            text: new TextTool()
        };
    }

    bindEvents() {
        // Regular tool buttons
        document.querySelectorAll('.tool-btn:not(.dropdown-toggle)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tool = btn.dataset.tool;
                if (tool) {
                    this.setTool(tool);
                }
            });
        });

        // Dropdown toggle buttons
        document.querySelectorAll('.dropdown-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const wrapper = btn.closest('.dropdown-wrapper');
                const isOpen = wrapper.classList.contains('open');
                
                // Close all dropdowns
                document.querySelectorAll('.dropdown-wrapper').forEach(w => w.classList.remove('open'));
                
                // Toggle this dropdown
                if (!isOpen) {
                    wrapper.classList.add('open');
                }
            });
        });

        // Dropdown item selection
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const tool = item.dataset.tool;
                if (tool) {
                    this.setTool(tool);
                    
                    // Update dropdown button icon
                    const wrapper = item.closest('.dropdown-wrapper');
                    const toggleBtn = wrapper.querySelector('.dropdown-toggle');
                    const icon = item.querySelector('i:first-child').className;
                    toggleBtn.querySelector('i:first-child').className = icon;
                    
                    // Close dropdown
                    wrapper.classList.remove('open');
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-wrapper')) {
                document.querySelectorAll('.dropdown-wrapper').forEach(w => w.classList.remove('open'));
            }
        });

        // Property controls
        document.getElementById('strokeColor').addEventListener('change', (e) => {
            this.properties.strokeColor = e.target.value;
        });

        document.getElementById('fillColor').addEventListener('change', (e) => {
            this.properties.fillColor = e.target.value;
        });

        document.getElementById('strokeWidth').addEventListener('input', (e) => {
            this.properties.strokeWidth = parseInt(e.target.value);
            document.getElementById('widthDisplay').textContent = e.target.value + 'px';
        });

        document.getElementById('opacity').addEventListener('input', (e) => {
            this.properties.opacity = parseFloat(e.target.value);
            document.getElementById('opacityDisplay').textContent = Math.round(e.target.value * 100) + '%';
        });
    }

    setTool(toolName) {
        if (this.tools[toolName]) {
            this.currentTool = toolName;
            window.canvasManager.setTool(toolName);
            
            // Update active states on main tool buttons and dropdown toggles
            document.querySelectorAll('.tool-btn:not(.dropdown-item)').forEach(btn => {
                if (btn.dataset.tool === toolName) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            // Check if tool is in a dropdown and activate that dropdown button
            document.querySelectorAll('.dropdown-item').forEach(item => {
                if (item.dataset.tool === toolName) {
                    const wrapper = item.closest('.dropdown-wrapper');
                    const toggleBtn = wrapper.querySelector('.dropdown-toggle');
                    toggleBtn.classList.add('active');
                }
            });
        }
    }

    getCurrentTool() {
        return this.tools[this.currentTool];
    }

    getProperties() {
        return { ...this.properties };
    }

    setProperty(key, value) {
        this.properties[key] = value;
    }
}

// Base Tool class
class BaseTool {
    constructor(name) {
        this.name = name;
    }

    onStart(coords, mainCtx, overlayCtx) {
        // Override in subclasses
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        // Override in subclasses
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        // Override in subclasses
    }

    applyStyles(ctx, properties) {
        ctx.strokeStyle = properties.strokeColor;
        ctx.fillStyle = properties.fillColor;
        ctx.lineWidth = properties.strokeWidth;
        ctx.globalAlpha = properties.opacity;
    }
}

// Select Tool
class SelectTool extends BaseTool {
    constructor() {
        super('select');
        this.selectedElement = null;
    }

    onStart(coords, mainCtx, overlayCtx) {
        // TODO: Implement selection logic
        console.log('Select tool - start');
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        // TODO: Implement selection rectangle
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        // TODO: Finalize selection
    }
}

// Pen Tool
class PenTool extends BaseTool {
    constructor() {
        super('pen');
        this.lastPoint = null;
    }

    onStart(coords, mainCtx, overlayCtx) {
        const props = window.toolManager.getProperties();
        this.applyStyles(mainCtx, props);
        
        mainCtx.beginPath();
        mainCtx.moveTo(coords.x, coords.y);
        this.lastPoint = coords;
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        const props = window.toolManager.getProperties();
        this.applyStyles(mainCtx, props);
        
        if (this.lastPoint) {
            mainCtx.beginPath();
            mainCtx.moveTo(this.lastPoint.x, this.lastPoint.y);
            mainCtx.lineTo(coords.x, coords.y);
            mainCtx.stroke();
        }
        
        this.lastPoint = coords;
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        this.lastPoint = null;
    }
}

// Brush Tool
class BrushTool extends BaseTool {
    constructor() {
        super('brush');
    }

    onStart(coords, mainCtx, overlayCtx) {
        const props = window.toolManager.getProperties();
        this.applyStyles(mainCtx, props);
        
        mainCtx.beginPath();
        mainCtx.moveTo(coords.x, coords.y);
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        const props = window.toolManager.getProperties();
        this.applyStyles(mainCtx, props);
        
        mainCtx.lineTo(coords.x, coords.y);
        mainCtx.stroke();
        mainCtx.beginPath();
        mainCtx.moveTo(coords.x, coords.y);
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        // Smooth the path for better brush strokes
        if (path.length > 2) {
            mainCtx.beginPath();
            mainCtx.moveTo(path[0].x, path[0].y);
            
            for (let i = 1; i < path.length - 2; i++) {
                const xc = (path[i].x + path[i + 1].x) / 2;
                const yc = (path[i].y + path[i + 1].y) / 2;
                mainCtx.quadraticCurveTo(path[i].x, path[i].y, xc, yc);
            }
            
            mainCtx.quadraticCurveTo(
                path[path.length - 2].x,
                path[path.length - 2].y,
                path[path.length - 1].x,
                path[path.length - 1].y
            );
            
            mainCtx.stroke();
        }
    }
}

// Eraser Tool
class EraserTool extends BaseTool {
    constructor() {
        super('eraser');
    }

    onStart(coords, mainCtx, overlayCtx) {
        const props = window.toolManager.getProperties();
        mainCtx.globalCompositeOperation = 'destination-out';
        mainCtx.beginPath();
        mainCtx.arc(coords.x, coords.y, props.strokeWidth / 2, 0, Math.PI * 2);
        mainCtx.fill();
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        const props = window.toolManager.getProperties();
        mainCtx.globalCompositeOperation = 'destination-out';
        mainCtx.beginPath();
        mainCtx.arc(coords.x, coords.y, props.strokeWidth / 2, 0, Math.PI * 2);
        mainCtx.fill();
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        mainCtx.globalCompositeOperation = 'source-over';
    }
}

// Line Tool
class LineTool extends BaseTool {
    constructor() {
        super('line');
    }

    onStart(coords, mainCtx, overlayCtx) {
        // Start drawing preview line
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        const props = window.toolManager.getProperties();
        
        // Clear overlay and draw preview
        overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
        this.applyStyles(overlayCtx, props);
        
        overlayCtx.beginPath();
        overlayCtx.moveTo(startPoint.x, startPoint.y);
        overlayCtx.lineTo(coords.x, coords.y);
        overlayCtx.stroke();
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        if (path.length > 0) {
            const props = window.toolManager.getProperties();
            this.applyStyles(mainCtx, props);
            
            const endPoint = path[path.length - 1];
            mainCtx.beginPath();
            mainCtx.moveTo(startPoint.x, startPoint.y);
            mainCtx.lineTo(endPoint.x, endPoint.y);
            mainCtx.stroke();
        }
    }
}

// Rectangle Tool
class RectangleTool extends BaseTool {
    constructor() {
        super('rectangle');
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        const props = window.toolManager.getProperties();
        
        // Clear overlay and draw preview
        overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
        this.applyStyles(overlayCtx, props);
        
        const width = coords.x - startPoint.x;
        const height = coords.y - startPoint.y;
        
        overlayCtx.beginPath();
        overlayCtx.rect(startPoint.x, startPoint.y, width, height);
        overlayCtx.stroke();
        
        if (props.fillColor && props.fillColor !== 'transparent') {
            overlayCtx.fill();
        }
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        if (path.length > 0) {
            const props = window.toolManager.getProperties();
            this.applyStyles(mainCtx, props);
            
            const endPoint = path[path.length - 1];
            const width = endPoint.x - startPoint.x;
            const height = endPoint.y - startPoint.y;
            
            mainCtx.beginPath();
            mainCtx.rect(startPoint.x, startPoint.y, width, height);
            
            if (props.fillColor && props.fillColor !== 'transparent') {
                mainCtx.fill();
            }
            mainCtx.stroke();
        }
    }
}

// Circle Tool
class CircleTool extends BaseTool {
    constructor() {
        super('circle');
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        const props = window.toolManager.getProperties();
        
        // Clear overlay and draw preview
        overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
        this.applyStyles(overlayCtx, props);
        
        const radius = Utils.distance(startPoint, coords);
        
        overlayCtx.beginPath();
        overlayCtx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
        overlayCtx.stroke();
        
        if (props.fillColor && props.fillColor !== 'transparent') {
            overlayCtx.fill();
        }
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        if (path.length > 0) {
            const props = window.toolManager.getProperties();
            this.applyStyles(mainCtx, props);
            
            const endPoint = path[path.length - 1];
            const radius = Utils.distance(startPoint, endPoint);
            
            mainCtx.beginPath();
            mainCtx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
            
            if (props.fillColor && props.fillColor !== 'transparent') {
                mainCtx.fill();
            }
            mainCtx.stroke();
        }
    }
}

// Text Tool
class TextTool extends BaseTool {
    constructor() {
        super('text');
        this.textPosition = null;
    }

    onStart(coords, mainCtx, overlayCtx) {
        this.textPosition = coords;
        this.showTextModal();
    }

    onMove(coords, mainCtx, overlayCtx, startPoint) {
        // No movement behavior for text tool
    }

    onEnd(mainCtx, overlayCtx, startPoint, path) {
        // Text is added via modal
    }

    showTextModal() {
        const modal = document.getElementById('textModal');
        modal.style.display = 'block';
        
        const textInput = document.getElementById('textInput');
        textInput.focus();
        textInput.value = '';
    }

    addText(text, fontFamily, fontSize, bold, italic) {
        if (!this.textPosition || !text.trim()) return;
        
        const props = window.toolManager.getProperties();
        const mainCtx = window.canvasManager.mainCtx;
        
        // Set text properties
        let font = '';
        if (bold) font += 'bold ';
        if (italic) font += 'italic ';
        font += `${fontSize}px ${fontFamily}`;
        
        mainCtx.font = font;
        mainCtx.fillStyle = props.strokeColor;
        mainCtx.textBaseline = 'top';
        
        // Draw text
        const lines = text.split('\n');
        const lineHeight = fontSize * 1.2;
        
        lines.forEach((line, index) => {
            mainCtx.fillText(
                line,
                this.textPosition.x,
                this.textPosition.y + (index * lineHeight)
            );
        });
        
        // Reset text position
        this.textPosition = null;
    }
}