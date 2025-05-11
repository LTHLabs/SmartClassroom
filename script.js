const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector("#file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

// API setup
const API_KEY = "AIzaSyBKP_scjOxgkw9po7Bs_n1z2-sQGe8Mrdc";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
};

const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;


// ...existing code...
function showBotMessage(text) {
  const messageContent = `<svg 
      class="bot-avatar"
      xmlns="http://www.w3.org/2000/svg"
      width="50"
      height="50"
      viewBox="0 0 1024 1024"
    >
    <path
        d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
      ></path>
    </svg>
    <div class="message-text"></div>`;
  const botMessageDiv = createMessageElement(messageContent, "bot-message");
  botMessageDiv.querySelector(".message-text").textContent = text;
  chatBody.appendChild(botMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
}

// Create message element with dynamic classes and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// voice recognition setup
// --- Voice Input & Output Setup ---
const checkbox = document.getElementById("checkbox");

// Inisialisasi SpeechRecognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
  recognition.lang = "id-ID";
  recognition.interimResults = false;
}

// Pastikan voice Google Indonesia sudah dimuat
speechSynthesis.getVoices();
speechSynthesis.onvoiceschanged = () => {};

// Fungsi cek izin mikrofon (harus dipicu aksi user)
async function checkMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    recognition.start();
    console.log("🎙️ Mikrofon aktif...");
  } catch (err) {
    console.error("❌ Mikrofon tidak tersedia atau ditolak:", err);
    alert(
      "❌ Akses mikrofon ditolak. Pastikan Anda mengizinkan akses mikrofon saat diminta.\n\n" +
      "👉 Jika tidak muncul pop-up izin, buka pengaturan browser > Setelan situs > Mikrofon > izinkan untuk situs ini."
    );
    checkbox.checked = false;
  }
}

// Fungsi membersihkan karakter aneh/markdown
function cleanText(text) {
  return text
    .replace(/^\*+\s*/gm, "") // Hapus asterisk di awal baris
    .replace(/\*+\s*$/gm, "") // Hapus asterisk di akhir baris
    .replace(/\*\*(.*?)\*\*/g, "$1") // Hapus bold markdown
    .replace(/\n{2,}/g, "\n")
    .replace(/\*/g, "") // Hapus semua asterisk
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Fungsi bicara terpotong agar suara tidak putus
function speakInChunks(text, voice = null) {
  const maxChunkLength = 200;
  const chunks = text.match(
    new RegExp(`(.|[\r\n]){1,${maxChunkLength}}([.!?]\\s|$)`, "g")
  );
  if (!chunks) return;
  const speakNext = (index) => {
    if (index >= chunks.length) return;
    const utterance = new SpeechSynthesisUtterance(chunks[index].trim());
    utterance.lang = "id-ID";
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    utterance.onerror = (e) => {
      console.warn("⚠️ Error saat membacakan:", e.error);
    };
    utterance.onend = () => {
      speakNext(index + 1);
    };
    speechSynthesis.speak(utterance);
  };
  speakNext(0);
}

// Event listener untuk checkbox voice mode
checkbox.addEventListener("change", async () => {
  if (checkbox.checked) {
    console.log("🎤 Voice mode ON: Memeriksa izin mikrofon...");
    await checkMicrophonePermission();
  } else {
    console.log("🔇 Voice mode OFF");
    if (recognition) recognition.stop();
  }
});

if (recognition) {
  recognition.onstart = () => {
    console.log("🎙️ Mikrofon aktif...");
  };

  recognition.onresult = async (event) => {
    const voiceText = event.results[0][0].transcript;
    console.log("🗣️ Suara dikenali:", voiceText);
    // Tampilkan voice Anda sebagai user-message

    // Deteksi permintaan data sensor
    const sensorType = detectSensorRequest(voiceText);
    if (sensorType) {
      replyWithSensorData(sensorType);
      checkbox.checked = false;
      return;
    }
    const userMessageDiv = createMessageElement(
      `<div class="message-text"></div>`,
      "user-message"
    );
    userMessageDiv.querySelector(".message-text").textContent = voiceText;
    chatBody.appendChild(userMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    const botTypingDiv = createMessageElement(
      `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024"><path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path></svg>
      <div class="message-text"><div class="thinking-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`,
      "bot-message",
      "thinking"
    );
    chatBody.appendChild(botTypingDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Kirim ke API Gemini
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: voiceText }] }],
        }),
      });
      const result = await response.json();
      const replyText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText) {
        console.log("💬 Jawaban Gemini:", replyText);
        const cleaned = cleanText(replyText);
        const messageElement = botTypingDiv.querySelector(".message-text");
        botTypingDiv.classList.remove("thinking");
        await typeText(messageElement, cleaned, 25);
          const voices = speechSynthesis.getVoices();
          const googleVoice = voices.find(
            (v) => v.name.includes("Google") && v.lang === "id-ID");
          speakInChunks(responseText, googleVoice || null);
        } else {
        botTypingDiv.querySelector(".message-text").textContent =
          "⚠️ Jawaban dari Gemini kosong atau tidak terdeteksi.";
      }
    } catch (error) {
      botTypingDiv.querySelector(".message-text").textContent =
        "❌ Gagal memproses ke Gemini API.";
      console.error("❌ Gagal memproses ke Gemini API:", error);
    }
    checkbox.checked = false;
  };

  recognition.onerror = (event) => {
    console.error("❌ Error voice input:", event.error);
    checkbox.checked = false;
  };

  recognition.onend = () => {
    console.log("🎧 Perekaman selesai.");
  };
}
// Fungsi untuk efek mengetik
const typeText = async (element, text, delay = 25) => {
  element.innerText = "";
  for (let i = 0; i < text.length; i++) {
    element.textContent += text[i];
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
};


// Generate bot response using API
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");

  // Add user message to chat history
  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data ? [{ inline_data: userData.file }] : []),
    ],
  });

  // API request options
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: chatHistory,
    }),
  };

  try {
    // Fetch bot response from API
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    // Extract and display the bot response
    const apiResponseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/\\n/g, "\n")
      .trim();
    // Efek mengetik
    await typeText(messageElement, apiResponseText, 25);
    // messageElement.innerText = apiResponseText;

    // Add bot response to chat history
    chatHistory.push({
      role: "model",
      parts: [{ text: apiResponseText }],
    });
  } catch (error) {
    messageElement.innerHTML = `<span style="color:#d32f2f;display:flex;align-items:center;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right:6px;"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <b>Network</b> ${
        ": No connections." || error.message
      }
    </span>`;
    messageElement.style.color = "#ff0000";
  } finally {
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
};

