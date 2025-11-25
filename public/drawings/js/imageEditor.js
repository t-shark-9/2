// Image editing and filter functionality
class ImageEditor {
    constructor() {
        this.currentImage = null;
        this.originalImageData = null;
        this.filterHistory = [];
        this.bindEvents();
    }

    bindEvents() {
        // Image upload
        document.getElementById('imageUpload').addEventListener('change', this.handleImageUpload.bind(this));
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        this.loadImage(file);
    }

    async loadImage(file) {
        try {
            const img = await Utils.loadImageFromFile(file);
            await window.canvasManager.importImage(file);
            
            this.currentImage = img;
            this.saveOriginalImageData();
            
            console.log('Image loaded successfully');
        } catch (error) {
            console.error('Error loading image:', error);
            alert('Error loading image. Please try again.');
        }
    }

    saveOriginalImageData() {
        this.originalImageData = window.canvasManager.getImageData();
    }

    applyFilter(filterType) {
        if (!this.originalImageData) {
            alert('Please load an image first.');
            return;
        }

        const imageData = window.canvasManager.getImageData();
        
        // Apply different filters
        switch (filterType) {
            case 'brightness':
                this.adjustBrightness(imageData, 0.3);
                break;
            case 'contrast':
                this.adjustContrast(imageData, 0.5);
                break;
            case 'blur':
                this.applyBlur(imageData, 2);
                break;
            case 'grayscale':
                this.convertToGrayscale(imageData);
                break;
            case 'sepia':
                this.applySepia(imageData);
                break;
            case 'invert':
                this.invertColors(imageData);
                break;
            case 'sharpen':
                this.applySharpen(imageData);
                break;
            case 'emboss':
                this.applyEmboss(imageData);
                break;
        }

        window.canvasManager.putImageData(imageData);
        window.historyManager.saveState();
    }

    adjustBrightness(imageData, factor) {
        const data = imageData.data;
        const adjustment = 255 * factor;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Utils.clamp(data[i] + adjustment, 0, 255);     // Red
            data[i + 1] = Utils.clamp(data[i + 1] + adjustment, 0, 255); // Green
            data[i + 2] = Utils.clamp(data[i + 2] + adjustment, 0, 255); // Blue
        }
    }

    adjustContrast(imageData, factor) {
        const data = imageData.data;
        const contrast = (259 * (factor * 255 + 255)) / (255 * (259 - factor * 255));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Utils.clamp(contrast * (data[i] - 128) + 128, 0, 255);
            data[i + 1] = Utils.clamp(contrast * (data[i + 1] - 128) + 128, 0, 255);
            data[i + 2] = Utils.clamp(contrast * (data[i + 2] - 128) + 128, 0, 255);
        }
    }

    convertToGrayscale(imageData) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;     // Red
            data[i + 1] = gray; // Green
            data[i + 2] = gray; // Blue
        }
    }

    applySepia(imageData) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
    }

    invertColors(imageData) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];         // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 255 - data[i + 2]; // Blue
        }
    }

    applyBlur(imageData, radius = 1) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const idx = (ny * width + nx) * 4;
                            r += data[idx];
                            g += data[idx + 1];
                            b += data[idx + 2];
                            a += data[idx + 3];
                            count++;
                        }
                    }
                }

                const idx = (y * width + x) * 4;
                output[idx] = r / count;
                output[idx + 1] = g / count;
                output[idx + 2] = b / count;
                output[idx + 3] = a / count;
            }
        }

        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
    }

    applySharpen(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);

        // Sharpen kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];

                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                    }
                }

                const idx = (y * width + x) * 4;
                output[idx] = Utils.clamp(r, 0, 255);
                output[idx + 1] = Utils.clamp(g, 0, 255);
                output[idx + 2] = Utils.clamp(b, 0, 255);
            }
        }

        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
    }

    applyEmboss(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data);

        // Emboss kernel
        const kernel = [
            -2, -1, 0,
            -1, 1, 1,
            0, 1, 2
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];

                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                    }
                }

                const idx = (y * width + x) * 4;
                output[idx] = Utils.clamp(r + 128, 0, 255);
                output[idx + 1] = Utils.clamp(g + 128, 0, 255);
                output[idx + 2] = Utils.clamp(b + 128, 0, 255);
            }
        }

        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
    }

    resetToOriginal() {
        if (this.originalImageData) {
            window.canvasManager.putImageData(this.originalImageData);
            window.historyManager.saveState();
        }
    }

    cropImage(x, y, width, height) {
        const canvas = window.canvasManager.mainCanvas;
        const ctx = window.canvasManager.mainCtx;
        
        // Create a new canvas with cropped dimensions
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the cropped portion
        tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
        
        // Resize main canvas and draw cropped image
        window.canvasManager.resizeCanvas(width, height);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0);
        
        window.historyManager.saveState();
    }

    resizeImage(newWidth, newHeight, maintainAspect = true) {
        const canvas = window.canvasManager.mainCanvas;
        const currentWidth = canvas.width;
        const currentHeight = canvas.height;
        
        if (maintainAspect) {
            const aspectRatio = currentWidth / currentHeight;
            
            if (newWidth / newHeight > aspectRatio) {
                newWidth = newHeight * aspectRatio;
            } else {
                newHeight = newWidth / aspectRatio;
            }
        }
        
        // Create temporary canvas with current content
        const tempCanvas = Utils.copyCanvas(canvas);
        
        // Resize and redraw
        window.canvasManager.resizeCanvas(newWidth, newHeight);
        const ctx = window.canvasManager.mainCtx;
        ctx.clearRect(0, 0, newWidth, newHeight);
        ctx.drawImage(tempCanvas, 0, 0, currentWidth, currentHeight, 0, 0, newWidth, newHeight);
        
        window.historyManager.saveState();
    }

    rotateImage(degrees) {
        const canvas = window.canvasManager.mainCanvas;
        const ctx = window.canvasManager.mainCtx;
        const tempCanvas = Utils.copyCanvas(canvas);
        
        const radians = degrees * Math.PI / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        
        // Calculate new canvas size
        const newWidth = Math.floor(canvas.width * cos + canvas.height * sin);
        const newHeight = Math.floor(canvas.width * sin + canvas.height * cos);
        
        window.canvasManager.resizeCanvas(newWidth, newHeight);
        
        // Rotate and draw
        ctx.save();
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(radians);
        ctx.drawImage(tempCanvas, -canvas.width / 2, -canvas.height / 2);
        ctx.restore();
        
        window.historyManager.saveState();
    }

    flipHorizontal() {
        const canvas = window.canvasManager.mainCanvas;
        const ctx = window.canvasManager.mainCtx;
        const tempCanvas = Utils.copyCanvas(canvas);
        
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(tempCanvas, -canvas.width, 0);
        ctx.restore();
        
        window.historyManager.saveState();
    }

    flipVertical() {
        const canvas = window.canvasManager.mainCanvas;
        const ctx = window.canvasManager.mainCtx;
        const tempCanvas = Utils.copyCanvas(canvas);
        
        ctx.save();
        ctx.scale(1, -1);
        ctx.drawImage(tempCanvas, 0, -canvas.height);
        ctx.restore();
        
        window.historyManager.saveState();
    }
}