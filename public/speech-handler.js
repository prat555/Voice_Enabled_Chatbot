// Speech Recognition and Text-to-Speech Handler
class SpeechHandler {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isProcessing = false;
        this.continuousMode = false;
        this.autoSpeak = true;
        this.voiceConfig = {
            voiceURI: null,
            rate: 0.9,
            pitch: 1.0,
            volume: 0.8,
        };
        
        this.initializeSpeechRecognition();
        this.checkSpeechSupport();

        // Ensure voices are loaded
        if (this.synthesis) {
            this.synthesis.onvoiceschanged = () => {
                // no-op, but triggers getVoices availability in some browsers
                this.getVoices();
            };
        }
    }

    initializeSpeechRecognition() {
        // Check for speech recognition support
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            // Configure recognition settings
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;

            this.setupRecognitionEvents();
        }
    }

    setupRecognitionEvents() {
        if (!this.recognition) return;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceStatus('Listening... Speak now');
            this.updateMicButtonState('listening');
            console.log('Speech recognition started');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Show interim results in the input field
            if (interimTranscript) {
                this.updateVoiceStatus(`Listening: "${interimTranscript}"`);
            }

            // Process final result
            if (finalTranscript) {
                console.log('Final transcript:', finalTranscript);
                this.onSpeechResult(finalTranscript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.updateMicButtonState('ready');
            
            let errorMessage = 'Speech recognition error';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'No microphone found. Please check your microphone.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                case 'language-not-supported':
                    errorMessage = 'Language not supported.';
                    break;
                default:
                    errorMessage = `Speech recognition error: ${event.error}`;
            }
            
            this.updateVoiceStatus(errorMessage);
            setTimeout(() => {
                this.updateVoiceStatus('Ready to listen');
            }, 3000);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateMicButtonState('ready');
            
            if (this.continuousMode && !this.isProcessing) {
                // Restart listening in continuous mode
                setTimeout(() => {
                    this.startListening();
                }, 1000);
            } else {
                this.updateVoiceStatus('Ready to listen');
            }
            
            console.log('Speech recognition ended');
        };
    }

    startListening() {
        if (!this.recognition) {
            this.updateVoiceStatus('Speech recognition not supported');
            return false;
        }

        if (this.isListening) {
            this.stopListening();
            return false;
        }

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            this.updateVoiceStatus('Failed to start listening');
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.updateMicButtonState('ready');
            this.updateVoiceStatus('Stopped listening');
        }
    }

    speakText(text) {
        if (!this.synthesis) {
            console.warn('Speech synthesis not supported');
            return false;
        }

        if (!this.autoSpeak) {
            return false;
        }

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        // Configure voice settings
        utterance.rate = this.voiceConfig.rate ?? 0.9;
        utterance.pitch = this.voiceConfig.pitch ?? 1.0;
        utterance.volume = this.voiceConfig.volume ?? 0.8;

        // Voice selection
        const voices = this.getVoices();
        let selected = null;
        if (this.voiceConfig.voiceURI) {
            selected = voices.find(v => v.voiceURI === this.voiceConfig.voiceURI) || null;
        }
        if (!selected) {
            selected = voices.find(voice => voice.name.includes('Google'))
                || voices.find(voice => voice.name.includes('Microsoft'))
                || voices.find(voice => voice.lang.includes('en'))
                || null;
        }
        if (selected) utterance.voice = selected;

        utterance.onstart = () => {
            console.log('Started speaking');
            this.updateVoiceStatus('Speaking...');
        };

        utterance.onend = () => {
            console.log('Finished speaking');
            this.updateVoiceStatus('Ready to listen');
            
            // Resume listening in continuous mode
            if (this.continuousMode) {
                setTimeout(() => {
                    this.startListening();
                }, 500);
            }
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.updateVoiceStatus('Speech error');
        };

        this.synthesis.speak(utterance);
        return true;
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    setContinuousMode(enabled) {
        this.continuousMode = enabled;
        console.log('Continuous mode:', enabled);
        
        if (enabled) {
            this.updateVoiceStatus('Continuous listening enabled');
            // Start listening if not already
            if (!this.isListening) {
                setTimeout(() => this.startListening(), 1000);
            }
        } else {
            this.updateVoiceStatus('Continuous listening disabled');
            this.stopListening();
        }
    }

    setAutoSpeak(enabled) {
        this.autoSpeak = enabled;
        console.log('Auto-speak:', enabled);
        
        if (!enabled) {
            this.stopSpeaking();
        }
    }

    setSpeechConfig(cfg = {}) {
        this.voiceConfig = {
            voiceURI: cfg.voiceURI ?? this.voiceConfig.voiceURI,
            rate: cfg.rate ?? this.voiceConfig.rate,
            pitch: cfg.pitch ?? this.voiceConfig.pitch,
            volume: cfg.volume ?? this.voiceConfig.volume,
        };
    }

    getVoices() {
        if (!this.synthesis) return [];
        return this.synthesis.getVoices() || [];
    }

    checkSpeechSupport() {
        const speechSupport = document.getElementById('speechSupport');
        
        const hasRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        const hasSynthesis = 'speechSynthesis' in window;
        
        if (hasRecognition && hasSynthesis) {
            speechSupport.innerHTML = '<i class="fas fa-microphone"></i> Speech: Fully Supported';
            speechSupport.className = 'speech-support supported';
        } else if (hasRecognition || hasSynthesis) {
            speechSupport.innerHTML = '<i class="fas fa-microphone-slash"></i> Speech: Partially Supported';
            speechSupport.className = 'speech-support partial';
        } else {
            speechSupport.innerHTML = '<i class="fas fa-microphone-slash"></i> Speech: Not Supported';
            speechSupport.className = 'speech-support not-supported';
        }

        return { recognition: hasRecognition, synthesis: hasSynthesis };
    }

    updateVoiceStatus(message) {
        const statusElement = document.getElementById('voiceStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    updateMicButtonState(state) {
        const micButton = document.getElementById('micButton');
        if (!micButton) return;

        // Remove all state classes
        micButton.classList.remove('listening', 'processing');

        switch (state) {
            case 'listening':
                micButton.classList.add('listening');
                micButton.innerHTML = '<i class="fas fa-microphone"></i>';
                break;
            case 'processing':
                micButton.classList.add('processing');
                micButton.innerHTML = '<i class="fas fa-cog"></i>';
                this.isProcessing = true;
                break;
            case 'ready':
            default:
                micButton.innerHTML = '<i class="fas fa-microphone"></i>';
                this.isProcessing = false;
                break;
        }
    }

    // Callback for when speech result is received
    onSpeechResult(transcript) {
        // This will be overridden by the main app
        console.log('Speech result:', transcript);
    }
}