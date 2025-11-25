// Utility functions for the illustration editor

class Utils {
    static getCanvasCoordinates(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    static distance(point1, point2) {
        return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
    }

    static generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static downloadCanvas(canvas, filename = 'drawing.png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
    }

    static rgbaToHex(rgba) {
        const match = rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
        if (match) {
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
        return rgba;
    }

    static hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static copyCanvas(sourceCanvas) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = sourceCanvas.width;
        newCanvas.height = sourceCanvas.height;
        const ctx = newCanvas.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0);
        return newCanvas;
    }

    static resizeCanvas(canvas, width, height) {
        const tempCanvas = Utils.copyCanvas(canvas);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0);
    }

    static createImageFromCanvas(canvas) {
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }

    static loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    static applyFilter(imageData, filterType, intensity = 1) {
        const data = imageData.data;
        
        switch (filterType) {
            case 'brightness':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + intensity * 50);
                    data[i + 1] = Math.min(255, data[i + 1] + intensity * 50);
                    data[i + 2] = Math.min(255, data[i + 2] + intensity * 50);
                }
                break;
                
            case 'contrast':
                const factor = (259 * (intensity * 255 + 255)) / (255 * (259 - intensity * 255));
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Utils.clamp(factor * (data[i] - 128) + 128, 0, 255);
                    data[i + 1] = Utils.clamp(factor * (data[i + 1] - 128) + 128, 0, 255);
                    data[i + 2] = Utils.clamp(factor * (data[i + 2] - 128) + 128, 0, 255);
                }
                break;
                
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    data[i] = gray * intensity + data[i] * (1 - intensity);
                    data[i + 1] = gray * intensity + data[i + 1] * (1 - intensity);
                    data[i + 2] = gray * intensity + data[i + 2] * (1 - intensity);
                }
                break;
                
            case 'blur':
                // Simple box blur implementation
                const pixels = imageData.width * imageData.height;
                const radius = Math.floor(intensity * 5);
                
                for (let i = 0; i < pixels; i++) {
                    const x = i % imageData.width;
                    const y = Math.floor(i / imageData.width);
                    
                    let r = 0, g = 0, b = 0, count = 0;
                    
                    for (let dx = -radius; dx <= radius; dx++) {
                        for (let dy = -radius; dy <= radius; dy++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < imageData.width && ny >= 0 && ny < imageData.height) {
                                const idx = (ny * imageData.width + nx) * 4;
                                r += data[idx];
                                g += data[idx + 1];
                                b += data[idx + 2];
                                count++;
                            }
                        }
                    }
                    
                    const idx = i * 4;
                    data[idx] = r / count;
                    data[idx + 1] = g / count;
                    data[idx + 2] = b / count;
                }
                break;
        }
        
        return imageData;
    }

    static isPointInPath(ctx, path, point) {
        return ctx.isPointInPath(path, point.x, point.y);
    }

    static getBoundingBox(points) {
        if (points.length === 0) return null;
        
        let minX = points[0].x;
        let minY = points[0].y;
        let maxX = points[0].x;
        let maxY = points[0].y;
        
        for (let i = 1; i < points.length; i++) {
            minX = Math.min(minX, points[i].x);
            minY = Math.min(minY, points[i].y);
            maxX = Math.max(maxX, points[i].x);
            maxY = Math.max(maxY, points[i].y);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}