const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🤖 Voice-enabled chatbot server is running on port ${PORT}`);
    console.log(`📱 Open your browser and go to: http://localhost:${PORT}`);
    console.log(`🔑 Using Gemini API key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
});

module.exports = app;