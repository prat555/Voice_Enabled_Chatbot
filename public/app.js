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
        let globalListCounters = {}; // Track numbering across the entire document
        
        for (let block of blocks) {
            block = block.trim();
            if (!block) continue;
            
            // Check for horizontal rules (need at least 3 chars and only whitespace after)
            if (/^(---+|\*{3,}|_{3,})\s*$/.test(block)) {
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
            
            // Process each line individually to handle mixed content
            const lines = block.split('\n');
            let currentListItems = [];
            let pendingParagraph = '';
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                if (!trimmedLine) continue; // Skip empty lines
                
                // Check for numbered list: 1. item or 1) item
                const numberedMatch = line.match(/^(\s*)(\d+)[\.\)]\s+(.+)$/);
                if (numberedMatch) {
                    // If we have a pending paragraph, add it first
                    if (pendingParagraph.trim()) {
                        html += `<p>${this.processInlineMarkdown(pendingParagraph.trim())}</p>`;
                        pendingParagraph = '';
                    }
                    
                    const indent = numberedMatch[1];
                    const content = this.processInlineMarkdown(numberedMatch[3]);
                    const level = Math.floor(indent.length / 4);
                    
                    // Initialize counter for this level if not exists
                    if (!globalListCounters[level]) {
                        globalListCounters[level] = 1;
                    }
                    
                    currentListItems.push({ type: 'ol', level, content });
                    continue;
                }
                
                // Check for bulleted list: - item, * item, + item
                const bulletMatch = line.match(/^(\s*)[-\*\+]\s+(.+)$/);
                if (bulletMatch) {
                    // If we have a pending paragraph, add it first
                    if (pendingParagraph.trim()) {
                        html += `<p>${this.processInlineMarkdown(pendingParagraph.trim())}</p>`;
                        pendingParagraph = '';
                    }
                    
                    const indent = bulletMatch[1];
                    const content = this.processInlineMarkdown(bulletMatch[2]);
                    const level = Math.floor(indent.length / 4);
                    currentListItems.push({ type: 'ul', level, content });
                    continue;
                }
                
                // If we were building a list and hit a non-list line, output the list
                if (currentListItems.length > 0) {
                    html += this.buildSequentialNestedList(currentListItems, globalListCounters);
                    currentListItems = [];
                }
                
                // Regular line - add to pending paragraph
                if (pendingParagraph) {
                    pendingParagraph += ' ' + trimmedLine;
                } else {
                    pendingParagraph = trimmedLine;
                }
            }
            
            // Process any remaining list items
            if (currentListItems.length > 0) {
                html += this.buildSequentialNestedList(currentListItems, globalListCounters);
            }
            
            // Process any remaining paragraph content
            if (pendingParagraph.trim()) {
                html += `<p>${this.processInlineMarkdown(pendingParagraph.trim())}</p>`;
            }
        }
        
        return html;
    }
    
    // Process inline markdown (bold, italic, code, links)
    processInlineMarkdown(text) {
        let out = text;
        // 1) Inline code first to avoid styling inside code
        out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
        // 2) Bold (** or __)
        out = out.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
        // 3) Italic with asterisks: allow start or whitespace before, and punctuation/space/end after
        //    Do not match list bullets (asterisk followed by space) by requiring first inner char non-space
        out = out.replace(/(^|[\s(])\*([^\s*][^*]*?)\*(?=[\s).,!?:;"\]]|$)/g, '$1<em>$2</em>');
        // 4) Italic with underscores: similar rules
        out = out.replace(/(^|[\s(])_([^\s_][^_]*?)_(?=[\s).,!?:;"\]]|$)/g, '$1<em>$2</em>');
        // 5) Links
        out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        return out;
    }

    // Convert HTML to clean markdown text for copying
    htmlToPlainText(html) {
        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Depth-aware recursive processor that emits valid Markdown
        const processNode = (node, ctx = { inListItem: false, depth: 0 }) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                let result = '';

                // Indentation for nested lists (2 spaces per depth level)
                const indent = '  '.repeat(ctx.depth);

                switch (tagName) {
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6': {
                        // Copy headings as bold text instead of # to avoid symbol noise
                        const headingText = node.textContent.trim();
                        if (ctx.inListItem) {
                            result += '**' + headingText + '**';
                        } else {
                            result += '\n\n**' + headingText + '**\n\n';
                        }
                        break;
                    }
                    case 'p': {
                        const text = node.textContent.trim();
                        result += ctx.inListItem ? text : text + '\n\n';
                        break;
                    }
                    case 'br':
                        result += '\n';
                        break;
                    case 'hr':
                        // Skip explicit ---; keep a blank line separation only
                        result += '\n\n';
                        break;
                    case 'ul': {
                        // Emit markdown bullets using '-' to avoid stray asterisks
                        for (let li of node.children) {
                            if (li.tagName.toLowerCase() !== 'li') continue;
                            // Split head content and nested lists
                            const nestedLists = [];
                            const headNodes = [];
                            for (let child of li.childNodes) {
                                if (child.nodeType === Node.ELEMENT_NODE) {
                                    const tn = child.tagName.toLowerCase();
                                    if (tn === 'ul' || tn === 'ol') {
                                        nestedLists.push(child);
                                        continue;
                                    }
                                }
                                headNodes.push(child);
                            }
                            // Build head text from parts with proper spacing between segments
                            const headSegments = [];
                            for (let part of headNodes) {
                                const seg = processNode(part, { inListItem: true, depth: ctx.depth }).trim();
                                if (seg) headSegments.push(seg);
                            }
                            let headText = headSegments.join(' ').replace(/\s{2,}/g, ' ');
                            headText = headText
                                .replace(/^\s*\n+/, '')
                                .replace(/\n+\s*$/, '')
                                .replace(/\n\s*\n/g, '\n');

                            result += `${indent}- ${headText}\n`;

                            // Process nested lists with increased depth
                            for (let nl of nestedLists) {
                                result += processNode(nl, { inListItem: false, depth: ctx.depth + 1 });
                            }
                        }
                        // Add a separating newline after a list
                        result += '\n';
                        break;
                    }
                    case 'ol': {
                        let startNum = parseInt(node.getAttribute('start')) || 1;
                        let counter = startNum;
                        for (let li of node.children) {
                            if (li.tagName.toLowerCase() !== 'li') continue;
                            const nestedLists = [];
                            const headNodes = [];
                            for (let child of li.childNodes) {
                                if (child.nodeType === Node.ELEMENT_NODE) {
                                    const tn = child.tagName.toLowerCase();
                                    if (tn === 'ul' || tn === 'ol') {
                                        nestedLists.push(child);
                                        continue;
                                    }
                                }
                                headNodes.push(child);
                            }
                            const headSegments = [];
                            for (let part of headNodes) {
                                const seg = processNode(part, { inListItem: true, depth: ctx.depth }).trim();
                                if (seg) headSegments.push(seg);
                            }
                            let headText = headSegments.join(' ').replace(/\s{2,}/g, ' ');
                            headText = headText
                                .replace(/^\s*\n+/, '')
                                .replace(/\n+\s*$/, '')
                                .replace(/\n\s*\n/g, '\n');

                            result += `${indent}${counter}. ${headText}\n`;
                            counter++;

                            // Process nested lists with increased depth
                            for (let nl of nestedLists) {
                                result += processNode(nl, { inListItem: false, depth: ctx.depth + 1 });
                            }
                        }
                        result += '\n';
                        break;
                    }
                    case 'strong':
                        result += '**' + node.textContent + '**';
                        break;
                    case 'em':
                        // Use underscores for italics to avoid lone '*'
                        result += '_' + node.textContent + '_';
                        break;
                    case 'code':
                        result += '`' + node.textContent + '`';
                        break;
                    case 'a': {
                        const href = node.getAttribute('href');
                        result += href ? `[${node.textContent}](${href})` : node.textContent;
                        break;
                    }
                    default: {
                        for (let child of node.childNodes) {
                            result += processNode(child, ctx);
                        }
                        break;
                    }
                }

                return result;
            }

            return '';
        };

        // Process all child nodes
        let plainText = '';
        for (let child of temp.childNodes) {
            plainText += processNode(child, { inListItem: false, depth: 0 });
        }

        // Clean up extra whitespace and newlines
        return plainText
            .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
            .replace(/^\n+/, '') // Remove leading newlines
            .replace(/\n+$/, '') // Remove trailing newlines
            .trim();
    }

    // Convert HTML to plain human-readable text (no markdown symbols)
    htmlToPlainReadable(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        const processNode = (node, ctx = { inListItem: false, depth: 0 }) => {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent;
            if (node.nodeType !== Node.ELEMENT_NODE) return '';

            const tag = node.tagName.toLowerCase();
            let out = '';

            const indent = '  '.repeat(ctx.depth);

            switch (tag) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6': {
                    const text = node.textContent.trim();
                    out += (ctx.inListItem ? '' : '\n\n') + text + (ctx.inListItem ? '' : '\n\n');
                    break;
                }
                case 'p':
                    out += node.textContent.trim() + (ctx.inListItem ? '' : '\n\n');
                    break;
                case 'br':
                    out += '\n';
                    break;
                case 'hr':
                    out += '\n\n';
                    break;
                case 'ul': {
                    for (let li of node.children) {
                        if (li.tagName.toLowerCase() !== 'li') continue;
                        // Split head and nested lists
                        const nested = [];
                        const head = [];
                        for (let child of li.childNodes) {
                            if (child.nodeType === Node.ELEMENT_NODE && ['ul','ol'].includes(child.tagName.toLowerCase())) {
                                nested.push(child);
                            } else {
                                head.push(child);
                            }
                        }
                        let headText = '';
                        for (let part of head) headText += processNode(part, { inListItem: true, depth: ctx.depth });
                        headText = headText.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '').replace(/\n\s*\n/g, '\n');
                        out += `${indent}• ${headText}\n`;
                        for (let nl of nested) out += processNode(nl, { inListItem: false, depth: ctx.depth + 1 });
                    }
                    out += '\n';
                    break;
                }
                case 'ol': {
                    let start = parseInt(node.getAttribute('start')) || 1;
                    let n = start;
                    for (let li of node.children) {
                        if (li.tagName.toLowerCase() !== 'li') continue;
                        const nested = [];
                        const head = [];
                        for (let child of li.childNodes) {
                            if (child.nodeType === Node.ELEMENT_NODE && ['ul','ol'].includes(child.tagName.toLowerCase())) {
                                nested.push(child);
                            } else {
                                head.push(child);
                            }
                        }
                        let headText = '';
                        for (let part of head) headText += processNode(part, { inListItem: true, depth: ctx.depth });
                        headText = headText.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '').replace(/\n\s*\n/g, '\n');
                        out += `${indent}${n}. ${headText}\n`;
                        n++;
                        for (let nl of nested) out += processNode(nl, { inListItem: false, depth: ctx.depth + 1 });
                    }
                    out += '\n';
                    break;
                }
                case 'strong':
                case 'em':
                case 'code':
                    out += node.textContent;
                    break;
                case 'a': {
                    const href = node.getAttribute('href');
                    const text = node.textContent;
                    out += href ? `${text} (${href})` : text;
                    break;
                }
                default:
                    for (let child of node.childNodes) out += processNode(child, ctx);
            }

            return out;
        };

        let text = '';
        for (let child of temp.childNodes) text += processNode(child, { inListItem: false, depth: 0 });
        return text
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\n+/, '')
            .replace(/\n+$/, '')
            .trim();
    }
    
    // Build properly nested lists with sequential numbering across the document
    buildSequentialNestedList(items, globalCounters) {
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
                    
                    // For ordered lists, set the start value based on global counter
                    if (type === 'ol' && globalCounters[j]) {
                        html += `<${listTag} start="${globalCounters[j]}">`;
                    } else {
                        html += `<${listTag}>`;
                        if (type === 'ol' && !globalCounters[j]) {
                            globalCounters[j] = 1;
                        }
                    }
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
            } else if (level === lastLevel && type !== lastType && stack.length > 0) {
                // Same level but different type - close and reopen
                const prevStackItem = stack.pop();
                html += prevStackItem.tag;
                
                const listTag = type === 'ol' ? 'ol' : 'ul';
                if (type === 'ol' && globalCounters[level]) {
                    html += `<${listTag} start="${globalCounters[level]}">`;
                } else {
                    html += `<${listTag}>`;
                    if (type === 'ol' && !globalCounters[level]) {
                        globalCounters[level] = 1;
                    }
                }
                stack.push({ tag: `</${listTag}>`, type: type, level: level });
            }
            
            // Add the list item
            html += `<li>${content}</li>`;
            
            // Increment counter for ordered lists
            if (type === 'ol') {
                if (!globalCounters[level]) {
                    globalCounters[level] = 1;
                }
                globalCounters[level]++;
            }
            
            lastLevel = level;
            lastType = type;
        }
        
        // Close all remaining lists
        while (stack.length > 0) {
            html += stack.pop().tag;
        }
        
        return html;
    }

    // Build properly nested lists with continuous numbering
    buildContinuousNestedList(items) {
        if (items.length === 0) return '';
        
        let html = '';
        let stack = [];
        let lastLevel = -1;
        let lastType = null;
        let olCounters = {}; // Track numbering for each level
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const { type, level, content } = item;
            
            // Handle level changes
            if (level > lastLevel) {
                // Going deeper - open new lists
                for (let j = lastLevel + 1; j <= level; j++) {
                    const listTag = type === 'ol' ? 'ol' : 'ul';
                    // Initialize counter for this level if it's an ordered list
                    if (type === 'ol' && !olCounters[j]) {
                        olCounters[j] = 1;
                    }
                    html += `<${listTag}>`;
                    stack.push({ tag: `</${listTag}>`, type: type, level: j });
                }
            } else if (level < lastLevel) {
                // Going back - close lists and clear deeper counters
                const levelsToClose = lastLevel - level;
                for (let j = 0; j < levelsToClose; j++) {
                    if (stack.length > 0) {
                        const poppedItem = stack.pop();
                        html += poppedItem.tag;
                        // Clear counters for levels we're closing
                        if (poppedItem.type === 'ol') {
                            delete olCounters[poppedItem.level];
                        }
                    }
                }
            } else if (level === lastLevel && type !== lastType && stack.length > 0) {
                // Same level but different type - close and reopen
                const prevStackItem = stack.pop();
                html += prevStackItem.tag;
                
                const listTag = type === 'ol' ? 'ol' : 'ul';
                if (type === 'ol' && !olCounters[level]) {
                    olCounters[level] = 1;
                }
                html += `<${listTag}>`;
                stack.push({ tag: `</${listTag}>`, type: type, level: level });
            }
            
            // Add the list item with proper numbering
            html += `<li>${content}</li>`;
            
            // Increment counter for ordered lists
            if (type === 'ol' && olCounters[level]) {
                olCounters[level]++;
            }
            
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

    copyToClipboardFallback(text) {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Make it invisible but not display:none (which would break copying)
        textArea.style.position = 'fixed';
        textArea.style.top = '-1000px';
        textArea.style.left = '-1000px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        
        document.body.appendChild(textArea);
        
        try {
            // Select the text
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, 99999); // For mobile devices
            
            // Execute copy command
            const successful = document.execCommand('copy');
            
            if (!successful) {
                throw new Error('Copy command failed');
            }
        } finally {
            // Clean up
            document.body.removeChild(textArea);
        }
    }

    async copyAsRichText(html, plainText) {
        // Try the async Clipboard API with text/html and text/plain
        if (navigator.clipboard && window.ClipboardItem) {
            try {
                const htmlBlob = new Blob([html], { type: 'text/html' });
                const textBlob = new Blob([plainText], { type: 'text/plain' });
                const item = new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob });
                await navigator.clipboard.write([item]);
                return;
            } catch (err) {
                console.warn('ClipboardItem rich copy failed, falling back:', err);
            }
        }

        // Fallback: selection-based copy using a hidden, contenteditable container
        try {
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.setAttribute('contenteditable', 'true');
            container.innerHTML = html;
            document.body.appendChild(container);

            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(container);
            selection.removeAllRanges();
            selection.addRange(range);

            const ok = document.execCommand('copy');
            selection.removeAllRanges();
            document.body.removeChild(container);
            if (ok) return;
        } catch (e) {
            console.warn('Selection-based rich copy failed:', e);
        }

        // Last resort: plain text only
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(plainText);
        } else {
            this.copyToClipboardFallback(plainText);
        }
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
                <div class="text">${processedContent}${role === 'assistant' ? '<div class="copy-actions"><button class="copy-btn copy-plain" title="Copy text"><i class="fas fa-copy"></i></button></div>' : ''}</div>
            </div>
            <div class="message-time">${timeString}</div>
        `;

        this.elements.chatMessages.appendChild(messageDiv);
        // Attach original assistant markdown for precise copy
        if (role === 'assistant') {
            const textEl = messageDiv.querySelector('.text');
            if (textEl) {
                // Store raw markdown as a data attribute for reliable copying
                textEl.setAttribute('data-raw-md', content);
            }
        }
        this.scrollToBottom();

        // Enable copy-to-clipboard on assistant bubbles
        if (role === 'assistant') {
            const copyPlainBtn = messageDiv.querySelector('.copy-btn.copy-plain');

            // Single copy: Rich text (HTML) + plain text fallback
            copyPlainBtn?.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const plain = this.htmlToPlainReadable(processedContent);
                    await this.copyAsRichText(processedContent, plain);
                    this.showNotification('Copied text', 'success');
                } catch (error) {
                    console.error('Copy (rich) failed:', error);
                    // As ultimate fallback, try plain text only
                    try {
                        if (navigator.clipboard && window.isSecureContext) {
                            await navigator.clipboard.writeText(plain);
                        } else {
                            this.copyToClipboardFallback(plain);
                        }
                        this.showNotification('Copied text', 'success');
                    } catch (err2) {
                        console.error('Copy fallback failed:', err2);
                        this.showNotification('Failed to copy text', 'error');
                    }
                }
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
                await response.json();
            }
        } catch (error) {
            // Silent on failure; UI status will show disconnected
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
    // App initialized
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