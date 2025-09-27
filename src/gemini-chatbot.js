const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiChatbot {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is required in environment variables');
        }
        
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        this.chatHistory = [];
    }

    async generateResponse(userMessage) {
        try {
            // Add user message to history
            this.chatHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date().toISOString()
            });

            // Create context from chat history for better continuity
            const context = this.chatHistory.slice(-10).map(msg => 
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n');

            const prompt = `${context}\nUser: ${userMessage}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Add assistant response to history
            this.chatHistory.push({
                role: 'assistant',
                content: text,
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                response: text,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error generating response:', error);
            
            let errorMessage = 'Sorry, I encountered an error processing your request.';
            
            if (error.message.includes('API_KEY_INVALID')) {
                errorMessage = 'Invalid API key. Please check your Gemini API key configuration.';
            } else if (error.message.includes('QUOTA_EXCEEDED')) {
                errorMessage = 'API quota exceeded. Please try again later.';
            } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
                errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
            }

            return {
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            };
        }
    }

    clearHistory() {
        this.chatHistory = [];
        return { success: true, message: 'Chat history cleared' };
    }

    getChatHistory() {
        return {
            success: true,
            history: this.chatHistory,
            count: this.chatHistory.length
        };
    }
}

module.exports = GeminiChatbot;