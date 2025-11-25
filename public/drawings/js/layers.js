// Layer management system
class LayerManager {
    constructor() {
        this.layers = [];
        this.activeLayerIndex = -1;
        this.layerIdCounter = 0;
        
        this.createDefaultLayer();
        this.bindEvents();
        this.updateLayersList();
    }

    bindEvents() {
        document.getElementById('addLayerBtn').addEventListener('click', () => {
            this.addLayer();
        });

        document.getElementById('deleteLayerBtn').addEventListener('click', () => {
            this.deleteActiveLayer();
        });

        document.getElementById('duplicateLayerBtn').addEventListener('click', () => {
            this.duplicateActiveLayer();
        });
    }

    createDefaultLayer() {
        const defaultLayer = this.createLayer('Background', true);
        this.setActiveLayer(0);
        return defaultLayer;
    }

    createLayer(name = '', visible = true, canvas = null) {
        const layer = {
            id: ++this.layerIdCounter,
            name: name || `Layer ${this.layerIdCounter}`,
            visible: visible,
            opacity: 1,
            blendMode: 'normal',
            canvas: canvas || this.createLayerCanvas(),
            locked: false,
            thumbnail: null
        };

        this.layers.push(layer);
        this.updateLayersList();
        
        return layer;
    }

    createLayerCanvas() {
        const canvas = document.createElement('canvas');
        const mainCanvas = window.canvasManager.mainCanvas;
        canvas.width = mainCanvas.width;
        canvas.height = mainCanvas.height;
        return canvas;
    }

    addLayer(name = '') {
        const layer = this.createLayer(name);
        this.setActiveLayer(this.layers.length - 1);
        window.historyManager.saveState();
        return layer;
    }

    deleteLayer(index) {
        if (this.layers.length <= 1) {
            alert('Cannot delete the last layer.');
            return false;
        }

        if (index < 0 || index >= this.layers.length) {
            return false;
        }

        this.layers.splice(index, 1);

        // Adjust active layer index
        if (this.activeLayerIndex >= index) {
            this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1);
        }

