const https = require('https');
require('dotenv').config();


const API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.error('Error: GOOGLE_GENAI_API_KEY is not set in .env or environment variables.');
    console.error('Try running: GOOGLE_GENAI_API_KEY=your_key node scripts/list-models.cjs');
    process.exit(1);
}

function listModels() {
    console.log('Fetching available models from Google Generative AI API...');

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    https.get(url, (res) => {
        let data = '';

        if (res.statusCode !== 200) {
            console.error(`API request failed with status ${res.statusCode}: ${res.statusMessage}`);
            res.resume(); // consume response data to free up memory
            return;
        }

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const parsedData = JSON.parse(data);

                if (!parsedData.models) {
                    console.log('No models found in the response.');
                    return;
                }

                console.log('\nAvailable Models:');
                console.log('-----------------');

                // Filter and sort for clarity
                const models = parsedData.models
                    .filter(m => m.name.includes('gemini'))
                    .sort((a, b) => b.name.localeCompare(a.name));

                models.forEach((model) => {
                    console.log(`\nName: ${model.name}`); // e.g. "models/gemini-1.5-flash"
                    console.log(`DisplayName: ${model.displayName}`);
                    console.log(`Version: ${model.version}`);
                    console.log(`Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
                    console.log(`Input Token Limit: ${model.inputTokenLimit}`);
                    console.log(`Output Token Limit: ${model.outputTokenLimit}`);
                });

                console.log('\n-----------------');
                console.log('Tip: Use the "Name" (without "models/" prefix) in your Genkit configuration.');

            } catch (e) {
                console.error('Error parsing response:', e.message);
            }
        });

    }).on('error', (e) => {
        console.error('Got error:', e.message);
    });
}

listModels();
