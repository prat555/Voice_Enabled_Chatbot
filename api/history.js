// Simple chat history endpoint
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  // For serverless, we can't maintain state between calls
  // Return empty history for now
  res.json({
    success: true,
    history: []
  });
}