        this.updateLayersList();
        this.renderComposite();
        window.historyManager.saveState();
        return true;
    }

    deleteActiveLayer() {
        return this.deleteLayer(this.activeLayerIndex);
    }

    duplicateLayer(index) {
        if (index < 0 || index >= this.layers.length) {
            return null;
        }

        const originalLayer = this.layers[index];
        const canvas = Utils.copyCanvas(originalLayer.canvas);
        const newLayer = this.createLayer(`${originalLayer.name} Copy`, true, canvas);
        
        // Copy other properties
        newLayer.opacity = originalLayer.opacity;
        newLayer.blendMode = originalLayer.blendMode;
        
        // Move to position after original
        this.layers.splice(index + 1, 0, this.layers.pop());
        
        this.updateLayersList();
        this.setActiveLayer(index + 1);
        window.historyManager.saveState();
        
        return newLayer;
    }

    duplicateActiveLayer() {
        return this.duplicateLayer(this.activeLayerIndex);
    }

    setActiveLayer(index) {
        if (index < 0 || index >= this.layers.length) {
            return false;
        }

        this.activeLayerIndex = index;
        this.updateLayersList();
        this.syncActiveLayerToCanvas();
        return true;
    }

    getActiveLayer() {
        return this.layers[this.activeLayerIndex];
    }

    syncActiveLayerToCanvas() {
        const activeLayer = this.getActiveLayer();
        if (!activeLayer) return;

        const mainCanvas = window.canvasManager.mainCanvas;
        const mainCtx = window.canvasManager.mainCtx;

        // Clear main canvas
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        
        // Draw current layer content
        mainCtx.drawImage(activeLayer.canvas, 0, 0);
    }

    updateCurrentLayer() {
        const activeLayer = this.getActiveLayer();
        if (!activeLayer) return;

        const mainCanvas = window.canvasManager.mainCanvas;
        const layerCtx = activeLayer.canvas.getContext('2d');

        // Clear layer canvas
        layerCtx.clearRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
        
        // Copy main canvas content to layer
        layerCtx.drawImage(mainCanvas, 0, 0);

        // Generate thumbnail
        this.generateThumbnail(activeLayer);

        // Re-render composite
        this.renderComposite();
        
        this.updateLayersList();
    }

    renderComposite() {
        const mainCanvas = window.canvasManager.mainCanvas;
        const mainCtx = window.canvasManager.mainCtx;

        // Clear main canvas
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

        // Render layers from bottom to top
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            if (!layer.visible) continue;

            mainCtx.save();
            
            // Apply layer opacity
            mainCtx.globalAlpha = layer.opacity;
            
            // Apply blend mode
            mainCtx.globalCompositeOperation = layer.blendMode;
            
            // Draw layer
            mainCtx.drawImage(layer.canvas, 0, 0);
            
            mainCtx.restore();
        }
    }

    generateThumbnail(layer) {
        const thumbnailSize = 30;
        const canvas = document.createElement('canvas');
        canvas.width = thumbnailSize;
        canvas.height = thumbnailSize;
        const ctx = canvas.getContext('2d');

        // Calculate scale to fit thumbnail
        const scale = Math.min(
            thumbnailSize / layer.canvas.width,
            thumbnailSize / layer.canvas.height
        );

        const width = layer.canvas.width * scale;
        const height = layer.canvas.height * scale;
        const x = (thumbnailSize - width) / 2;
        const y = (thumbnailSize - height) / 2;

        ctx.drawImage(layer.canvas, x, y, width, height);
        layer.thumbnail = canvas.toDataURL();
    }

    updateLayersList() {
        const layersList = document.getElementById('layersList');
        layersList.innerHTML = '';

        // Render layers in reverse order (top to bottom)
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            const layerElement = this.createLayerElement(layer, i);
            layersList.appendChild(layerElement);
        }
    }

    createLayerElement(layer, index) {
        const div = document.createElement('div');
        div.className = 'layer-item';
        if (index === this.activeLayerIndex) {
            div.classList.add('active');
        }

        // Shorter layer names for inline layout
        const shortName = layer.name.length > 8 ? layer.name.substring(0, 8) + '...' : layer.name;

        div.innerHTML = `
            <div class="layer-visibility" data-index="${index}">
                <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </div>
            <div class="layer-name" data-index="${index}" title="${layer.name}">${shortName}</div>
        `;

        // Bind events
        div.querySelector('.layer-name').addEventListener('click', () => {
            this.setActiveLayer(index);
        });

        div.querySelector('.layer-visibility').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerVisibility(index);
        });

        // Double-click to rename
        div.querySelector('.layer-name').addEventListener('dblclick', (e) => {
            this.renameLayer(index);
        });

        return div;
    }

    toggleLayerVisibility(index) {
        if (index < 0 || index >= this.layers.length) return;

        this.layers[index].visible = !this.layers[index].visible;
        this.updateLayersList();
        this.renderComposite();
        window.historyManager.saveState();
    }

    renameLayer(index) {
        if (index < 0 || index >= this.layers.length) return;

        const layer = this.layers[index];
        const newName = prompt('Enter new layer name:', layer.name);
        
        if (newName && newName.trim()) {
            layer.name = newName.trim();
            this.updateLayersList();
        }
    }

    setLayerOpacity(index, opacity) {
        if (index < 0 || index >= this.layers.length) return;

        this.layers[index].opacity = Utils.clamp(opacity, 0, 1);
        this.renderComposite();
        this.updateLayersList();
    }

    setLayerBlendMode(index, blendMode) {
        if (index < 0 || index >= this.layers.length) return;

        this.layers[index].blendMode = blendMode;
        this.renderComposite();
    }

    moveLayer(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.layers.length ||
            toIndex < 0 || toIndex >= this.layers.length) {
            return false;
        }

        const layer = this.layers.splice(fromIndex, 1)[0];
        this.layers.splice(toIndex, 0, layer);

        // Update active layer index
        if (this.activeLayerIndex === fromIndex) {
            this.activeLayerIndex = toIndex;
        } else if (fromIndex < this.activeLayerIndex && toIndex >= this.activeLayerIndex) {
            this.activeLayerIndex--;
        } else if (fromIndex > this.activeLayerIndex && toIndex <= this.activeLayerIndex) {
            this.activeLayerIndex++;
        }

        this.updateLayersList();
        this.renderComposite();
        window.historyManager.saveState();
        return true;
    }

    mergeDown(index) {
        if (index <= 0 || index >= this.layers.length) return false;

        const upperLayer = this.layers[index];
        const lowerLayer = this.layers[index - 1];

        // Draw upper layer onto lower layer
        const lowerCtx = lowerLayer.canvas.getContext('2d');
        lowerCtx.save();
        lowerCtx.globalAlpha = upperLayer.opacity;
        lowerCtx.globalCompositeOperation = upperLayer.blendMode;
        lowerCtx.drawImage(upperLayer.canvas, 0, 0);
        lowerCtx.restore();

        // Remove upper layer
        this.deleteLayer(index);
        
        // Regenerate thumbnail for merged layer
        this.generateThumbnail(lowerLayer);
        
        window.historyManager.saveState();
        return true;
    }

    flattenImage() {
        if (this.layers.length <= 1) return;

        // Create a single layer with the composite result
        const canvas = Utils.copyCanvas(window.canvasManager.mainCanvas);
        
        // Clear all layers
        this.layers = [];
        this.activeLayerIndex = -1;
        
        // Create new single layer
        const flattenedLayer = this.createLayer('Flattened', true, canvas);
        this.setActiveLayer(0);
        
        window.historyManager.saveState();
    }

    exportLayers() {
        return this.layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            visible: layer.visible,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            locked: layer.locked,
            dataURL: layer.canvas.toDataURL()
        }));
    }

    importLayers(layersData) {
        this.layers = [];
        this.activeLayerIndex = -1;
        
        layersData.forEach((layerData, index) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const layer = {
                    id: layerData.id,
                    name: layerData.name,
                    visible: layerData.visible,
                    opacity: layerData.opacity,
                    blendMode: layerData.blendMode,
                    locked: layerData.locked,
                    canvas: canvas,
                    thumbnail: null
                };
                
                this.layers.push(layer);
                this.generateThumbnail(layer);
                
                // If this is the last layer, update everything
                if (this.layers.length === layersData.length) {
                    this.setActiveLayer(0);
                    this.renderComposite();
                    this.updateLayersList();
                }
            };
            img.src = layerData.dataURL;
        });
    }

    resizeAllLayers(newWidth, newHeight) {
        this.layers.forEach(layer => {
            const tempCanvas = Utils.copyCanvas(layer.canvas);
            layer.canvas.width = newWidth;
            layer.canvas.height = newHeight;
            
            const ctx = layer.canvas.getContext('2d');
            ctx.clearRect(0, 0, newWidth, newHeight);
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, newWidth, newHeight);
            
            this.generateThumbnail(layer);
        });
        
        this.renderComposite();
        this.updateLayersList();
    }
}