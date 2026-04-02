const messagesDiv = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");

    const content = document.createElement("div");
    content.classList.add("message-content");
    content.textContent = text;

messageDiv.appendChild(content);
messagesDiv.appendChild(messageDiv);
messsagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTyping() {
    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "bot-message");
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span><span></span><span></span
        <div>`;
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function removeTyping() {
    const typing = document.getElementByID("typing-indicator");
    if (typing) typing.remove();
}

async function sendMessage() {
    const message = userInput.ariaValueMax.trim();
    if (!message) return;

    addMessage(message, "user");
    userInput.value = "";
    sendBtn.disabled = true;
    showTyping();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content=Type": "application/json"},
            body: JSON.stringify({ message}),  
        });

        const data = await response.json();
        removeTyping();

        if (data.answer) {
            addMessage(data.answer, "bot");
        } else {
            addMessage("Sorry, something went wrong. Please try again.", "bot");
        }
    
    } catch (error) {
        removeTyping();
        addMessage("Error connecting to the server. Please try again", "bot")
    }

    sendBtn.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage ();
})