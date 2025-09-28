# Voice-Enabled Chatbot 🤖🎤

A modern, voice-enabled chatbot powered by Google Gemini with speech recognition and text-to-speech (TTS). Use your voice or type in a sleek, responsive UI with dark mode, quick suggestions, and customizable voice settings.

## Features ✨

- Voice input with the Web Speech API (SpeechRecognition)
- Voice output via TTS with adjustable voice/rate/pitch/volume
- Theme toggle (light/dark) with persistence
- Typing indicator while the model thinks
- Quick suggestion chips to jumpstart prompts
- Copy-to-clipboard on assistant messages (hover top-right)
- Scroll-to-bottom floating button for long chats
- Continuous listening and auto-speak controls
- Connection and speech support indicators
- Input validation and error handling throughout

## Prerequisites 📋

- Node.js 16+ (Node 18+ recommended)
- npm (bundled with Node.js)
- A Google Gemini API key (create one in Google AI Studio)
- A modern browser (best: Chrome/Edge; partial: Safari/Firefox)

## Quick Start 🚀

1) Install dependencies
```bash
npm install
```

2) Configure environment
Create a file named `.env` in the project root:
```
GEMINI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development
```

3) Start the server
```bash
npm start
```

4) Open the app
- Visit http://localhost:3000
- Allow microphone access when prompted

## Using the App 📖

- Mic button: start/stop listening
- Stop button: immediately stop speaking
- Send button or Enter: send typed message
- Auto-speak: automatically speak assistant replies
- Continuous listening: resumes listening after responses
- Theme toggle: switch light/dark; saved to localStorage
- Settings (gear): pick a TTS voice and adjust rate/pitch/volume
- Copy icon on assistant bubbles: copy the response text

## Model Configuration 🤖

By default, the app uses:

- Model: `gemini-2.5-flash`

You can change the model by editing `src/gemini-chatbot.js`:
```js
// src/gemini-chatbot.js
this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
```
Depending on your API key access, other valid options may include (subject to availability):

- `gemini-2.5-pro`
- `gemini-flash-latest`
- `gemini-pro-latest`

Tip: If you see a 404 for a model, list available models using the REST API:
```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

## API Endpoints 🔌

```
POST /api/chat           # { message: string }
POST /api/clear-history  # clears in-memory history
GET  /api/history        # returns in-memory history
GET  /api/health         # health/status info
```

## Project Structure 📁

```
voice_enabled_chatbot/
├── .env                     # Environment variables (not checked in)
├── .gitignore               # Includes .env, node_modules, etc.
├── package.json             # Scripts and deps
├── README.md                # This file
├── src/
│   ├── server.js            # Express server + CSP
│   └── gemini-chatbot.js    # Gemini API wrapper
└── public/
    ├── index.html           # UI skeleton + modals
    ├── styles.css           # Theming, layout, animations
    ├── app.js               # Frontend logic & UI state
    └── speech-handler.js    # Speech recognition & synthesis
```

## Configuration ⚙️

Environment variables (in `.env`):

- `GEMINI_API_KEY` (required): your Google Gemini API key
- `PORT` (optional): server port (default used here: 3000)
- `NODE_ENV` (optional): `development` or `production`

Speech settings can be changed live in the Settings modal (saved to localStorage). Recognition language is set in `public/speech-handler.js` via:
```js
this.recognition.lang = 'en-US';
```

## Browser Compatibility 🌐

Speech Recognition:
- ✅ Chrome/Chromium, Edge
- ⚠️ Safari/Firefox: partial/behind flags

Text-to-Speech:
- ✅ All modern browsers (voice list depends on OS/browser)

## Troubleshooting 🔧

- 404 model not found: Use a valid model (e.g., `gemini-2.5-flash`) available to your key.
- Port already in use: change `PORT` in `.env`.
- Mic blocked: allow microphone access in the address bar and refresh.
- Speech not supported: try Chrome/Edge or ensure site is served over HTTP(S).
- Icons not visible: CSP allows cdnjs; ensure internet access to the CDN.

## Security 🔒

- Keep `.env` out of version control (already in `.gitignore`).
- Never hardcode API keys in source files or the README.
- Use HTTPS in production (required for some browser APIs and good practice).

## Acknowledgments 🙏

- Google Gemini for AI capabilities
- Web Speech API for recognition and TTS
- Express.js for the server
- Font Awesome for icons (via cdnjs)

---

Happy chatting! 🎉