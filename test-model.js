const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testModel() {
    try {
        console.log('Testing API key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        console.log('\nTesting model: gemini-2.5-flash');
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Hello, this is a test message. Please respond with 'Success!'");
        const response = await result.response;
        console.log('✅ gemini-2.5-flash works!');
        console.log('Response:', response.text());
        
    } catch (error) {
        console.error('❌ Error testing model:', error.message);
    }
}

testModel();