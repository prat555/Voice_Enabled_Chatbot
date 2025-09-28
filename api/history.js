// Chat history endpoint with conversation memory
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    // Import the chatbot to access history
    const { default: GeminiChatbot } = await import('../src/gemini-chatbot.js');
    const chatbot = new GeminiChatbot();
    // Get the current chat history for optional chatId
    const { chatId } = req.query || {};
    const historyResult = chatbot.getChatHistory(chatId);
    
    return res.json({
      success: true,
      history: historyResult.history,
      count: historyResult.count
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve chat history',
      history: [],
      count: 0
    });
  }
}