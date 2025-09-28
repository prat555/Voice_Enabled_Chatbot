const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// In-memory histories keyed by chatId (persists per process/lambda instance)
// Using Map for safer key handling; fallback key 'default' for backward compatibility
const chatHistories = new Map();
const DEFAULT_CHAT_ID = 'default';
const MAX_HISTORY_LENGTH = 20; // per chat

class GeminiChatbot {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is required in environment variables');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { temperature: 0.7 },
        });
        this.maxHistoryLength = MAX_HISTORY_LENGTH;
    }

    // Utility: get or create a chat history array for given chatId
    getHistory(chatId) {
        const id = (chatId && typeof chatId === 'string' && chatId.trim()) ? chatId.trim() : DEFAULT_CHAT_ID;
        if (!chatHistories.has(id)) chatHistories.set(id, []);
        return { id, history: chatHistories.get(id) };
    }

    // Generate model response with per-chat memory
    async generateResponse(userMessage, chatId) {
        try {
            const { id, history } = this.getHistory(chatId);

            // Add user message
            history.push({ role: 'user', content: userMessage, timestamp: new Date().toISOString() });

            // Build context from recent history (excluding the just-added user message)
            const conversationContext = this.buildConversationContext(history);

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

            text = this.postProcess(text);

            // Add assistant message
            history.push({ role: 'assistant', content: text, timestamp: new Date().toISOString() });

            // Trim per-chat history
            this.trimHistory(id);

            return { success: true, response: text, timestamp: new Date().toISOString() };
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
            return { success: false, error: errorMessage, timestamp: new Date().toISOString() };
        }
    }

    postProcess(text) {
        let t = (text || '').trim();
        t = t.replace(/^(okay|ok|alright|sure)[,\s:;-]*/i, '').trim();
        t = t.replace(/\n{3,}/g, '\n\n').trim();
        return t;
    }

    // Build conversation context for the AI from a history array
    buildConversationContext(historyArr) {
        const h = Array.isArray(historyArr) ? historyArr : [];
        if (h.length === 0) return 'No previous conversation.';
        const contextMessages = h.slice(-11, -1); // Last 10 before current
        if (contextMessages.length === 0) return 'No previous conversation.';
        return contextMessages.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            return `${role}: ${msg.content}`;
        }).join('\n');
    }

    // Trim a specific chat's history
    trimHistory(chatId) {
        const { id, history } = this.getHistory(chatId);
        if (history.length > this.maxHistoryLength) {
            const trimmed = history.slice(-this.maxHistoryLength);
            chatHistories.set(id, trimmed);
        }
    }

    // Clear a specific chat; if no chatId provided and options.all === true, clears all
    clearHistory(chatId, options = {}) {
        if (options.all === true && (!chatId || chatId === DEFAULT_CHAT_ID)) {
            chatHistories.clear();
            return { success: true, message: 'All chats cleared', count: 0 };
        }
        const { id } = this.getHistory(chatId);
        chatHistories.set(id, []);
        return { success: true, message: 'Chat history cleared', count: 0 };
    }

    // Get current chat history for a chatId (or default)
    getChatHistory(chatId) {
        const { id, history } = this.getHistory(chatId);
        return { success: true, history, count: history.length, chatId: id };
    }
}

module.exports = GeminiChatbot;