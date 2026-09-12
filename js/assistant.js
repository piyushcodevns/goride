/**
 * GoRide AI Assistant (Frontend)
 * Self-contained floating widget for customer assistance.
 * Communicates with backend POST /api/ai/chat without exposing credentials.
 */

(function () {
    "use strict";

    const MAX_STORED_HISTORY = 8;
    const history = [];

    // Early safe stub for global GoRide namespace
    window.GoRide = window.GoRide || {};
    if (!window.GoRide.openAiAssistant) {
        const earlyOpenStub = function (event) {
            if (event && typeof event.preventDefault === "function") {
                event.preventDefault();
            }
            initAssistant();
            // Forward to the real implementation if it has been replaced
            if (window.GoRide.openAiAssistant && window.GoRide.openAiAssistant !== earlyOpenStub) {
                window.GoRide.openAiAssistant(event);
            }
            return false; // Ensure default action is cancelled
        };
        window.GoRide.openAiAssistant = earlyOpenStub;
        // Expose reference so the global guard can detect the stub and avoid recursion
        window.GoRide._earlyOpenStub = earlyOpenStub;
    }

    // Global click guard: intercepts ALL .ai-open-btn / [data-ai-open] clicks.
    // Runs before any per-element listener so navigation is always cancelled.
    // After initializing (idempotent), forward to the real openAiAssistant
    // implementation so the drawer opens on the same click.
    // We avoid calling this guard's logic when the current implementation IS still
    // the earlyOpenStub (it handles forwarding itself), preventing infinite recursion.
    document.addEventListener("click", (e) => {
        const trigger = e.target && e.target.closest(".ai-open-btn, [data-ai-open]");
        if (!trigger) return;
        e.preventDefault();
        // initAssistant is guarded by the widget-exists check — safe to call every time.
        initAssistant();
        // After initAssistant() the real openAssistant is now registered.
        // Call it only when it is the real implementation, not the earlyOpenStub,
        // to avoid recursion.
        const impl = window.GoRide && window.GoRide.openAiAssistant;
        if (typeof impl === "function" && impl !== window.GoRide._earlyOpenStub) {
            impl(e);
        }
    });

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
            <button id="ai-assistant-toggle" class="ai-assistant-toggle-btn ai-open-btn" data-ai-open="true" aria-label="Open GoRide AI Assistant" aria-expanded="false">
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
        let openerElement = null;

        function setDrawerOpen(open) {
            isOpen = open;
            if (open) {
                // Record the element that opened the drawer for focus restoration
                openerElement =
                    document.activeElement && typeof document.activeElement.focus === "function"
                        ? document.activeElement
                        : toggleBtn;

                drawer.classList.add("is-active");
                drawer.setAttribute("aria-hidden", "false");
                toggleBtn.setAttribute("aria-expanded", "true");
                toggleBtn.style.display = "none";
                setTimeout(() => {
                    if (isOpen && chatInput && typeof chatInput.focus === "function") {
                        chatInput.focus();
                    }
                }, 100);
            } else {
                // Make the toggle button visible so it can receive restored focus
                toggleBtn.style.display = "flex";
                toggleBtn.setAttribute("aria-expanded", "false");

                // CRITICAL: Move focus out of the drawer BEFORE setting aria-hidden="true"
                // to prevent "Blocked aria-hidden on an element because its descendant retained focus"
                const activeEl = document.activeElement;
                if (activeEl && drawer.contains(activeEl)) {
                    if (
                        openerElement &&
                        typeof openerElement.focus === "function" &&
                        document.body.contains(openerElement) &&
                        !drawer.contains(openerElement)
                    ) {
                        openerElement.focus();
                    } else if (toggleBtn && typeof toggleBtn.focus === "function") {
                        toggleBtn.focus();
                    } else if (document.body && typeof document.body.focus === "function") {
                        document.body.focus();
                    } else if (typeof activeEl.blur === "function") {
                        activeEl.blur();
                    }
                }

                // If focus is somehow still inside the drawer, explicitly blur it
                if (document.activeElement && drawer.contains(document.activeElement)) {
                    if (typeof document.activeElement.blur === "function") {
                        document.activeElement.blur();
                    }
                }

                drawer.classList.remove("is-active");
                drawer.setAttribute("aria-hidden", "true");
            }
        }

        function openAssistant(event) {
            if (event && typeof event.preventDefault === "function") {
                event.preventDefault();
            }
            setDrawerOpen(true);
        }

        // Expose openAssistant on the global GoRide namespace
        window.GoRide = window.GoRide || {};
        window.GoRide.openAiAssistant = openAssistant;

        toggleBtn.addEventListener("click", openAssistant);
        closeBtn.addEventListener("click", () => setDrawerOpen(false));

        // Bind .ai-open-btn and [data-ai-open] triggers present in the document
        document.querySelectorAll(".ai-open-btn, [data-ai-open]").forEach((trigger) => {
            if (trigger !== toggleBtn) {
                trigger.addEventListener("click", openAssistant);
            }
        });

        // Delegated click handler to intercept any dynamic or present .ai-open-btn / [data-ai-open] triggers
        document.addEventListener("click", (e) => {
            const trigger = e.target && e.target.closest && e.target.closest(".ai-open-btn, [data-ai-open]");
            if (trigger && trigger !== toggleBtn) {
                openAssistant(e);
            }
        });

        // Close when pressing Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && isOpen) {
                setDrawerOpen(false);
            }
        });

        // Close when clicking outside on desktop
        document.addEventListener("click", (e) => {
            if (
                isOpen &&
                !drawer.contains(e.target) &&
                !toggleBtn.contains(e.target) &&
                (!e.target.closest || !e.target.closest(".ai-open-btn, [data-ai-open]"))
            ) {
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
                if (isOpen && typeof chatInput.focus === "function") {
                    chatInput.focus();
                }
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
