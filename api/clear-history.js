// Clear chat history endpoint with actual conversation clearing
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Import the chatbot to clear history
      const { default: GeminiChatbot } = await import('../src/gemini-chatbot.js');
      const chatbot = new GeminiChatbot();
      const { chatId, all } = req.body || {};
      // Clear the conversation history (specific chat or all when all === true)
      const result = chatbot.clearHistory(chatId, { all: all === true });
      
      return res.json({
        success: true,
        message: 'Chat history cleared',
        count: result.count
      });
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to clear chat history' 
      });
    }
  } else if (req.method === 'GET') {
    try {
      // Import the chatbot to get current history
      const { default: GeminiChatbot } = await import('../src/gemini-chatbot.js');
      const chatbot = new GeminiChatbot();
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
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}