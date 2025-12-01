
const API_KEY = 'AIzaSyB4TuPnNrTG_5leA6msgcR8AByeLlBwI_4';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(model => {
                if (model.name.includes('veo') || model.name.includes('gemini') || model.name.includes('video')) {
                    console.log(`- ${model.name} (${model.version}) - ${model.displayName}`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
