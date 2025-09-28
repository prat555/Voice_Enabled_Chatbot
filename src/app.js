const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const GeminiChatbot = require('./gemini-chatbot');

// Create Express app without listening; export it for serverless and server
const app = express();

// Initialize the chatbot
const chatbot = new GeminiChatbot();

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:"],
            mediaSrc: ["'self'"],
        },
    },
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (for local dev; on Vercel we let static routes serve from /public)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, error: 'Message is required and must be a string' });
        }

        if (message.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Message cannot be empty' });
        }

        if (message.length > 1000) {
            return res.status(400).json({ success: false, error: 'Message too long. Maximum 1000 characters allowed.' });
        }

        const result = await chatbot.generateResponse(message.trim());
        res.json(result);
    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Clear chat history
app.post('/api/clear-history', (req, res) => {
    try {
        const result = chatbot.clearHistory();
        res.json(result);
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({ success: false, error: 'Failed to clear chat history' });
    }
});

// Get chat history
app.get('/api/history', (req, res) => {
    try {
        const result = chatbot.getChatHistory();
        res.json(result);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve chat history' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Note: No catch-all route here - Vercel handles static files and SPA routing via vercel.json

module.exports = app;