// Handle outgoing user messages
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));

  // Create and display user message
  const messageContent = `<div class="message-text"></div>
                          ${
                            userData.file.data
                              ? `<img src=data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />`
                              : ""
                          }`;
  const outgoingMessageDiv = createMessageElement(
    messageContent,
    "user-message"
  );
  outgoingMessageDiv.querySelector(".message-text").textContent =
    userData.message;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  const sensorType = detectSensorRequest(userData.message);
  if (sensorType) {
    replyWithSensorData(sensorType);
    return;
  }
  // Simulate bot response with thinking indicator after a dely
  setTimeout(() => {
    const messageContent = `<svg 
            class="bot-avatar"
            xmlns="http://www.w3.org/2000/svg"
            width="50"
            height="50"
            viewBox="0 0 1024 1024"
          >
          <path
              d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
            ></path>
          </svg>
          <div class="message-text">
            <div class="thinking-indicator">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>`;
    const incomingMessageDiv = createMessageElement(
      messageContent,
      "bot-message",
      "thinking"
    );
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(incomingMessageDiv);
  }, 600);
};

// Handle Enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if (e.key === "Enter" && userMessage && !e.shiftKey && window.inneerWidth > 768) {
    handleOutgoingMessage(e);
  }
});


// Auto resize message input
messageInput.addEventListener("input", (e) => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector("chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

// Handle file input change
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64String = e.target.result.split(",")[1];

    // Store file data in userData
    userData.file = {
      data: base64String,
      mime_type: file.type,
    };

    fileInput.value = "";
  };

  reader.readAsDataURL(file);
});

// Emoji picker setup
// const picker = new EmojiMart.Picker({
//   theme: "light",
//   skinTonePosition: "none",
//   preview: "none",
//   onEmojiSelect: (emoji) => {
//     const { selectionStart: start, selectionEnd: end } = messageInput;
//     messageInput.setRangeText(emoji.native, start, end, "end");
//     messageInput.focus();
//   },
//   onClickOutside: (e) => {
//     if (e.target.id === "emoji-picker") {
//       document.body.classList.toggle("show-emoji-picker");
//     } else {
//       document.body.classList.remove("show-emoji-picker");
//     }
//   }
// });

// document.querySelector(".chat-form").appendChild(picker);




// Fungsi untuk mengambil data sensor dari server

