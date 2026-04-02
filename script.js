const messagesDiv = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("file-input");
const uploadStatus = document.getElementById("upload-status");

// ============ FILE UPLOAD ============

uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadBtn.disabled = true;
    uploadStatus.textContent = "Processing...";

    try {
        let text = "";

        if (file.name.endsWith(".txt")) {
            text = await file.text();
        } else if (file.name.endsWith(".pdf")) {
            text = await extractPdfText(file);
        } else {
            uploadStatus.textContent = "Please upload a .pdf or .txt file";
            uploadBtn.disabled = false;
            return;
        }

        uploadStatus.textContent = "Uploading to database...";

        const response = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text, filename: file.name }),
        });

        const data = await response.json();

        if (data.success) {
            uploadStatus.textContent = `"${file.name}" uploaded (${data.chunks} chunks)`;
            addMessage(`Document "${file.name}" has been uploaded and processed. You can now ask questions about it!`, "bot");
        } else {
            uploadStatus.textContent = "Upload failed: " + (data.error || "Unknown error");
        }
    } catch (error) {
        uploadStatus.textContent = "Upload failed. Please try again.";
        console.error("Upload error:", error);
    }

    uploadBtn.disabled = false;
    fileInput.value = "";
});

async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n";
    }

    return fullText;
}

// ============ CHAT ============

function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");

    const content = document.createElement("div");
    content.classList.add("message-content");
    content.textContent = text;

    messageDiv.appendChild(content);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTyping() {
    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "bot-message");
    typingDiv.id = "typing-indicator";
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span><span></span><span></span>
        </div>`;
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function removeTyping() {
    const typing = document.getElementById("typing-indicator");
    if (typing) typing.remove();
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    userInput.value = "";
    sendBtn.disabled = true;
    showTyping();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
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
        addMessage("Error connecting to the server. Please try again.", "bot");
    }

    sendBtn.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});