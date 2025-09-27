# Voice-Enabled Chatbot 🤖🎤

A modern, voice-enabled chatbot powered by Google's Gemini Pro API with speech recognition and text-to-speech capabilities. Chat using your voice or text input with a beautiful, responsive web interface.

## Features ✨

- **Voice Input**: Speak to the chatbot using Web Speech API
- **Voice Output**: Hear responses with text-to-speech synthesis
- **Text Chat**: Traditional text input and output
- **Continuous Listening**: Optional always-on voice recognition
- **Chat History**: Persistent conversation memory
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Status**: Connection and speech support indicators
- **Error Handling**: Comprehensive error management and user feedback

## Prerequisites 📋

- **Node.js** (version 16.0.0 or higher)
- **npm** (comes with Node.js)
- **Google Gemini Pro API Key** (get it from [Google AI Studio](https://makersuite.google.com/app/apikey))
- **Modern Web Browser** with speech recognition support (Chrome, Edge, Safari, Firefox)

## Installation 🚀

1. **Clone or download this repository**
   ```bash
   cd voice_enabled_chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   - The `.env` file is already created with your API key
   - Your Gemini API key is: `AIzaSyDLGqENObFSBHAXlG3ljuWg9dRz4Vapnd4`

4. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Allow microphone access when prompted

## Usage Guide 📖

### Voice Interaction
1. **Click the microphone button** 🎤 to start voice recognition
2. **Speak clearly** into your microphone
3. The bot will process your speech and respond both in text and voice
4. **Toggle continuous listening** for hands-free conversation

### Text Interaction
1. **Type your message** in the text input field
2. **Press Enter** or click the send button ➤
3. The bot will respond in text (and voice if auto-speak is enabled)

### Controls
- **🎤 Microphone Button**: Click to toggle voice recognition
- **➤ Send Button**: Send typed messages
- **🗑️ Clear Chat**: Clear conversation history
- **🔊 Auto-speak**: Toggle automatic voice responses
- **🎙️ Continuous Listening**: Enable always-on voice recognition

## Browser Compatibility 🌐

### Speech Recognition Support
- ✅ **Chrome/Chromium** (full support)
- ✅ **Microsoft Edge** (full support)
- ✅ **Safari** (limited support)
- ⚠️ **Firefox** (limited support)

### Text-to-Speech Support
- ✅ **All modern browsers** support text-to-speech

## API Endpoints 🔌

### Chat API
```
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?"
}
```

### Clear History
```
POST /api/clear-history
```

### Get History
```
GET /api/history
```

### Health Check
```
GET /api/health
```

## Project Structure 📁

```
voice_enabled_chatbot/
├── .env                    # Environment variables (API key)
├── .gitignore             # Git ignore rules
├── package.json           # Project dependencies and scripts
├── README.md             # This file
├── src/
│   ├── server.js         # Express.js server
│   └── gemini-chatbot.js # Gemini API integration
└── public/
    ├── index.html        # Main web interface
    ├── styles.css        # Styling and animations
    ├── app.js           # Main application logic
    └── speech-handler.js # Speech recognition & TTS
```

## Configuration ⚙️

### Environment Variables
- `GEMINI_API_KEY`: Your Google Gemini Pro API key
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Speech Settings
You can modify speech settings in `public/speech-handler.js`:
- **Language**: Change `this.recognition.lang = 'en-US'`
- **Voice Rate**: Modify `utterance.rate = 0.9`
- **Voice Pitch**: Adjust `utterance.pitch = 1.0`
- **Voice Volume**: Set `utterance.volume = 0.8`

## Troubleshooting 🔧

### Common Issues

1. **"Speech recognition not supported"**
   - Use Chrome, Edge, or Safari
   - Ensure HTTPS (required for speech APIs)
   - Check browser permissions for microphone

2. **"Microphone access denied"**
   - Click the microphone icon in address bar
   - Allow microphone access
   - Refresh the page

3. **"API key invalid"**
   - Check your `.env` file
   - Verify the API key is correct
   - Ensure no extra spaces in the key

4. **"Connection error"**
   - Check your internet connection
   - Verify the server is running on port 3000
   - Check firewall settings

5. **No voice output**
   - Check device volume
   - Ensure "Auto-speak responses" is enabled
   - Try different browsers

### Performance Tips

- **Use Chrome** for best speech recognition performance
- **Speak clearly** and at normal pace
- **Minimize background noise** for better recognition
- **Use headphones** to prevent feedback loops

## Development 🛠️

### Running in Development Mode
```bash
npm run dev
```
This uses `nodemon` for automatic server restarts when files change.

### Adding New Features
1. **Backend changes**: Modify files in `src/`
2. **Frontend changes**: Modify files in `public/`
3. **API changes**: Update endpoints in `src/server.js`

### Testing the API
```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Test health endpoint
curl http://localhost:3000/api/health
```

## Security Considerations 🔒

- API key is stored in `.env` file (not committed to git)
- HTTPS recommended for production (required for speech APIs)
- Input validation prevents malicious content
- Rate limiting can be added for production use
- CORS configured for security

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support 💬

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Ensure all prerequisites are met
4. Verify API key configuration

## Acknowledgments 🙏

- **Google Gemini Pro** for AI capabilities
- **Web Speech API** for voice recognition
- **Express.js** for server framework
- **Font Awesome** for icons

---

**Happy chatting! 🎉**