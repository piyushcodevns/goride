/**
 * GoRide AI Assistant (Frontend)
 * Self-contained floating widget for customer assistance.
 * Communicates with backend POST /api/ai/chat without exposing credentials.
 */

(function () {
    "use strict";

    const MAX_STORED_HISTORY = 8;
    const history = [];

    // Safe text formatting without raw HTML injection
    function createSafeMessageElement(text, role) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `ai-message ai-message-${role}`;

        const avatar = document.createElement("div");
        avatar.className = "ai-msg-avatar";
        avatar.textContent = role === "user" ? "👤" : "✨";

        const bubble = document.createElement("div");
        bubble.className = "ai-msg-bubble";

        // Format paragraphs safely
        const lines = text.split(/\n\n+/);
        lines.forEach((paragraph, idx) => {
            const p = document.createElement("p");
            p.style.margin = idx === lines.length - 1 ? "0" : "0 0 8px 0";

            // Support basic bolding: **bold text** without raw innerHTML
            const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
            parts.forEach((part) => {
                if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
                    const strong = document.createElement("strong");
                    strong.textContent = part.slice(2, -2);
                    p.appendChild(strong);
                } else {
                    p.appendChild(document.createTextNode(part));
                }
            });

            bubble.appendChild(p);
        });

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        return msgDiv;
    }

    function initAssistant() {
        // Guard against duplicate initialization
        if (document.getElementById("goride-ai-widget")) return;

        const widgetWrapper = document.createElement("div");
        widgetWrapper.id = "goride-ai-widget";

        // Build HTML template
        widgetWrapper.innerHTML = `
            <!-- Floating Toggle Button -->
            <button id="ai-assistant-toggle" class="ai-assistant-toggle-btn" aria-label="Open GoRide AI Assistant" aria-expanded="false">
                <span class="ai-toggle-icon" aria-hidden="true">✨</span>
                <span>Ask GoRide AI</span>
            </button>

            <!-- Collapsible Chat Drawer -->
            <div id="ai-chat-drawer" class="ai-chat-drawer" role="dialog" aria-label="GoRide AI Assistant" aria-hidden="true">
                <!-- Header -->
                <div class="ai-chat-header">
                    <div class="ai-header-info">
                        <div class="ai-header-avatar" aria-hidden="true">✨</div>
                        <div class="ai-header-text">
                            <h3>GoRide Assistant</h3>
                            <div class="ai-header-status">
                                <span class="ai-status-dot" aria-hidden="true"></span>
                                <span>Online • Gemini Powered</span>
                            </div>
                        </div>
                    </div>
                    <button id="ai-close-btn" class="ai-close-btn" aria-label="Close Assistant">✕</button>
                </div>

                <!-- Messages Container -->
                <div id="ai-messages-container" class="ai-messages-container" role="log" aria-live="polite">
                    <!-- Welcome Message -->
                    <div class="ai-message ai-message-model">
                        <div class="ai-msg-avatar" aria-hidden="true">✨</div>
                        <div class="ai-msg-bubble">
                            <p style="margin: 0 0 6px 0;"><strong>Hello! I'm your GoRide Assistant.</strong></p>
                            <p style="margin: 0;">How can I help you today? You can ask about cab categories, fare estimates, Varanasi service areas, or booking guidance!</p>
                        </div>
                    </div>
                </div>

                <!-- Quick Suggestion Chips -->
                <div class="ai-chips-wrapper" role="toolbar" aria-label="Suggested questions">
                    <button class="ai-chip" data-query="What vehicle categories are available in Varanasi?">🚗 Vehicle types</button>
                    <button class="ai-chip" data-query="How do I book a cab in GoRide?">📍 How to book</button>
                    <button class="ai-chip" data-query="How are fares calculated?">💰 Fare guide</button>
                    <button class="ai-chip" data-query="What safety features does GoRide provide?">🛡️ Safety features</button>
                </div>

                <!-- Input Footer -->
                <form id="ai-chat-form" class="ai-chat-input-area" autocomplete="off">
                    <input type="text" id="ai-chat-input" class="ai-chat-input" placeholder="Ask anything about GoRide..." maxlength="1000" required>
                    <button type="submit" id="ai-send-btn" class="ai-send-btn" aria-label="Send message">➤</button>
                </form>
            </div>
        `;

        document.body.appendChild(widgetWrapper);

        // Cache elements
        const toggleBtn = document.getElementById("ai-assistant-toggle");
        const drawer = document.getElementById("ai-chat-drawer");
        const closeBtn = document.getElementById("ai-close-btn");
        const messagesContainer = document.getElementById("ai-messages-container");
        const chatForm = document.getElementById("ai-chat-form");
        const chatInput = document.getElementById("ai-chat-input");
        const sendBtn = document.getElementById("ai-send-btn");
        const chips = widgetWrapper.querySelectorAll(".ai-chip");

        let isOpen = false;
        let isSending = false;

        function setDrawerOpen(open) {
            isOpen = open;
            if (open) {
                drawer.classList.add("is-active");
                drawer.setAttribute("aria-hidden", "false");
                toggleBtn.setAttribute("aria-expanded", "true");
                toggleBtn.style.display = "none";
                setTimeout(() => chatInput.focus(), 250);
            } else {
                drawer.classList.remove("is-active");
                drawer.setAttribute("aria-hidden", "true");
                toggleBtn.setAttribute("aria-expanded", "false");
                toggleBtn.style.display = "flex";
            }
        }

        toggleBtn.addEventListener("click", () => setDrawerOpen(true));
        closeBtn.addEventListener("click", () => setDrawerOpen(false));

        // Close when clicking outside on desktop
        document.addEventListener("click", (e) => {
            if (isOpen && !drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
                setDrawerOpen(false);
            }
        });

        // Quick chips click
        chips.forEach((chip) => {
            chip.addEventListener("click", () => {
                const query = chip.getAttribute("data-query");
                if (query && !isSending) {
                    chatInput.value = query;
                    sendMessage(query);
                }
            });
        });

        function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function showTypingIndicator() {
            const typingDiv = document.createElement("div");
            typingDiv.id = "ai-typing-indicator";
            typingDiv.className = "ai-message ai-message-model";
            typingDiv.innerHTML = `
                <div class="ai-msg-avatar" aria-hidden="true">✨</div>
                <div class="ai-msg-bubble">
                    <div class="ai-typing-indicator">
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(typingDiv);
            scrollToBottom();
        }

        function removeTypingIndicator() {
            const el = document.getElementById("ai-typing-indicator");
            if (el) el.remove();
        }

        async function sendMessage(userText) {
            if (!userText || !userText.trim() || isSending) return;

            const message = userText.trim();
            isSending = true;
            chatInput.value = "";
            chatInput.disabled = true;
            sendBtn.disabled = true;

            // Append user message
            messagesContainer.appendChild(createSafeMessageElement(message, "user"));
            scrollToBottom();

            // Show typing indicator
            showTypingIndicator();

            try {
                // Determine API endpoint
                const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "";
                const endpoint = `${baseUrl}/api/ai/chat`;

                // Retrieve token if available
                const token = (window.GoRide && window.GoRide.api && window.GoRide.api.getToken && window.GoRide.api.getToken()) ||
                              localStorage.getItem("goride_token");

                const headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                };
                if (token) {
                    headers["Authorization"] = `Bearer ${token}`;
                }

                // Send request with bounded history
                const payload = {
                    message,
                    history: history.slice(-MAX_STORED_HISTORY)
                };

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                removeTypingIndicator();

                if (response.ok && data.success && data.data && data.data.reply) {
                    const reply = data.data.reply;
                    messagesContainer.appendChild(createSafeMessageElement(reply, "model"));

                    // Record history
                    history.push({ role: "user", content: message });
                    history.push({ role: "model", content: reply });
                    if (history.length > MAX_STORED_HISTORY * 2) {
                        history.splice(0, 2);
                    }
                } else {
                    const errorMsg = data.message || "I apologize, but I am unable to generate a response right now. Please try again in a moment.";
                    messagesContainer.appendChild(createSafeMessageElement(errorMsg, "model"));
                }
            } catch (err) {
                removeTypingIndicator();
                messagesContainer.appendChild(
                    createSafeMessageElement("Unable to reach GoRide AI Assistant. Please check your network connection.", "model")
                );
            } finally {
                isSending = false;
                chatInput.disabled = false;
                sendBtn.disabled = false;
                chatInput.focus();
                scrollToBottom();
            }
        }

        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            sendMessage(chatInput.value);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAssistant);
    } else {
        initAssistant();
    }
})();
