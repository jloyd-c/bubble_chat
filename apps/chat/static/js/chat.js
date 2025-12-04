
    // ================= CONFIGURATION =================
    let username = localStorage.getItem("nickname") || 
                   prompt("Enter your nickname:", "Anonymous") || 
                   "Anonymous";
    let roomName = "{{ room_name }}";
    let protocol = window.location.protocol === "https:" ? "wss" : "ws";
    let socket = null;
    let messageTimers = {};
    let onlineUsers = new Set();
    let typingTimeout = null;
    let isTyping = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    // ================= INITIALIZATION =================
    document.addEventListener('DOMContentLoaded', function() {
        initializeChat();
        setupMobileUI();
        updateUserDisplay();
        loadTheme();
        
        // Focus input on load
        setTimeout(() => {
            document.getElementById('messageInput').focus();
        }, 500);
    });

    // ================= CHAT FUNCTIONS =================
    function initializeChat() {
        const wsURL = protocol + "://" + window.location.host + "/ws/chat/" + roomName + "/";
        
        socket = new WebSocket(wsURL);
        
        socket.onopen = function(e) {
            console.log("✅ WebSocket connected");
            updateConnectionStatus(true);
            reconnectAttempts = 0;
            
            // Send join notification
            socket.send(JSON.stringify({
                type: 'user_join',
                user: username
            }));
        };
        
        socket.onmessage = function(e) {
            try {
                const data = JSON.parse(e.data);
                handleIncomingMessage(data);
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        };
        
        socket.onclose = function(e) {
            console.log("❌ WebSocket disconnected:", e.code, e.reason);
            updateConnectionStatus(false);
            
            // Try to reconnect
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = Math.min(3000 * reconnectAttempts, 15000);
                console.log(`Reconnecting in ${delay/1000} seconds...`);
                
                setTimeout(() => {
                    console.log(`Attempt ${reconnectAttempts} to reconnect...`);
                    initializeChat();
                }, delay);
            }
        };
        
        socket.onerror = function(e) {
            console.error("WebSocket error:", e);
            updateConnectionStatus(false);
        };
    }

    function handleIncomingMessage(data) {
        switch(data.type) {
            case 'message':
                displayMessage(data);
                break;
            case 'user_join':
                handleUserJoin(data.user);
                break;
            case 'user_leave':
                handleUserLeave(data.user);
                break;
            case 'typing':
                showTypingIndicator(data.user);
                break;
            default:
                displayMessage(data); // Fallback for old format
        }
    }

    function displayMessage(data) {
        const messagesContainer = document.getElementById("messages");
        const wrapper = document.createElement("div");
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = data.sender ? data.sender.charAt(0).toUpperCase() : "?";
        avatar.title = data.sender || "Anonymous";

        const bubble = document.createElement("div");
        bubble.className = "bubble";
        
        // Add sender name
        const senderSpan = document.createElement("span");
        senderSpan.className = "sender-name";
        senderSpan.textContent = data.sender || "Anonymous";
        bubble.appendChild(senderSpan);
        
        // Add message text
        const textSpan = document.createElement("span");
        textSpan.className = "message-text";
        textSpan.textContent = data.message;
        bubble.appendChild(textSpan);
        
        // Add timestamp
        const timeSpan = document.createElement("span");
        timeSpan.className = "message-time";
        const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
        timeSpan.textContent = formatTime(timestamp);
        bubble.appendChild(timeSpan);

        // Determine message alignment
        if (data.sender && data.sender.trim() === username) {
            wrapper.className = "message right";
            wrapper.appendChild(bubble);
            wrapper.appendChild(avatar);
        } else {
            wrapper.className = "message left";
            wrapper.appendChild(avatar);
            wrapper.appendChild(bubble);
        }

        // Add timestamp and ID attributes
        wrapper.setAttribute('data-timestamp', timestamp.toISOString());
        wrapper.setAttribute('data-message-id', data.message_id || Date.now());

        messagesContainer.appendChild(wrapper);

        // Auto-remove after 10 minutes
        scheduleMessageRemoval(wrapper, timestamp, data.message_id);

        // Clear typing indicator
        hideTypingIndicator();
        
        // Scroll to bottom with smooth animation
        setTimeout(() => {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    function scheduleMessageRemoval(wrapper, messageTime, messageId) {
        const timeUntilExpiry = 600000 - (Date.now() - messageTime.getTime());
        
        if (timeUntilExpiry > 0) {
            const timerId = setTimeout(() => {
                wrapper.classList.add('fade-out');
                setTimeout(() => {
                    if (wrapper.parentNode) {
                        wrapper.parentNode.removeChild(wrapper);
                    }
                    if (messageId) delete messageTimers[messageId];
                }, 500);
            }, timeUntilExpiry);
            
            if (messageId) messageTimers[messageId] = timerId;
        } else {
            wrapper.style.display = 'none';
        }
    }

    function sendMessage() {
        const input = document.getElementById("messageInput");
        const message = input.value.trim();
        
        if (!message || !socket || socket.readyState !== WebSocket.OPEN) {
            showNotification("Cannot send message. Please check connection.");
            return;
        }

        // Send message
        socket.send(JSON.stringify({ 
            'message': message,
            'sender': username,
            'type': 'message'
        }));

        // Clear input and reset typing state
        input.value = "";
        isTyping = false;
        
        // Focus back to input
        input.focus();
    }

    // ================= TYPING INDICATOR =================
    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            sendMessage();
        } else {
            sendTypingIndicator();
        }
    }

    function sendTypingIndicator() {
        if (!isTyping && socket && socket.readyState === WebSocket.OPEN) {
            isTyping = true;
            socket.send(JSON.stringify({
                'type': 'typing',
                'user': username
            }));
        }
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
        }, 1000);
    }

    function showTypingIndicator(user) {
        if (user === username) return;
        
        const indicator = document.getElementById("typingIndicator");
        document.getElementById("typingUser").textContent = user;
        indicator.style.display = 'block';
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(hideTypingIndicator, 2000);
    }

    function hideTypingIndicator() {
        document.getElementById("typingIndicator").style.display = 'none';
    }

    // ================= USER MANAGEMENT =================
    function handleUserJoin(user) {
        if (user !== username) {
            onlineUsers.add(user);
            updateOnlineCount();
            showNotification(`${user} joined the chat`);
        }
    }

    function handleUserLeave(user) {
        onlineUsers.delete(user);
        updateOnlineCount();
        showNotification(`${user} left the chat`);
    }

    function updateOnlineCount() {
        const count = onlineUsers.size + 1; // +1 for current user
        document.getElementById('mobileOnlineCounter').textContent = count;
        
        // Update all room counts
        document.querySelectorAll('.online-counter').forEach(el => {
            el.textContent = count;
        });
    }

    function changeNickname() {
        const newName = prompt("Enter new nickname:", username);
        if (newName && newName.trim() && newName !== username) {
            username = newName.trim();
            localStorage.setItem("nickname", username);
            updateUserDisplay();
            showNotification(`Nickname changed to ${username}`);
        }
    }

    function updateUserDisplay() {
        document.getElementById('userNameDisplay').textContent = username;
        document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
    }

    // ================= MOBILE UI FUNCTIONS =================
    function setupMobileUI() {
        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('active');
            this.style.display = 'none';
            document.getElementById('backButton').style.display = 'flex';
        });

        // Back button
        document.getElementById('backButton').addEventListener('click', function() {
            document.getElementById('sidebar').classList.remove('active');
            this.style.display = 'none';
            document.getElementById('menuToggle').style.display = 'flex';
        });

        // Close sidebar when clicking a department link
        document.querySelectorAll('.dept').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('active');
                    document.getElementById('backButton').style.display = 'none';
                    document.getElementById('menuToggle').style.display = 'flex';
                }
            });
        });

        // Handle keyboard show/hide on mobile
        const input = document.getElementById('messageInput');
        input.addEventListener('focus', function() {
            setTimeout(() => {
                document.getElementById('messages').scrollTop = 
                    document.getElementById('messages').scrollHeight;
            }, 300);
        });

        // Handle orientation change
        window.addEventListener('orientationchange', function() {
            setTimeout(() => {
                document.getElementById('messages').scrollTop = 
                    document.getElementById('messages').scrollHeight;
            }, 300);
        });
    }

    // ================= UTILITY FUNCTIONS =================
    function updateConnectionStatus(connected) {
        const status = document.getElementById('connectionStatus');
        if (connected) {
            status.textContent = "Connected";
            status.classList.add('connected');
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        } else {
            status.textContent = "Disconnected. Reconnecting...";
            status.classList.remove('connected');
            status.style.display = 'block';
        }
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    function showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 4000;
            animation: slideDown 0.3s ease;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { top: 20px; opacity: 0; }
                to { top: 50px; opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }

    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update toggle buttons
        document.querySelectorAll('.theme-toggle button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
    }

    // Periodic cleanup check
    setInterval(() => {
        const messages = document.querySelectorAll('.message');
        const now = Date.now();
        
        messages.forEach(msg => {
            const timestamp = msg.getAttribute('data-timestamp');
            if (timestamp) {
                const messageTime = new Date(timestamp).getTime();
                if (now - messageTime > 600000 && !msg.classList.contains('fade-out')) {
                    msg.classList.add('fade-out');
                    setTimeout(() => {
                        if (msg.parentNode) {
                            msg.parentNode.removeChild(msg);
                        }
                    }, 500);
                }
            }
        });
    }, 60000);

    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        for (let id in messageTimers) {
            clearTimeout(messageTimers[id]);
        }
        
        // Send leave notification if possible
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'user_leave',
                user: username
            }));
        }
    });

    // Touch event for better mobile experience
    document.addEventListener('touchstart', function() {}, {passive: true});
