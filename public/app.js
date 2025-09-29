// Main Application Logic
class VoiceChatbot {
    constructor() {
        this.speechHandler = new SpeechHandler();
        this.apiBaseUrl = '/api';
        this.isLoading = false;
        this.activeChatId = null;
        this.chats = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSpeechHandler();
        this.checkServerConnection();
        this.bootstrapChats(); // Initialize chats and load active history
    }

    initializeElements() {
        this.elements = {
            chatMessages: document.getElementById('chatMessages'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            micButton: document.getElementById('micButton'),
            clearButton: document.getElementById('clearChat'), // no longer present, kept for backward compat (unused)
            newChatBtn: document.getElementById('newChatBtn'),
            chatList: document.getElementById('chatList'),
            deleteAllBtn: document.getElementById('deleteAllChats'),
            chatTitle: document.getElementById('chatTitle'),
            autoSpeakCheckbox: document.getElementById('autoSpeak'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            connectionStatus: document.getElementById('connectionStatus'),
            typingIndicator: document.getElementById('typingIndicator'),
            sidebar: document.getElementById('sidebar'),
            mobileMenuBtn: document.getElementById('mobileMenuBtn'),
            mobileOverlay: document.getElementById('mobileOverlay'),
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

        // Clear chat button (deprecated in new UI) - keep handler if exists
        this.elements.clearButton?.addEventListener('click', () => { this.clearChat(); });

        // New chat
        this.elements.newChatBtn?.addEventListener('click', () => {
            this.createChat();
        });

        // Delete all chats
        this.elements.deleteAllBtn?.addEventListener('click', () => {
            this.deleteAllChats();
        });

        // Mobile menu functionality
        this.elements.mobileMenuBtn?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        this.elements.mobileOverlay?.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // Close mobile menu when clicking on chat messages area
        this.elements.chatMessages?.addEventListener('click', () => {
            this.closeMobileMenu();
        });

        // Handle window resize to close mobile menu
        window.addEventListener('resize', () => {
            if (window.innerWidth > 820) {
                this.closeMobileMenu();
            }
        });

        // Chat list actions (select/rename/delete)
        this.elements.chatList?.addEventListener('click', (e) => {
            const item = e.target.closest('.chatlist-item');
            if (!item) return;
            const id = item.getAttribute('data-id');
            if (!id) return;

            const actionBtn = e.target.closest('[data-action]');
            const action = actionBtn?.getAttribute('data-action');
            if (action === 'rename') {
                const current = this.chats.find(c => c.id === id);
                const newTitle = prompt('Rename chat', current?.title || '');
                if (newTitle && newTitle.trim()) this.renameChat(id, newTitle.trim());
                return;
            } else if (action === 'delete') {
                this.deleteChat(id);
                return;
            }
            // Default: select
            this.selectChat(id);
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
                this.saveScrollPosition(); // Save position when page becomes hidden
            }
        });

        // Save scroll position before page unload
        window.addEventListener('beforeunload', () => {
            this.saveScrollPosition();
        });

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Chat controls
        this.elements.scrollBottomChat.addEventListener('click', () => this.scrollToBottom(true));
        this.elements.stopSpeaking.addEventListener('click', () => {
            this.speechHandler.stopSpeaking();
        });
        this.elements.chatMessages.addEventListener('scroll', () => {
            this.updateScrollButton();
            this.saveScrollPosition(); // Save position when user scrolls
        });

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

        // Quick-actions removed in new layout

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

    // Save message to local storage for persistence
    this.saveMessageToHistory({ role: 'user', content: message, timestamp: new Date().toISOString() });

        try {
            // Send message to API
            const response = await fetch(`${this.apiBaseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, chatId: this.activeChatId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Add assistant response to chat
                this.addMessage(data.response, 'assistant');
                
                // Save response to local storage for persistence
                this.saveMessageToHistory({ role: 'assistant', content: data.response, timestamp: data.timestamp });
                
                // Speak the response if auto-speak is enabled
                this.speechHandler.speakText(data.response);

                // If chat title is default, set from first user message
                this.maybeAutoTitleFromFirstMessage();
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

            // Check for tables (look for pipe characters)
            if (block.includes('|')) {
                const tableHtml = this.processTable(block);
                if (tableHtml) {
                    html += tableHtml;
                    continue;
                }
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

    // Process markdown tables
    processTable(block) {
        const lines = block.trim().split('\n');
        if (lines.length < 2) return null;

        // Check if this looks like a table (has pipes and header separator)
        const hasHeaderSeparator = lines.length >= 2 && 
            lines[1].match(/^\s*\|?[\s\-\|\:]+\|?\s*$/) &&
            lines[1].includes('-');
        
        if (!hasHeaderSeparator) return null;

        let html = '<table>';
        let inHeader = true;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip the header separator line
            if (i === 1 && line.match(/^\s*\|?[\s\-\|\:]+\|?\s*$/)) {
                if (inHeader) {
                    html += '</thead><tbody>';
                    inHeader = false;
                }
                continue;
            }

            // Parse table row
            if (line.includes('|')) {
                let cells = line.split('|');
                
                // Remove empty cells at start/end if they exist (from leading/trailing pipes)
                if (cells[0].trim() === '') cells.shift();
                if (cells[cells.length - 1].trim() === '') cells.pop();

                if (cells.length === 0) continue;

                // Start appropriate section
                if (inHeader && i === 0) {
                    html += '<thead>';
                }

                const tag = inHeader ? 'th' : 'td';
                html += '<tr>';
                
                for (const cell of cells) {
                    const cellContent = this.processInlineMarkdown(cell.trim());
                    html += `<${tag}>${cellContent}</${tag}>`;
                }
                
                html += '</tr>';
            }
        }

        // Close any open sections
        if (inHeader) {
            html += '</thead>';
        } else {
            html += '</tbody>';
        }
        
        html += '</table>';
        return html;
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

    addMessage(content, role, saveToHistory = true) {
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
                },
                body: JSON.stringify({ chatId: this.activeChatId })
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
                
                // Clear local storage history for this chat
                localStorage.removeItem(this.keyHistory(this.activeChatId));
                localStorage.removeItem(this.keyScroll(this.activeChatId));
                
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
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Gemini Connected';
            statusElement.className = 'connection-status connected';
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Gemini Disconnected';
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

    // Chat bootstrap: load chats and render
    bootstrapChats() {
        const saved = JSON.parse(localStorage.getItem('chats') || 'null');
        if (!saved || !Array.isArray(saved.items) || saved.items.length === 0) {
            // Create initial chat
            const id = this.genId();
            this.chats = [{ id, title: 'New Chat', createdAt: Date.now(), updatedAt: Date.now() }];
            this.activeChatId = id;
            this.persistChats();
        } else {
            this.chats = saved.items;
            this.activeChatId = saved.activeId || this.chats[0].id;
        }
        this.renderChatList();
        this.loadActiveChatHistory();
    }

    // Helpers for storage keys
    keyHistory(id) { return `chatHistory:${id}`; }
    keyScroll(id) { return `chatScrollPosition:${id}`; }

    // Create/select/rename/delete chats
    genId() { return Math.random().toString(36).slice(2, 10); }
    persistChats() {
        localStorage.setItem('chats', JSON.stringify({ activeId: this.activeChatId, items: this.chats }));
    }
    renderChatList() {
        if (!this.elements.chatList) return;
        this.elements.chatList.innerHTML = '';
        const frag = document.createDocumentFragment();
        this.chats.forEach(c => {
            const div = document.createElement('div');
            div.className = `chatlist-item${c.id === this.activeChatId ? ' active' : ''}`;
            div.setAttribute('data-id', c.id);
            const preview = this.getChatPreview(c.id);
            div.innerHTML = `
                <div class="info">
                  <div class="title">${this.escapeHtml(c.title || 'Untitled')}</div>
                  <div class="meta">${this.escapeHtml(preview)}</div>
                </div>
                <div class="actions">
                  <button class="icon-button" title="Rename" data-action="rename"><i class="fa-regular fa-pen-to-square"></i></button>
                  <button class="icon-button" title="Delete" data-action="delete"><i class="fa-regular fa-trash-can"></i></button>
                </div>
            `;
            frag.appendChild(div);
        });
        this.elements.chatList.appendChild(frag);
                this.updateChatTitle();
    }
    getChatPreview(id) {
        try {
            const saved = localStorage.getItem(this.keyHistory(id));
            if (!saved) return 'No messages yet';
            const hist = JSON.parse(saved);
            const last = hist[hist.length - 1];
            if (!last) return 'No messages yet';
            const text = (last.role === 'assistant') ? this.htmlToPlainReadable(this.markdownToHtml(last.content)) : (last.content || '');
            return (text || '').slice(0, 40) + (text && text.length > 40 ? '…' : '');
        } catch { return 'No messages yet'; }
    }
    createChat() {
        const id = this.genId();
        const chat = { id, title: 'New Chat', createdAt: Date.now(), updatedAt: Date.now() };
        this.chats.unshift(chat);
        this.activeChatId = id;
        this.persistChats();
        this.renderChatList();
        // Reset UI
        this.elements.chatMessages.innerHTML = '';
        this.addWelcomeMessage();
        this.scrollToBottom(true);
        this.updateChatTitle();
    }
    selectChat(id) {
        if (!id || id === this.activeChatId) return;
        if (!this.chats.find(c => c.id === id)) return;
        this.activeChatId = id;
        this.persistChats();
        this.renderChatList();
        this.loadActiveChatHistory();
        this.updateChatTitle();
    }
    renameChat(id, newTitle) {
        const c = this.chats.find(x => x.id === id);
        if (!c) return;
        c.title = newTitle;
        c.updatedAt = Date.now();
        this.persistChats();
        this.renderChatList();
        if (id === this.activeChatId) this.updateChatTitle();
    }
    deleteChat(id) {
        const idx = this.chats.findIndex(x => x.id === id);
        if (idx === -1) return;
        if (!confirm('Delete this chat? This will remove its local history.')) return;
        // Remove local histories
        localStorage.removeItem(this.keyHistory(id));
        localStorage.removeItem(this.keyScroll(id));
        this.chats.splice(idx, 1);
        if (this.activeChatId === id) {
            // Switch to first or create new
            if (this.chats.length === 0) {
                this.createChat();
            } else {
                this.activeChatId = this.chats[0].id;
                this.persistChats();
                this.renderChatList();
                this.loadActiveChatHistory();
                this.updateChatTitle();
            }
        } else {
            this.persistChats();
            this.renderChatList();
        }
    }

    deleteAllChats() {
        if (!confirm('Delete ALL chats locally? This cannot be undone.')) return;
        // Clear local chat histories
        try {
            const saved = JSON.parse(localStorage.getItem('chats') || 'null');
            if (saved && Array.isArray(saved.items)) {
                saved.items.forEach(c => {
                    localStorage.removeItem(this.keyHistory(c.id));
                    localStorage.removeItem(this.keyScroll(c.id));
                });
            }
        } catch {}
        // Reset list
        this.chats = [];
        this.persistChats();
        // Also ask server to clear default chat history for safety
        fetch(`${this.apiBaseUrl}/clear-history`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).catch(() => {});
        // Create a new fresh chat
        this.createChat();
    }

    updateChatTitle() {
        const c = this.chats.find(x => x.id === this.activeChatId);
        if (this.elements.chatTitle) {
            this.elements.chatTitle.textContent = c?.title || 'Chat';
        }
    }

    // Load chat history for active chat
    loadActiveChatHistory() {
        try {
            const savedHistory = localStorage.getItem(this.keyHistory(this.activeChatId));
            const history = savedHistory ? JSON.parse(savedHistory) : [];
            // Clear UI
            this.elements.chatMessages.innerHTML = '';
            if (history.length === 0) {
                this.addWelcomeMessage();
            } else {
                history.forEach(msg => this.addMessage(msg.content, msg.role, false));
            }
            this.restoreScrollPosition();
        } catch (e) {
            console.error('Error loading chat history:', e);
            this.addWelcomeMessage();
        }
    }

    // Save message to localStorage
    saveMessageToHistory(messageObj) {
        try {
            let history = [];
            const saved = localStorage.getItem(this.keyHistory(this.activeChatId));
            if (saved) {
                history = JSON.parse(saved);
            }
            
            history.push(messageObj);
            
            // Keep only the last 50 messages to prevent storage overflow
            if (history.length > 50) {
                history = history.slice(-50);
            }
            
            localStorage.setItem(this.keyHistory(this.activeChatId), JSON.stringify(history));
            // Update preview timestamp
            const c = this.chats.find(x => x.id === this.activeChatId);
            if (c) { c.updatedAt = Date.now(); this.persistChats(); this.renderChatList(); }
        } catch (error) {
            console.error('Error saving message to history:', error);
        }
    }

    // Add welcome message
    addWelcomeMessage() {
        this.elements.chatMessages.innerHTML = `
            <div class="message assistant-message">
                <div class="message-content">
                    <i class="fas fa-robot"></i>
                    <div class="text">
                        Hi! I'm your voice-enabled AI assistant. You can either type your message or click the microphone button to speak to me. How can I help you today?
                    </div>
                </div>
                <div class="message-time"></div>
            </div>
        `;
    }

    // Save scroll position to localStorage
    saveScrollPosition() {
        try {
            const scrollTop = this.elements.chatMessages.scrollTop;
            const scrollHeight = this.elements.chatMessages.scrollHeight;
            const clientHeight = this.elements.chatMessages.clientHeight;
            
            localStorage.setItem(this.keyScroll(this.activeChatId), JSON.stringify({
                scrollTop,
                scrollHeight,
                clientHeight,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Error saving scroll position:', error);
        }
    }

    // Restore scroll position from localStorage
    restoreScrollPosition() {
        try {
            const savedPosition = localStorage.getItem(this.keyScroll(this.activeChatId));
            if (!savedPosition) {
                this.scrollToBottom();
                return;
            }

            const position = JSON.parse(savedPosition);
            
            // Check if the saved position is recent (within last hour)
            const hourAgo = Date.now() - (60 * 60 * 1000);
            if (position.timestamp < hourAgo) {
                this.scrollToBottom();
                return;
            }

            // Use setTimeout to ensure DOM is fully rendered
            setTimeout(() => {
                const currentScrollHeight = this.elements.chatMessages.scrollHeight;
                const currentClientHeight = this.elements.chatMessages.clientHeight;
                
                // If content dimensions haven't changed much, restore exact position
                if (Math.abs(currentScrollHeight - position.scrollHeight) < 50) {
                    this.elements.chatMessages.scrollTop = position.scrollTop;
                } else {
                    // If content has changed significantly, calculate proportional position
                    const scrollRatio = position.scrollTop / (position.scrollHeight - position.clientHeight);
                    const newScrollTop = scrollRatio * (currentScrollHeight - currentClientHeight);
                    this.elements.chatMessages.scrollTop = Math.max(0, newScrollTop);
                }
                
                this.updateScrollButton();
            }, 100);
        } catch (error) {
            console.error('Error restoring scroll position:', error);
            this.scrollToBottom();
        }
    }

    // If chat title is still default, set it from the first user message
    maybeAutoTitleFromFirstMessage() {
        const c = this.chats.find(x => x.id === this.activeChatId);
        if (!c || (c.title && c.title !== 'New Chat')) return;
        try {
            const saved = localStorage.getItem(this.keyHistory(this.activeChatId));
            const hist = saved ? JSON.parse(saved) : [];
            const firstUser = hist.find(m => m.role === 'user');
            if (firstUser) {
                const plain = (firstUser.content || '').replace(/\s+/g, ' ').trim();
                const title = plain.split(' ').slice(0, 6).join(' ');
                if (title) {
                    c.title = title + (plain.split(' ').length > 6 ? '…' : '');
                    c.updatedAt = Date.now();
                    this.persistChats();
                    this.renderChatList();
                    this.updateChatTitle();
                }
            }
        } catch {}
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

// Mobile menu functionality
VoiceChatbot.prototype.toggleMobileMenu = function() {
    const sidebar = this.elements.sidebar;
    const overlay = this.elements.mobileOverlay;
    
    if (sidebar && overlay) {
        const isOpen = sidebar.classList.contains('show');
        if (isOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }
};

VoiceChatbot.prototype.openMobileMenu = function() {
    const sidebar = this.elements.sidebar;
    const overlay = this.elements.mobileOverlay;
    
    if (sidebar && overlay) {
        sidebar.classList.add('show');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
};

VoiceChatbot.prototype.closeMobileMenu = function() {
    const sidebar = this.elements.sidebar;
    const overlay = this.elements.mobileOverlay;
    
    if (sidebar && overlay) {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
};