export default function handler(req, res) {
  // Simple health check without Express app dependencies
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    apiKeyConfigured: hasApiKey,
    environment: process.env.NODE_ENV || 'production'
  });
}