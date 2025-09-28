const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiChatbot {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is required in environment variables');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Slight temperature to encourage varied phrasing while staying relevant
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { temperature: 0.7 }
        });
    }

    // Stateless: does not store or reuse any per-user message history
    async generateResponse(userMessage) {
        try {
            const instruction = [
                'You are a helpful assistant. Follow these rules strictly:',
                '- Treat each message independently. Do not reference earlier messages or claim the user asked this again.',
                "- Never say things like 'you asked this again' or imply repetition.",
                "- Do not start your reply with 'Okay', 'Ok', 'Alright', or 'Sure'.",
                '- Vary your opening phrasing naturally; you may start directly with the answer.',
                '- Use concise, clear language and format with Markdown when helpful.'
            ].join('\n');

            const prompt = `${instruction}\n\nUser: ${userMessage}\nAssistant:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text() || '';

            // Post-process to ensure we never start with common fillers like "Okay"
            text = this.postProcess(text);

            return {
                success: true,
                response: text,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error generating response:', error);

            let errorMessage = 'Sorry, I encountered an error processing your request.';

            if (error?.message?.includes('API_KEY_INVALID')) {
                errorMessage = 'Invalid API key. Please check your Gemini API key configuration.';
            } else if (error?.message?.includes('QUOTA_EXCEEDED')) {
                errorMessage = 'API quota exceeded. Please try again later.';
            } else if (error?.message?.includes('RATE_LIMIT_EXCEEDED')) {
                errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
            }

            return {
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            };
        }
    }

    postProcess(text) {
        let t = (text || '').trim();
        // Remove common opener fillers if present at the very start
        t = t.replace(/^(okay|ok|alright|sure)[,\s:;-]*/i, '').trim();
        // Collapse excessive blank lines
        t = t.replace(/\n{3,}/g, '\n\n').trim();
        return t;
    }

    // Kept for API compatibility; no state is stored
    clearHistory() {
        return { success: true, message: 'Chat memory is disabled and cleared' };
    }

    getChatHistory() {
        return { success: true, history: [], count: 0 };
    }
}

module.exports = GeminiChatbot;