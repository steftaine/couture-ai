import { VeoService } from './veo-service.js';

class Atelier {
    constructor() {
        this.modelImages = []; // Array of Image objects
        this.garmentImages = []; // Array of Image objects
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentFabric = null;
        this.veoService = new VeoService();
        this.outputType = 'photo'; // 'photo' or 'video'

        this.init();
    }

    init() {
        this.setupUploaders();
        this.setupControls();
        this.resizeCanvas();

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    setupUploaders() {
        this.setupDropZone('modelDropZone', 'modelInput', 'museThumbnails', 'muse');
        this.setupDropZone('garmentDropZone', 'garmentInput', 'garmentThumbnails', 'garment');
    }

    setupDropZone(zoneId, inputId, galleryId, type) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);
        const gallery = document.getElementById(galleryId);

        zone.addEventListener('click', () => input.click());

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.borderColor = 'var(--accent-gold)';
        });

        zone.addEventListener('dragleave', () => {
            zone.style.borderColor = '';
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.borderColor = '';
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                this.handleFiles(files, type);
            }
        });

        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.handleFiles(files, type);
            }
        });
    }

    async handleFiles(files, type) {
        for (const file of files) {
            const img = await this.loadImage(file);
            if (type === 'muse') {
                this.modelImages.push(img);
            } else {
                this.garmentImages.push(img);
            }
        }
        this.updateThumbnails();
        this.updateCounts();
        this.drawComposition();
    }

    loadImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    updateThumbnails() {
        this.renderThumbnails('museThumbnails', this.modelImages, 'muse');
        this.renderThumbnails('garmentThumbnails', this.garmentImages, 'garment');
    }

    renderThumbnails(galleryId, images, type) {
        const gallery = document.getElementById(galleryId);
        gallery.innerHTML = '';

        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'thumbnail-item';

            const thumbnail = document.createElement('img');
            thumbnail.src = img.src;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'thumbnail-remove';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeImage(type, index);
            });

            item.appendChild(thumbnail);
            item.appendChild(removeBtn);
            gallery.appendChild(item);
        });
    }

    removeImage(type, index) {
        if (type === 'muse') {
            this.modelImages.splice(index, 1);
        } else {
            this.garmentImages.splice(index, 1);
        }
        this.updateThumbnails();
        this.updateCounts();
        this.drawComposition();
    }

    updateCounts() {
        document.getElementById('museCount').textContent = this.modelImages.length;
        document.getElementById('garmentCount').textContent = this.garmentImages.length;
    }

    setupControls() {
        // Output Type Toggle
        const toggleBtns = document.querySelectorAll('.toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.outputType = btn.dataset.type;
                this.updateButtonText();
            });
        });

        // Generate Button
        document.getElementById('generateBtn').addEventListener('click', () => {
            const pairCount = Math.min(this.modelImages.length, this.garmentImages.length);
            if (pairCount === 0) {
                alert('Please upload at least one muse and one garment.');
                return;
            }
            this.batchGenerate();
        });

        // Enter key to generate
        document.getElementById('customPrompt').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                document.getElementById('generateBtn').click();
            }
        });
    }

    updateButtonText() {
        const btn = document.getElementById('generateBtn');
        btn.textContent = this.outputType === 'photo' ? 'GENERATE PHOTOS' : 'GENERATE VIDEOS';
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.drawComposition();
    }

    drawComposition() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.filter = 'none';

        // Draw the first pair as preview
        if (this.modelImages.length > 0) {
            this.drawImageScaled(this.modelImages[0]);
        }

        if (this.garmentImages.length > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.9;
            this.drawImageScaled(this.garmentImages[0]);
            this.ctx.restore();
        }
    }

    drawImageScaled(img) {
        const hRatio = this.canvas.width / img.width;
        const vRatio = this.canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio) * 0.9;

        const centerShift_x = (this.canvas.width - img.width * ratio) / 2;
        const centerShift_y = (this.canvas.height - img.height * ratio) / 2;

        this.ctx.drawImage(img, 0, 0, img.width, img.height,
            centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
    }

    async batchGenerate() {
        const btn = document.getElementById('generateBtn');
        const originalText = btn.textContent;
        const customPrompt = document.getElementById('customPrompt').value.trim();

        const pairCount = Math.min(this.modelImages.length, this.garmentImages.length);

        if (pairCount === 0) {
            alert('Please upload at least one muse and one garment.');
            return;
        }

        btn.textContent = 'CREATING...';
        btn.disabled = true;

        const resultsSection = document.getElementById('resultsSection');
        const resultsGrid = document.getElementById('resultsGrid');
        resultsGrid.innerHTML = '';
        resultsSection.style.display = 'block';

        try {
            if (this.outputType === 'photo') {
                // Create ONE group photo with all muses and garments
                const payload = await this.veoService.prepareGroupPayload(
                    this.modelImages.slice(0, pairCount),
                    this.garmentImages.slice(0, pairCount),
                    customPrompt,
                    'photo'
                );

                const result = await this.veoService.generate(payload);

                if (result.success && result.data) {
                    this.displayResultOnCanvas(result.data, 'photo');
                    this.addResultCard(result.data, 'Group Photo', 'photo');
                }
            } else {
                // Create ONE group video with all muses and garments
                const videoPayload = await this.veoService.prepareGroupPayload(
                    this.modelImages.slice(0, pairCount),
                    this.garmentImages.slice(0, pairCount),
                    customPrompt,
                    'video'
                );

                const videoResult = await this.veoService.generateVideo(videoPayload);

                if (videoResult.success && videoResult.data) {
                    this.displayResultOnCanvas(videoResult.data, 'video');
                    this.addResultCard(videoResult.data, 'Group Video', 'video');
                }
            }
        } catch (error) {
            console.error('Generation failed:', error);
            alert('Generation failed. Check console for details.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    displayResultOnCanvas(data, type) {
        // Extract media data from API response
        let mediaData = null;
        let mimeType = null;

        if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        mediaData = part.inlineData.data;
                        mimeType = part.inlineData.mimeType;
                        break;
                    }
                }
            }
        }

        if (!mediaData) return;

        const container = this.canvas.parentElement;

        if (type === 'video') {
            // Replace canvas with video element
            this.canvas.style.display = 'none';

            let video = container.querySelector('video');
            if (!video) {
                video = document.createElement('video');
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'contain';
                container.appendChild(video);
            }

            video.src = `data:${mimeType};base64,${mediaData}`;
        } else {
            // Display image on canvas
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.drawImageScaled(img);

                // Flash effect
                this.canvas.style.filter = 'brightness(1.3)';
                setTimeout(() => this.canvas.style.filter = 'none', 300);
            };
            img.src = `data:${mimeType};base64,${mediaData}`;
        }
    }

    addResultCard(data, label, type) {
        const resultsGrid = document.getElementById('resultsGrid');
        const card = document.createElement('div');
        card.className = 'result-card';

        let mediaData = null;
        let mimeType = null;

        if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        mediaData = part.inlineData.data;
                        mimeType = part.inlineData.mimeType;
                        break;
                    }
                }
            }
        }

        if (type === 'video' && mediaData) {
            card.innerHTML = `
                <video controls autoplay loop style="width: 100%; height: 300px; object-fit: cover;">
                    <source src="data:${mimeType};base64,${mediaData}" type="${mimeType}">
                </video>
                <div class="result-info">
                    <div class="result-label">${label}</div>
                    <div class="result-actions">
                        <button class="result-btn" onclick="window.atelierApp.downloadMedia('data:${mimeType};base64,${mediaData}', 'group_video.mp4')">Download</button>
                    </div>
                </div>
            `;
        } else if (mediaData) {
            const imageUrl = `data:${mimeType};base64,${mediaData}`;
            card.innerHTML = `
                <img src="${imageUrl}" alt="${label}">
                <div class="result-info">
                    <div class="result-label">${label}</div>
                    <div class="result-actions">
                        <button class="result-btn" onclick="window.atelierApp.downloadMedia('${imageUrl}', 'group_photo.png')">Download</button>
                    </div>
                </div>
            `;
        } else {
            // Fallback for no media data
            card.innerHTML = `
                <div style="height: 300px; display: flex; align-items: center; justify-content: center; background: #f0f0f0;">
                    <p style="color: #888;">No media generated for ${label}</p>
                </div>
                <div class="result-info">
                    <div class="result-label">${label} - No Media</div>
                </div>
            `;
        }

        resultsGrid.appendChild(card);
    }

    addErrorCard(pairNumber) {
        const resultsGrid = document.getElementById('resultsGrid');
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <div style="height: 300px; display: flex; align-items: center; justify-content: center; background: rgba(255,0,0,0.1);">
                <p style="color: #ff6b6b;">Failed to generate Look ${pairNumber}</p>
            </div>
            <div class="result-info">
                <div class="result-label">Look ${pairNumber} - Error</div>
            </div>
        `;
        resultsGrid.appendChild(card);
    }

    downloadMedia(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.click();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.atelierApp = new Atelier();
});
