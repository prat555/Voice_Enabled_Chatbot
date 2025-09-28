// Main Application Logic
class VoiceChatbot {
    constructor() {
        this.speechHandler = new SpeechHandler();
        this.apiBaseUrl = '/api';
        this.isLoading = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSpeechHandler();
        this.checkServerConnection();
    }

    initializeElements() {
        this.elements = {
            chatMessages: document.getElementById('chatMessages'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            micButton: document.getElementById('micButton'),
            clearButton: document.getElementById('clearChat'),
            autoSpeakCheckbox: document.getElementById('autoSpeak'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            connectionStatus: document.getElementById('connectionStatus'),
            typingIndicator: document.getElementById('typingIndicator'),
            themeToggle: document.getElementById('themeToggle'),
            scrollBottomChat: document.getElementById('scrollBottomChat'),
            stopSpeaking: document.getElementById('stopSpeaking'),
            suggestions: document.getElementById('suggestions'),
            settingsButton: document.getElementById('settingsButton'),
            settingsModal: document.getElementById('settingsModal'),
            closeSettings: document.getElementById('closeSettings'),
            saveSettings: document.getElementById('saveSettings'),
            resetSettings: document.getElementById('resetSettings'),
            voiceSelect: document.getElementById('voiceSelect'),
            rateRange: document.getElementById('rateRange'),
            pitchRange: document.getElementById('pitchRange'),
            volumeRange: document.getElementById('volumeRange'),
            rateValue: document.getElementById('rateValue'),
            pitchValue: document.getElementById('pitchValue'),
            volumeValue: document.getElementById('volumeValue')
        };
    }

    setupEventListeners() {
        // Send message button
        this.elements.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Message input - Enter key to send
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Microphone button
        this.elements.micButton.addEventListener('click', () => {
            this.toggleSpeechRecognition();
        });

        // Clear chat button
        this.elements.clearButton.addEventListener('click', () => {
            this.clearChat();
        });

        // Stop speaking via mic toggle: handled by toggleSpeechRecognition and SpeechHandler

        // Auto-speak checkbox
        this.elements.autoSpeakCheckbox.addEventListener('change', (e) => {
            this.speechHandler.setAutoSpeak(e.target.checked);
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.speechHandler.stopListening();
            this.speechHandler.stopSpeaking();
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.speechHandler.stopListening();
                this.speechHandler.stopSpeaking();
            }
        });

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Chat controls
        this.elements.scrollBottomChat.addEventListener('click', () => this.scrollToBottom(true));
        this.elements.stopSpeaking.addEventListener('click', () => {
            this.speechHandler.stopSpeaking();
        });
        this.elements.chatMessages.addEventListener('scroll', () => this.updateScrollButton());

        // Suggestions
        this.elements.suggestions?.addEventListener('click', (e) => {
            const btn = e.target.closest('.chip');
            if (!btn) return;
            const text = btn.getAttribute('data-text');
            if (text) {
                this.elements.messageInput.value = text;
                this.sendMessage();
            }
        });

        // Settings modal
        this.elements.settingsButton.addEventListener('click', () => this.openSettings());
        this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
        this.elements.resetSettings.addEventListener('click', () => this.resetSettings());
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeSettings();
        });
    }

    setupSpeechHandler() {
        // Override the speech result callback
        this.speechHandler.onSpeechResult = (transcript) => {
            this.handleSpeechInput(transcript);
        };
    }

    handleSpeechInput(transcript) {
        if (!transcript || transcript.trim().length === 0) {
            return;
        }

        // Set the transcript in the input field
        this.elements.messageInput.value = transcript;
        
        // Automatically send the message
        this.sendMessage();
    }

    toggleSpeechRecognition() {
        if (this.speechHandler.isListening) {
            this.speechHandler.stopListening();
        } else {
            const success = this.speechHandler.startListening();
            if (!success) {
                this.showNotification('Speech recognition is not available or permission denied', 'error');
            }
        }
    }

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        
        if (!message || this.isLoading) {
            return;
        }

        if (message.length > 1000) {
            this.showNotification('Message too long. Maximum 1000 characters allowed.', 'error');
            return;
        }

        // Clear input and disable controls
        this.elements.messageInput.value = '';
        this.setLoadingState(true);
        this.speechHandler.stopListening();

    // Add user message to chat
    this.addMessage(message, 'user');
    this.showTyping(true);

        try {
            // Send message to API
            const response = await fetch(`${this.apiBaseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Add assistant response to chat
                this.addMessage(data.response, 'assistant');
                
                // Speak the response if auto-speak is enabled
                this.speechHandler.speakText(data.response);
            } else {
                throw new Error(data.error || 'Failed to get response from chatbot');
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.handleApiError(error);
        } finally {
            this.setLoadingState(false);
            this.showTyping(false);
        }
    }

    // Convert Markdown to HTML with comprehensive syntax support
    markdownToHtml(text) {
        // First, split into blocks (paragraphs separated by double newlines)
        const blocks = text.split(/\n\n+/).filter(block => block.trim());
        let html = '';
        
        for (let block of blocks) {
            block = block.trim();
            if (!block) continue;
            
            // Check for horizontal rules
            if (/^(---+|\*\*\*+|___+)\s*$/.test(block)) {
                html += '<hr>';
                continue;
            }
            
            // Check for headings
            const headingMatch = block.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const content = this.processInlineMarkdown(headingMatch[2]);
                html += `<h${level}>${content}</h${level}>`;
                continue;
            }
            
            // Check for lists (numbered or bulleted) - process entire block as one list
            const lines = block.split('\n');
            let listItems = [];
            let isListBlock = true;
            
            for (const line of lines) {
                // Check for numbered list: 1. item or 1) item
                const numberedMatch = line.match(/^(\s*)(\d+)[\.\)]\s+(.+)$/);
                if (numberedMatch) {
                    const indent = numberedMatch[1];
                    const content = this.processInlineMarkdown(numberedMatch[3]);
                    const level = Math.floor(indent.length / 4);
                    listItems.push({ type: 'ol', level, content });
                    continue;
                }
                
                // Check for bulleted list: - item, * item, + item
                const bulletMatch = line.match(/^(\s*)[-\*\+]\s+(.+)$/);
                if (bulletMatch) {
                    const indent = bulletMatch[1];
                    const content = this.processInlineMarkdown(bulletMatch[2]);
                    const level = Math.floor(indent.length / 4);
                    listItems.push({ type: 'ul', level, content });
                    continue;
                }
                
                // If we hit a non-list line, this isn't a pure list block
                isListBlock = false;
                break;
            }
            
            // Process list if we found one and it's a pure list block
            if (isListBlock && listItems.length > 0) {
                html += this.buildContinuousNestedList(listItems);
                continue;
            }
            
            // Regular paragraph - process inline markdown
            const processedContent = this.processInlineMarkdown(block.replace(/\n/g, '<br>'));
            html += `<p>${processedContent}</p>`;
        }
        
        return html;
    }
    
    // Process inline markdown (bold, italic, code, etc.)
    processInlineMarkdown(text) {
        return text
            // Convert **bold** to <strong>
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert *italic* to <em> (avoid conflicts with list markers)
            .replace(/(?<![*\s])\*([^*\n]+?)\*(?![*\s])/g, '<em>$1</em>')
            // Convert `code` to <code>
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Convert [link text](url) to <a>
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }

    // Convert HTML to clean plain text for copying
    htmlToPlainText(html) {
        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Process specific elements
        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                let result = '';
                const tagName = node.tagName.toLowerCase();
                
                // Handle different HTML elements
                switch (tagName) {
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6':
                        result += '\n\n' + node.textContent + '\n\n';
                        break;
                    case 'p':
                        result += node.textContent + '\n\n';
                        break;
                    case 'br':
                        result += '\n';
                        break;
                    case 'hr':
                        result += '\n---\n\n';
                        break;
                    case 'ul':
                    case 'ol':
                        // Process list items
                        for (let child of node.children) {
                            if (child.tagName.toLowerCase() === 'li') {
                                const prefix = tagName === 'ol' ? '• ' : '• ';
                                result += prefix + child.textContent + '\n';
                            }
                        }
                        result += '\n';
                        break;
                    case 'strong':
                        result += node.textContent; // Remove bold formatting
                        break;
                    case 'em':
                        result += node.textContent; // Remove italic formatting
                        break;
                    case 'code':
                        result += node.textContent; // Remove code formatting
                        break;
                    default:
                        // For other elements, just get text content
                        result += node.textContent;
                        break;
                }
                
                return result;
            }
            
            return '';
        };
        
        // Process all child nodes
        let plainText = '';
        for (let child of temp.childNodes) {
            plainText += processNode(child);
        }
        
        // Clean up extra whitespace and newlines
        return plainText
            .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
            .replace(/^\n+/, '') // Remove leading newlines
            .replace(/\n+$/, '') // Remove trailing newlines
            .trim();
    }
    
    // Build properly nested lists with continuous numbering
    buildContinuousNestedList(items) {
        if (items.length === 0) return '';
        
        let html = '';
        let stack = [];
        let lastLevel = -1;
        let lastType = null;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const { type, level, content } = item;
            
            // Handle level changes
            if (level > lastLevel) {
                // Going deeper - open new lists
                for (let j = lastLevel + 1; j <= level; j++) {
                    const listTag = type === 'ol' ? 'ol' : 'ul';
                    html += `<${listTag}>`;
                    stack.push({ tag: `</${listTag}>`, type: type, level: j });
                }
            } else if (level < lastLevel) {
                // Going back - close lists
                const levelsToClose = lastLevel - level;
                for (let j = 0; j < levelsToClose; j++) {
                    if (stack.length > 0) {
                        html += stack.pop().tag;
                    }
                }
            }
            
            // If we're at the same level but different type, we need separate lists
            // For numbered lists, we want to continue numbering across the document
            if (level === lastLevel && type !== lastType && stack.length > 0) {
                // Don't close the previous list if it would break numbering
                // Instead, close and immediately reopen with the new type
                const prevStackItem = stack.pop();
                html += prevStackItem.tag;
                
                const listTag = type === 'ol' ? 'ol' : 'ul';
                html += `<${listTag}>`;
                stack.push({ tag: `</${listTag}>`, type: type, level: level });
            }
            
            // Add the list item
            html += `<li>${content}</li>`;
            lastLevel = level;
            lastType = type;
        }
        
        // Close all remaining lists
        while (stack.length > 0) {
            html += stack.pop().tag;
        }
        
        return html;
    }

    // Build properly nested lists from list items
    buildNestedList(items) {
        // Use the continuous version
        return this.buildContinuousNestedList(items);
    }

    addMessage(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Use markdown rendering for assistant messages, escape HTML for user messages
        const processedContent = role === 'assistant' ? this.markdownToHtml(content) : this.escapeHtml(content);
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${role === 'user' ? 'user' : 'robot'}"></i>
                <div class="text">${processedContent}${role === 'assistant' ? '<div class="copy-actions"><button class="copy-btn" title="Copy"><i class="fas fa-copy"></i></button></div>' : ''}</div>
            </div>
            <div class="message-time">${timeString}</div>
        `;

        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Enable copy-to-clipboard on assistant bubbles
        if (role === 'assistant') {
            const copyBtn = messageDiv.querySelector('.copy-btn');
            copyBtn?.addEventListener('click', async (e) => {
                e.stopPropagation();
                // Convert HTML back to clean plain text for copying
                const cleanText = this.htmlToPlainText(processedContent);
                await navigator.clipboard.writeText(cleanText);
                this.showNotification('Copied to clipboard', 'success');
            });
        }

        // Add animation
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
    }

    async clearChat() {
        if (!confirm('Are you sure you want to clear the chat history?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/clear-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                // Clear the chat UI
                this.elements.chatMessages.innerHTML = `
                    <div class="message assistant-message">
                        <div class="message-content">
                            <i class="fas fa-robot"></i>
                            <div class="text">
                                Chat history cleared! How can I help you today?
                            </div>
                        </div>
                        <div class="message-time"></div>
                    </div>
                `;
                this.showNotification('Chat history cleared', 'success');
            } else {
                throw new Error('Failed to clear chat history');
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            this.showNotification('Failed to clear chat history', 'error');
        }
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        this.elements.sendButton.disabled = loading;
        this.elements.messageInput.disabled = loading;
        this.elements.micButton.disabled = loading;
        
        if (loading) {
            this.elements.loadingOverlay.classList.add('show');
            this.speechHandler.updateMicButtonState('processing');
        } else {
            this.elements.loadingOverlay.classList.remove('show');
            this.speechHandler.updateMicButtonState('ready');
        }
    }

    showTyping(show) {
        if (!this.elements.typingIndicator) return;
        this.elements.typingIndicator.classList.toggle('show', !!show);
    }

    handleApiError(error) {
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Connection error. Please check your internet connection.';
            this.updateConnectionStatus(false);
        } else if (error.message.includes('500')) {
            errorMessage = 'Server error. Please try again in a moment.';
        } else if (error.message.includes('400')) {
            errorMessage = 'Invalid request. Please check your message.';
        }

        this.addMessage(errorMessage, 'assistant');
        this.showNotification(errorMessage, 'error');
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const isConnected = response.ok;
            this.updateConnectionStatus(isConnected);
            
            if (isConnected) {
                const data = await response.json();
                console.log('Server health check:', data);
            }
        } catch (error) {
            console.error('Server connection check failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = this.elements.connectionStatus;
        if (connected) {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
            statusElement.className = 'connection-status connected';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
            statusElement.className = 'connection-status disconnected';
        }
    }

    scrollToBottom(force = false) {
        const nearBottom = this.elements.chatMessages.scrollHeight - this.elements.chatMessages.scrollTop - this.elements.chatMessages.clientHeight < 120;
        if (nearBottom || force) {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
        this.updateScrollButton();
    }

    updateScrollButton() {
        const atBottom = this.elements.chatMessages.scrollHeight - this.elements.chatMessages.scrollTop - this.elements.chatMessages.clientHeight < 10;
        this.elements.scrollBottomChat.classList.toggle('show', !atBottom);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '9999',
            transform: 'translateX(300px)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = '#4caf50';
                break;
            case 'error':
                notification.style.background = '#f44336';
                break;
            case 'warning':
                notification.style.background = '#ff9800';
                break;
            default:
                notification.style.background = '#2196f3';
        }

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(300px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new VoiceChatbot();
    // Theme restore
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    // Update toggle icon
    chatbot.updateThemeIcon();
    console.log('Voice-enabled chatbot initialized successfully');
});

// Handle any unhandled errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Theme helpers
VoiceChatbot.prototype.toggleTheme = function() {
    const root = document.documentElement;
    const dark = root.classList.toggle('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    this.updateThemeIcon();
};

VoiceChatbot.prototype.updateThemeIcon = function() {
    const isDark = document.documentElement.classList.contains('dark');
    this.elements.themeToggle.innerHTML = `<i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i>`;
};

// Settings modal and voice options
VoiceChatbot.prototype.openSettings = function() {
    this.populateVoices();
    this.elements.settingsModal.classList.add('show');
};
VoiceChatbot.prototype.closeSettings = function() {
    this.elements.settingsModal.classList.remove('show');
};
VoiceChatbot.prototype.saveSettings = function() {
    const cfg = {
        voiceURI: this.elements.voiceSelect.value || null,
        rate: parseFloat(this.elements.rateRange.value),
        pitch: parseFloat(this.elements.pitchRange.value),
        volume: parseFloat(this.elements.volumeRange.value)
    };
    localStorage.setItem('speechConfig', JSON.stringify(cfg));
    this.applySpeechConfig(cfg);
    this.showNotification('Settings saved', 'success');
    this.closeSettings();
};
VoiceChatbot.prototype.resetSettings = function() {
    localStorage.removeItem('speechConfig');
    this.elements.rateRange.value = 0.9;
    this.elements.pitchRange.value = 1.0;
    this.elements.volumeRange.value = 0.8;
    this.updateRangeLabels();
    this.applySpeechConfig();
};
VoiceChatbot.prototype.updateRangeLabels = function() {
    this.elements.rateValue.textContent = this.elements.rateRange.value;
    this.elements.pitchValue.textContent = this.elements.pitchRange.value;
    this.elements.volumeValue.textContent = this.elements.volumeRange.value;
};
VoiceChatbot.prototype.populateVoices = function() {
    const voices = this.speechHandler.getVoices();
    const select = this.elements.voiceSelect;
    select.innerHTML = '';
    voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})`;
        select.appendChild(opt);
    });
    const saved = JSON.parse(localStorage.getItem('speechConfig') || '{}');
    
    // Set default voice selection
    if (saved.voiceURI) {
        select.value = saved.voiceURI;
    } else {
        // Default to Google US English if available
        const defaultVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('google') && 
            voice.lang.includes('en-US')
        ) || voices.find(voice => voice.name.includes('Google'))
          || voices.find(voice => voice.name.includes('Microsoft'))
          || voices.find(voice => voice.lang.includes('en'));
        
        if (defaultVoice) {
            select.value = defaultVoice.voiceURI;
        }
    }
    
    this.elements.rateRange.value = saved.rate ?? 0.9;
    this.elements.pitchRange.value = saved.pitch ?? 1.0;
    this.elements.volumeRange.value = saved.volume ?? 0.8;
    this.updateRangeLabels();
};
VoiceChatbot.prototype.applySpeechConfig = function(cfg) {
    const saved = cfg || JSON.parse(localStorage.getItem('speechConfig') || '{}');
    this.speechHandler.setSpeechConfig(saved);
};