async function fetchSensorData() {
  try {
    const response = await fetch("http://192.168.43.201/data", { cache: "no-store" });
    if (!response.ok) throw new Error("No data");
    const data = await response.json();

    document.getElementById("temperature").textContent =
      data.temperature !== undefined &&
      data.temperature !== null &&
      data.temperature !== ""
        ? `${data.temperature} °C`
        : "";
    document.getElementById("humidity").textContent =
      data.humidity !== undefined &&
      data.humidity !== null &&
      data.humidity !== ""
        ? `${data.humidity} %`
        : "";
    document.getElementById("gas").textContent =
      data.gas !== undefined && data.gas !== null && data.gas !== ""
        ? `${data.gas} PPM`
        : "";
    document.getElementById("ldr").textContent =
      data.ldr !== undefined && data.ldr !== null && data.ldr !== ""
        ? `${data.ldr} lux`
        : "";
    // Jika ada status, tambahkan juga:
    if (data.status !== undefined && document.getElementById('status')) {
      document.getElementById('status').textContent = data.status;
    }
  } catch (e) {
    document.getElementById('temperature').textContent = "";
    document.getElementById('humidity').textContent = "";
    document.getElementById('gas').textContent = "";
    document.getElementById('ldr').textContent = "";
    if (document.getElementById('status')) {
      document.getElementById('status').textContent = "";
    }
  }
}
// Panggil setiap 5 detik
setInterval(fetchSensorData, 3000);
// Panggil pertama kali saat halaman dimuat
fetchSensorData();

// Fungsi untuk mendeteksi permintaan data sensor
function detectSensorRequest(text) {
  text = text.toLowerCase();
  if (text.includes("suhu") || text.includes("temperature")) return "temperature";
  if (text.includes("kelembapan") || text.includes("humidity")) return "humidity";
  if (text.includes("gas")) return "gas";
  if (text.includes("cahaya") || text.includes("ldr") || text.includes("light")) return "ldr";
  if (text.includes("status")) return "status";
  return null;
}

// Fungsi untuk membalas dengan data sensor jika diminta
function replyWithSensorData(sensorType) {
  let value = "";
  let label = "";
  let notAvailableMsg = "Data sensor tidak tersedia atau sensor offline.";

  switch (sensorType) {
    case "suhu":
      value =
        latestSensorData.temperature !== undefined &&
        latestSensorData.temperature !== null &&
        latestSensorData.temperature !== ""
          ? `${latestSensorData.temperature} °C`
          : notAvailableMsg;
      label = "Suhu ruangan saat ini";
      break;
    case "kelembapan":
      value =
        latestSensorData.humidity !== undefined &&
        latestSensorData.humidity !== null &&
        latestSensorData.humidity !== ""
          ? `${latestSensorData.humidity} %`
          : notAvailableMsg;
      label = "Kelembapan saat ini";
      break;
    case "gas":
      value =
        latestSensorData.gas !== undefined &&
        latestSensorData.gas !== null &&
        latestSensorData.gas !== ""
          ? `${latestSensorData.gas} PPM`
          : notAvailableMsg;
      label = "Kadar gas saat ini";
      break;
    case "intensitas cahaya":
      value =
        latestSensorData.ldr !== undefined &&
        latestSensorData.ldr !== null &&
        latestSensorData.ldr !== ""
          ? `${latestSensorData.ldr} lux`
          : notAvailableMsg;
      label = "Intensitas cahaya saat ini";
      break;
    case "status gas":
      value =
        latestSensorData.status !== undefined &&
        latestSensorData.status !== null &&
        latestSensorData.status !== ""
          ? latestSensorData.status
          : notAvailableMsg;
      label = "Status sensor";
      break;
    default:
      value = notAvailableMsg;
      label = "";
  }
  const responseText = label ? `${label}: ${value}` : value;

  // Tampilkan indikator typing
  const botTypingDiv = createMessageElement(
    `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024"><path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path></svg>
    <div class="message-text"><div class="thinking-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`,
    "bot-message",
    "thinking"
  );
  chatBody.appendChild(botTypingDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  // Setelah delay, tampilkan pesan sensor
  setTimeout(() => {
    botTypingDiv.classList.remove("thinking");
    const messageElement = botTypingDiv.querySelector(".message-text");
    typeText(messageElement, responseText, 25);

    // Jika voice mode aktif, bacakan juga
    if (checkbox.checked) {
      const voices = speechSynthesis.getVoices();
      const googleVoice = voices.find(
        (v) => v.name.includes("Google") && v.lang === "id-ID"
      );
      speakInChunks(responseText, googleVoice || null);
    }
  }, 600); // delay sama seperti AI
}



sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
document
  .querySelector("#file-upload")
  .addEventListener("click", () => fileInput.click());

chatbotToggler.addEventListener("click", () => {
  document.body.classList.toggle("show-chatbot")
});

closeChatbot.addEventListener("click", () => {
  document.body.classList.remove("show-chatbot")
});