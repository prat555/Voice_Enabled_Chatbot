// Simple in-memory chat history for this demo
// Note: This won't persist across serverless function calls
// For production, use a database like Redis or PostgreSQL

let chatHistory = [];

export default function handler(req, res) {
  if (req.method === 'POST') {
    // Clear history
    chatHistory = [];
    res.json({
      success: true,
      message: 'Chat history cleared'
    });
  } else if (req.method === 'GET') {
    // Return empty history to enforce stateless behavior
    res.json({
      success: true,
      history: []
    });
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}