// For compatibility with both Node.js versions and Netlify
const fetch = globalThis.fetch || require('node-fetch');

// Load environment variables from root directory
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// API Configuration
const API_KEY = process.env.OPENROUTER_API_KEY || process.env.NETLIFY_OPENROUTER_API_KEY;

// Model configurations
const MODELS = {
    // Models best suited for reasoning/problem solving
    reasoning: [
        'deepseek/deepseek-chat-v3-0324:free',
        'qwen/qwen3-235b-a22b:free',
        'meta-llama/llama-4-scout:free',
        'moonshotai/kimi-k2:free',
        'meta-llama/llama-4-maverick:free',
        'mistralai/mistral-small-3.1-24b-instruct:free'
    ],

    // Models specialized for coding tasks
    code: [
        'deepseek/deepseek-chat-v3-0324:free',
        'qwen/qwen3-coder:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemma-3-27b-it:free',
        'openai/gpt-oss-120b:free',
        'mistralai/mistral-small-3.1-24b-instruct:free'
    ],

    // General purpose conversational models
    general: [
        'minimax/minimax-m2:free',
        'z-ai/glm-4.5-air:free',
        'meta-llama/llama-4-maverick:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemini-2.0-flash-exp:free',
        'google/gemma-3-27b-it:free',
        'mistralai/mistral-small-3.1-24b-instruct:free',
        'openai/gpt-oss-120b:free',
        'moonshotai/kimi-k2:free',
        'deepseek/deepseek-chat-v3-0324:free',
        'qwen/qwen3-235b-a22b:free',
        'qwen/qwen3-coder:free',
        'meta-llama/llama-4-scout:free',
        'minimax/minimax-m2:free',
        'microsoft/mai-ds-r1:free'
    ],

    // Image-capable / multimodal models
    image: [
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'meta-llama/llama-4-maverick:free',
        'google/gemini-2.0-flash-exp:free'
    ]
};

// Model display names
const MODEL_DISPLAY_NAMES = {
    'google/gemini-2.0-flash-exp:free': 'Gemini 2.0 Flash',
    'google/gemma-3-27b-it:free': 'Gemma 3 27B',
    'mistralai/mistral-small-3.1-24b-instruct:free': 'Mistral Small 3.1',
    'mistralai/mistral-small-3.2-24b-instruct:free': 'Mistral Small 3.2',
    'meta-llama/llama-4-maverick:free': 'Llama 4 Maverick',
    'meta-llama/llama-4-scout:free': 'Llama 4 Scout',
    'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 70B Instruct',
    'deepseek/deepseek-chat-v3-0324:free': 'DeepSeek Chat v3',
    'deepseek/deepseek-r1-0528:free': 'DeepSeek R1',
    'qwen/qwen3-235b-a22b:free': 'Qwen3 235B',
    'qwen/qwen3-coder:free': 'Qwen3 Coder',
    'qwen/qwen-2.5-coder-32b-instruct:free': 'Qwen 2.5 Coder',
    'openai/gpt-oss-20b:free': 'GPT-OSS 120B',
    'minimax/minimax-m2:free': 'Minimax M2',
    'z-ai/glm-4.5-air:free': 'GLM-4.5 Air',
    'moonshotai/kimi-k2:free': 'Kimi K2',
    'nvidia/nemotron-nano-12b-v2-vl:free': 'Nemotron Nano 12B VL',
    'microsoft/mai-ds-r1:free': 'Microsoft MAI-DS R1'
};

// System prompts
const SYSTEM_PROMPTS = {
    general: 'You are Materio, a helpful and knowledgeable AI made by Materio. Always be accurate, helpful, and respectful. Format your responses clearly using markdown when appropriate. When generating LaTeX expressions, always wrap inline math with single dollar signs $...$ and display math with double dollar signs $$...$$, so that they render properly using KaTeX. Provide clear, accurate, and helpful responses. Be conversational and friendly while maintaining professionalism.',

    reasoning: 'You are Materio, a helpful and knowledgeable AI made by Materio. Always be accurate, helpful, and respectful. Format your responses clearly using markdown when appropriate. When generating LaTeX expressions, always wrap inline math with single dollar signs $...$ and display math with double dollar signs $$...$$, so that they render properly using KaTeX. You specialize in reasoning and problem-solving. Think step by step and provide detailed analysis. Break down complex problems into smaller parts and explain your reasoning process clearly.',

    code: 'You are Materio, a helpful and knowledgeable AI made by Materio. Always be accurate, helpful, and respectful. Format your responses clearly using markdown when appropriate. When generating LaTeX expressions, always wrap inline math with single dollar signs $...$ and display math with double dollar signs $$...$$, so that they render properly using KaTeX. You specialize in coding and programming. Provide clear, well-commented code solutions and explain technical concepts. Always include explanations for your code and suggest best practices.'
};

// Helper function to get preferred model for mode
function getPreferredModel(mode) {
    const modeModels = MODELS[mode] || MODELS.general;
    return modeModels[0];
}

// CORS headers helper
function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
}

// Vercel function handler
module.exports = async (req, res) => {
    const headers = getCorsHeaders();

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        Object.entries(headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        res.status(200).send('');
        return;
    }

    // In Vercel, req.url contains the full path including query params
    // Extract the path without query parameters
    const url = req.url || '';
    const urlPath = url.split('?')[0]; // Remove query string
    let path = '/';

    // Detect endpoint based on URL path
    // Handle both /api/v2/chat/models and /models formats
    if (urlPath.includes('/models') || urlPath.endsWith('/models')) {
        path = '/models';
    } else if (urlPath.includes('/health') || urlPath.endsWith('/health')) {
        path = '/health';
    }

    try {
        // Handle POST /chat endpoint (main chat completion)
        if (req.method === 'POST' && (path === '' || path === '/')) {
            const { message, mode = 'general', model, messages = [] } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            if (!API_KEY) {
                return res.status(500).json({
                    success: false,
                    error: 'API key not configured'
                });
            }

            // Determine which model to use
            const selectedModel = model || getPreferredModel(mode);

            // Get system prompt for the mode
            const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general;

            // Prepare messages for the API call
            const apiMessages = [
                {
                    role: 'system',
                    content: systemPrompt
                },
                ...messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                {
                    role: 'user',
                    content: message
                }
            ];

            // Call OpenRouter API
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': req.headers.referer || 'https://materioa.vercel.app',
                    'X-Title': 'Materio AI Chat'
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: apiMessages,
                    temperature: 0.7,
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            return res.status(200).json({
                success: true,
                response: data.choices[0].message.content,
                model: selectedModel,
                modelName: MODEL_DISPLAY_NAMES[selectedModel] || selectedModel
            });
        }

        // Handle GET /models endpoint
        if (req.method === 'GET' && path === '/models') {
            const allModels = [...new Set([...(MODELS.general || []), ...(MODELS.reasoning || []), ...(MODELS.code || []), ...(MODELS.image || [])])];
            const modelsWithNames = allModels.map(model => ({
                id: model,
                name: MODEL_DISPLAY_NAMES[model] || model
            }));

            return res.status(200).json({
                success: true,
                models: modelsWithNames,
                modelsByMode: MODELS
            });
        }

        // Handle GET /health endpoint
        if (req.method === 'GET' && path === '/health') {
            return res.status(200).json({
                success: true,
                message: 'Chat API is running',
                timestamp: new Date().toISOString(),
                apiConfigured: !!API_KEY
            });
        }

        // 404 for unknown endpoints
        return res.status(404).json({
            success: false,
            error: 'Endpoint not found'
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};
