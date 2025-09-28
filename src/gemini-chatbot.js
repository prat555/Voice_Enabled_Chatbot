const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Shared conversation history across instances (for serverless environments)
let globalChatHistory = [];
const MAX_HISTORY_LENGTH = 20;

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
        
        // Use shared history for persistence across API calls
        this.chatHistory = globalChatHistory;
        this.maxHistoryLength = MAX_HISTORY_LENGTH;
    }

    // Now maintains conversation history for context
    async generateResponse(userMessage) {
        try {
            // Add user message to history
            this.chatHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date().toISOString()
            });

            // Build conversation context
            const conversationContext = this.buildConversationContext();
            
            const instruction = [
                'You are a helpful assistant. Follow these rules strictly:',
                '- You have access to our conversation history and can reference previous messages.',
                '- When the user says "this", "that", "it", or similar references, refer to the context provided.',
                '- If asked to summarize, analyze, or comment on something, look at the recent conversation for context.',
                "- Do not start your reply with 'Okay', 'Ok', 'Alright', or 'Sure'.",
                '- Use concise, clear language and format with Markdown when helpful.',
                '- Maintain conversation continuity and remember what was discussed.'
            ].join('\n');

            const prompt = `${instruction}\n\nConversation context:\n${conversationContext}\n\nUser: ${userMessage}\nAssistant:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text() || '';

            // Post-process to ensure we never start with common fillers like "Okay"
            text = this.postProcess(text);

            // Add assistant response to history
            this.chatHistory.push({
                role: 'assistant',
                content: text,
                timestamp: new Date().toISOString()
            });

            // Trim history if it gets too long
            this.trimHistory();

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

    // Build conversation context for the AI
    buildConversationContext() {
        if (this.chatHistory.length === 0) {
            return 'No previous conversation.';
        }

        // Get the last few messages for context (excluding the current user message we just added)
        const contextMessages = this.chatHistory.slice(-11, -1); // Last 10 messages before current
        
        if (contextMessages.length === 0) {
            return 'No previous conversation.';
        }

        return contextMessages.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            return `${role}: ${msg.content}`;
        }).join('\n');
    }

    // Keep history manageable
    trimHistory() {
        if (this.chatHistory.length > this.maxHistoryLength) {
            // Keep the most recent messages
            this.chatHistory = this.chatHistory.slice(-this.maxHistoryLength);
        }
    }

    // Clear history and return updated state
    clearHistory() {
        globalChatHistory.length = 0; // Clear the shared history
        this.chatHistory = globalChatHistory;
        return { success: true, message: 'Chat history cleared', count: 0 };
    }

    // Get current chat history
    getChatHistory() {
        return { 
            success: true, 
            history: this.chatHistory,
            count: this.chatHistory.length 
        };
    }
}

module.exports = GeminiChatbot;