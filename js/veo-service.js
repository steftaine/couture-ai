export class VeoService {
    constructor() {
        // Paste your API Key here (from Kie.ai or Google AI Studio)
        // For Kie.ai: https://kie.ai/api-keys
        // For Google AI Studio: https://aistudio.google.com/app/apikey

        // IMPORTANT: Wrap the key in quotes - it must be a string!
        this.API_KEY = 'AIzaSyDx52eC3Et-nshL7YXZyLoRbRiQt8r-5mU';

        // Updated to use Gemini 3 Pro Image (Preview)
        this.MODEL = 'gemini-3-pro-image-preview';
    }

    /**
     * Prepares the JSON payload for Gemini 3 Pro Image API
     */
    async preparePayload(modelImage, garmentImage, fabric, pose, customPrompt = '') {
        const modelBase64 = await this.toBase64(modelImage);
        const garmentBase64 = await this.toBase64(garmentImage);

        // Build the base prompt with STRICT fidelity requirements
        let promptText = `Create a professional fashion photograph. CRITICAL: Preserve the person's face, body, skin tone, and ALL physical features from the first image EXACTLY as they appear - do not alter their nose, eyes, facial structure, or any feature. ONLY change their clothing to the garment shown in the second image. The garment must fit naturally with photorealistic quality, proper lighting, shadows, and proportions.`;

        // Add custom instructions if provided
        if (customPrompt) {
            promptText += ` ${customPrompt}`;
        }

        promptText += ` The person must look identical to their original photo - same face, same body, only wearing the new garment. FORMAT: Generate the image in a consistent 3:4 vertical aspect ratio, suitable for fashion photography.`;

        // Gemini 3 Pro Image format - requesting actual image generation
        return {
            contents: [{
                parts: [
                    {
                        text: promptText
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: modelBase64
                        }
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: garmentBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.4, // Lower temperature for more consistent, faithful results
                candidateCount: 1,
                maxOutputTokens: 8192,
            }
        };
    }

    /**
     * Prepares group composition payload (all people + all garments in ONE image/video)
     */
    async prepareGroupPayload(modelImages, garmentImages, customPrompt = '', type = 'photo') {
        const pairCount = Math.min(modelImages.length, garmentImages.length);

        // Convert all images to base64
        const allBase64Images = [];
        for (let i = 0; i < pairCount; i++) {
            allBase64Images.push(await this.toBase64(modelImages[i]));
            allBase64Images.push(await this.toBase64(garmentImages[i]));
        }

        // Build group composition prompt with STRICT fidelity requirements
        let promptText = type === 'photo'
            ? `Create a professional fashion group photograph showing ${pairCount} ${pairCount === 1 ? 'person' : 'people'}.`
            : `Create a professional fashion group video showing ${pairCount} ${pairCount === 1 ? 'person' : 'people'}.`;

        promptText += ` CRITICAL: For each person, preserve their face, body, skin tone, and ALL physical features from their source image EXACTLY - do not alter their nose, eyes, facial structure, or any feature. ONLY change their clothing to match their assigned garment (images are provided in pairs: person then garment).`;

        if (pairCount > 1) {
            promptText += ` Arrange all ${pairCount} people together in a cohesive group composition, like a fashion lookbook or runway lineup, maintaining each person's identical appearance to their source photo.`;
        }

        promptText += ` Ensure photorealistic quality with proper lighting, shadows, and proportions. Each person must look identical to their original photo - same face, same body, only wearing their new garment. FORMAT: Generate the image in a consistent 16:9 landscape aspect ratio (for groups) or 3:4 vertical (for single person), suitable for fashion photography.`;

        if (customPrompt) {
            promptText += ` ${customPrompt}`;
        }

        // Build parts array with all images
        const parts = [{ text: promptText }];

        for (let i = 0; i < pairCount; i++) {
            parts.push({
                inline_data: {
                    mime_type: "image/png",
                    data: allBase64Images[i * 2] // Person
                }
            });
            parts.push({
                inline_data: {
                    mime_type: "image/png",
                    data: allBase64Images[i * 2 + 1] // Garment
                }
            });
        }

        return {
            contents: [{ parts }],
            generationConfig: {
                temperature: 0.4, // Lower for consistency and fidelity
                candidateCount: 1,
                maxOutputTokens: 8192,
            }
        };
    }

    /**
     * Prepares payload for Veo 3.1 video generation
     */
    async prepareVideoPayload(modelImage, garmentImage, fabric, pose, customPrompt = '') {
        const modelBase64 = await this.toBase64(modelImage);
        const garmentBase64 = await this.toBase64(garmentImage);

        // Build the video generation prompt with fidelity requirements
        let promptText = `Create a professional fashion video. CRITICAL: Preserve the person's face, body, skin tone, and ALL physical features from the first image EXACTLY throughout the entire video - do not alter their nose, eyes, facial structure, or any feature. ONLY change their clothing to the garment from the second image. Show realistic texture and natural motion. Cinematic quality with smooth camera work. The person must look identical to their original photo throughout.`;

        if (customPrompt) {
            promptText += ` ${customPrompt}`;
        }

        return {
            contents: [{
                parts: [
                    {
                        text: promptText
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: modelBase64
                        }
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: garmentBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.8,
                candidateCount: 1,
            }
        };
    }

    /**
     * Calls Veo 3.1 for video generation
     */
    async generateVideo(payload) {
        console.log('[VEO 3.1] Sending Video Payload:', payload);

        // 1. Check if API Key is present
        if (!this.API_KEY || this.API_KEY === 'null') {
            console.warn('[VEO 3.1] No API Key found. Running in Simulation Mode.');
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { success: true, message: "VEO 3.1 video generation complete (Simulation)" };
        }

        // 2. Real API Call to Veo 3.1
        const videoModel = 'veo-3.1-001'; // Veo 3.1 video model
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${videoModel}:generateContent?key=${this.API_KEY}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // If 404 or other error, fallback to simulation for demo purposes
                console.warn('[VEO 3.1] API Error, falling back to simulation:', response.status);
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            console.log('[VEO 3.1] Video API Response:', data);

            return {
                success: true,
                message: "VEO 3.1 video generation complete",
                data: data
            };
        } catch (error) {
            console.error('[VEO 3.1] Video API Call Failed:', error);

            // Fallback to simulation if API fails (e.g. model not found)
            console.log('Falling back to simulation mode...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return {
                success: true,
                message: "VEO 3.1 video generation complete (Simulation)",
                // Return a mock video response structure if needed, or just success: true
                // For now, we'll let the app handle the missing data gracefully or we could provide a placeholder
                data: {
                    candidates: [{
                        content: {
                            parts: [{
                                inlineData: {
                                    mimeType: "video/mp4",
                                    data: "" // Empty data will trigger fallback UI
                                }
                            }]
                        }
                    }]
                }
            };
        }
    }

    /**
     * Helper: Convert Image to Base64 with resizing to reduce context size
     */
    toBase64(img) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');

            // Resize to max 768px on longest side to support 8+ people
            const maxSize = 768;
            let width = img.naturalWidth;
            let height = img.naturalHeight;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                } else {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Use JPEG with 0.7 quality for better compression (supports 8+ people)
            resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
        });
    }

    /**
     * Calls Google Gemini API
     */
    async generate(payload) {
        console.log('[VEO 3.1] Sending Payload:', payload);

        // 1. Check if API Key is present
        if (!this.API_KEY || this.API_KEY === 'null') {
            console.warn('[VEO 3.1] No API Key found. Running in Simulation Mode.');

            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            return {
                success: true,
                message: "VEO 3.1 generation complete (Simulation)"
            };
        }

        // 2. Real API Call
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${this.API_KEY}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const data = await response.json();
            console.log('[VEO 3.1] API Response:', data);

            return {
                success: true,
                message: "VEO 3.1 generation complete",
                data: data
            };
        } catch (error) {
            console.error('[VEO 3.1] API Call Failed:', error);
            throw error;
        }
    }
}
