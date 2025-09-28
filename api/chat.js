// Serverless /api/chat endpoint for Vercel
// Mirrors the logic from the Express route in src/app.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Lazy-load the chatbot to keep cold start small and support CJS module
    const { default: GeminiChatbot } = await import('../src/gemini-chatbot.js');
    const chatbot = new GeminiChatbot();

    const { message } = req.body || {};

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
    // result already has { success, response | error, timestamp }
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Chat API (serverless) error:', error);
    // Common cause on Vercel is missing env var
    const hint = process.env.GEMINI_API_KEY ? undefined : 'GEMINI_API_KEY is not configured in Vercel Environment Variables';
    return res.status(500).json({ success: false, error: 'Internal server error', hint });
  }
}
