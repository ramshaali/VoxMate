console.log("📜 content.js loaded");
let utterance;
let textNodes = [];
let currentNodeIndex = 0;
let reading = false;
let paused = false;

// Collect visible text nodes only (exclude <img>, <video>, <script>, etc.)
function getVisibleTextNodes() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName.toLowerCase();
        if (["script", "style", "img", "video", "svg"].includes(tag))
          return NodeFilter.FILTER_REJECT;
        if (getComputedStyle(node.parentElement).display === "none")
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

let lastHighlight = null;

function highlightNode(node) {
  // Remove previous highlight
  if (lastHighlight) {
    const parent = lastHighlight.parentNode;
    if (parent)
      parent.replaceChild(
        document.createTextNode(lastHighlight.textContent),
        lastHighlight
      );
    lastHighlight = null;
  }

  if (!node?.parentNode) return node;
  const span = document.createElement("span");
  span.style.backgroundColor = "#ffeb3b80";
  span.style.borderRadius = "3px";
  span.textContent = node.nodeValue;
  node.parentNode.replaceChild(span, node);
  lastHighlight = span;
  return span;
}

// Improve getVisibleTextNodes() to skip ads and popups
function getVisibleTextNodes() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const text = node.nodeValue.trim();
        if (!text) return NodeFilter.FILTER_REJECT;

        const el = node.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;

        const tag = el.tagName.toLowerCase();
        if (
          [
            "script",
            "style",
            "img",
            "video",
            "svg",
            "noscript",
            "iframe",
          ].includes(tag)
        )
          return NodeFilter.FILTER_REJECT;

        // Skip hidden elements or likely ads/popups
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden")
          return NodeFilter.FILTER_REJECT;
        if (
          el.closest(
            'header, footer, nav, aside, [role="banner"], [role="alert"], [aria-modal="true"]'
          )
        )
          return NodeFilter.FILTER_REJECT;
        if (!el.innerText || el.innerText.length < 5)
          return NodeFilter.FILTER_REJECT;

        if (el.innerText.length < 5) return NodeFilter.FILTER_REJECT; // skip tiny UI text
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

async function startReading() {
  // 🟢 Resume from pause
  if (paused) {
    console.log("▶️ Resuming reading from index", currentNodeIndex);
    paused = false;
    reading = true;
    continueReading(); // 🔁 call the loop again
    return;
  }

  // 🆕 Start fresh
  if (!reading) {
    textNodes = getVisibleTextNodes();
    if (!textNodes.length) return alert("No readable text found.");
    reading = true;
    paused = false;
    currentNodeIndex = 0;
    continueReading(); // 🔁 start loop
  }
}

async function continueReading() {
  console.log(
    `📖 Continuing from node ${currentNodeIndex}/${textNodes.length}`
  );

  for (let i = currentNodeIndex; i < textNodes.length && reading; i++) {
    if (paused) break; // ⏸️ stop immediately if paused
    const node = textNodes[i];
    if (!node) continue; // ✅ safety guard if node was removed

    const span = highlightNode(node);
    if (!span) continue;

    utterance = new SpeechSynthesisUtterance(span.textContent);
    const { userLanguage } = await chrome.storage.sync.get("userLanguage");
    utterance.lang = userLanguage || "en";

    await new Promise((resolve) => {
      utterance.onend = () => {
        // ✅ Double-check span still exists before changing its style
        if (span && span.style) {
          span.style.backgroundColor = "transparent";
        }
        currentNodeIndex = i + 1; // remember where we stopped
        resolve();
      };

      utterance.onerror = (err) => {
        console.error("🛑 Speech error:", err);
        resolve(); // continue with next node
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("🎙️ Speak failed:", err);
        resolve();
      }
    });
  }

  if (!paused) {
    console.log("🏁 Finished reading all text");
    reading = false;
    currentNodeIndex = 0;
  }
}

function pauseReading() {
  if (!reading) return;
  paused = true;
  console.log("⏸️ Paused at index", currentNodeIndex);
  window.speechSynthesis.cancel(); // ❗ cancel current utterance
}

function stopReading() {
  if (!reading) return;
  reading = false;
  paused = false;
  currentNodeIndex = 0;
  console.log("🛑 Reading stopped completely");
  window.speechSynthesis.cancel();
}

// Handle messages from popup or background
chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "read_text") startReading();
  if (req.action === "pause_read") pauseReading();
  if (req.action === "stop_read") stopReading();
  if (req.action === "translate_page") translatePage();
});

// --- existing translatePage() remains the same ---
async function translatePage() {
  console.log("⚙️ Starting page translation...");
  const bodyText = document.body.innerText.slice(0, 20000);
  chrome.runtime.sendMessage(
    { action: "translate_auto", text: bodyText },
    (response) => {
      if (!response?.success)
        return alert(`Translation failed: ${response?.error}`);
      const translatedText = response.result;
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );
      const translatedWords = translatedText.split(/\s+/);
      let index = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const words = node.nodeValue.trim().split(/\s+/);
        if (words.length > 2) {
          node.nodeValue = translatedWords
            .slice(index, index + words.length)
            .join(" ");
          index += words.length;
        }
      }
    }
  );
}

function showCommandsOverlay(text) {
  const overlay = document.createElement("div");
  overlay.id = "voice-commands-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "20px";
  overlay.style.right = "20px";
  overlay.style.zIndex = "999999";
  overlay.style.background = "rgba(0,0,0,0.8)";
  overlay.style.color = "#fff";
  overlay.style.padding = "15px 20px";
  overlay.style.borderRadius = "10px";
  overlay.style.fontFamily = "sans-serif";
  overlay.style.maxWidth = "260px";
  overlay.style.fontSize = "14px";
  overlay.style.lineHeight = "1.5";

  overlay.innerHTML = `
    <strong>${text.title}</strong><br>
    ${text.commands.map((cmd) => `<div>• ${cmd}</div>`).join("")}
  `;

  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.style.transition = "opacity 0.5s";
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 800);
  }, 8000);
}

chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "show_commands") showCommandsOverlay(req.text);
});

// helper to speak commands
function speakCommands(text) {
  const utter = new SpeechSynthesisUtterance(
    `${text.title}. ${text.commands.join(". ")}`
  );
  utter.lang = chrome.storage.sync.get("userLanguage") || "en";
  window.speechSynthesis.speak(utter);
}
function getCommandsText(lang) {
  const translations = {
    en: {
      title: "🎙️ Voice Commands",
      commands: [
        "Say 'read'",
        "Say 'pause'",
        "Say 'stop'",
        "Say 'translate'",
        "Say 'show commands'",
      ],
    },
    zh: {
      title: "🎙️ 语音命令",
      commands: ["说“读”", "说“暂停”", "说“停止”", "说“翻译”", "说“显示命令”"],
    },
    hi: {
      title: "🎙️ वॉयस कमांड्स",
      commands: [
        "'पढ़ो' कहें",
        "'रुको' कहें",
        "'बंद करो' कहें",
        "'अनुवाद करो' कहें",
        "'कमांड दिखाओ' कहें",
      ],
    },
    es: {
      title: "🎙️ Comandos de voz",
      commands: [
        "Di 'leer'",
        "Di 'pausa'",
        "Di 'detener'",
        "Di 'traducir'",
        "Di 'mostrar comandos'",
      ],
    },
  };

  return translations[lang] || translations.en;
}

let recognition;
let voiceActive = false;

function initVoiceRecognition() {
  if (!("webkitSpeechRecognition" in window)) {
    console.error("❌ Speech Recognition not supported.");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = async (event) => {
    const rawCommand =
      event.results[event.results.length - 1][0].transcript.trim();
    console.log("🎙️ Voice command:", rawCommand);

    const { userLanguage } = await chrome.storage.sync.get("userLanguage");
    let commands = [rawCommand];

    // Wait for Gemini Nano


    if (userLanguage !== "en") {
      try {
        // Ask background to translate/mapping via Gemini Nano
        if (userLanguage !== "en") {
          try {
            commands = await translateCommandText(rawCommand, userLanguage);
          } catch (e) {
            console.warn("⚠️ Could not map command:", e.message || e);
            commands = [rawCommand];
          }
        }
      } catch (e) {
        console.warn("⚠️ Could not map command:", e.message || e);
      }
    }

    // Execute commands
    commands.forEach((cmd) => {
      if (cmd.includes("read")) startReading();
      else if (cmd.includes("pause")) pauseReading();
      else if (cmd.includes("stop")) stopReading();
      else if (cmd.includes("translate")) translatePage();
      else if (cmd.includes("show")) {
        const text = getCommandsText(userLanguage);
        showCommandsOverlay(text);
        speakCommands(text);
      } else if (cmd.includes("summarise") || cmd.includes("ask")) {
        // Implement your summarise/ask logic here
        console.log("📝 Trigger summarise/ask function for command:", cmd);
      }
    });
  };

  recognition.onerror = (e) => console.error("🎙️ Recognition error:", e.error);
  recognition.onend = () => {
    if (voiceActive) recognition.start(); // keep alive
  };

  recognition.start();
  voiceActive = true;
  console.log("🎧 Voice recognition started");
}

function stopVoiceRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
    voiceActive = false;
    console.log("🛑 Voice recognition stopped");
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggle_voice") {
    voiceActive ? stopVoiceRecognition() : initVoiceRecognition();
  }
});

chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "show_commands") {
    const { text } = req;

    // Remove old overlay if it exists
    const old = document.getElementById("ai-voice-commands-overlay");
    if (old) old.remove();

    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "ai-voice-commands-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "20px";
    overlay.style.right = "20px";
    overlay.style.zIndex = "999999";
    overlay.style.background = "rgba(0,0,0,0.8)";
    overlay.style.color = "white";
    overlay.style.padding = "15px";
    overlay.style.borderRadius = "12px";
    overlay.style.fontSize = "14px";
    overlay.style.maxWidth = "250px";
    overlay.style.lineHeight = "1.5";
    overlay.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";

    const title = document.createElement("div");
    title.textContent = text?.title || "🎙️ Voice Commands";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "8px";
    overlay.appendChild(title);

    (
      text?.commands || [
        "Say 'read' to start reading",
        "Say 'pause' to pause",
        "Say 'stop' to stop reading",
        "Say 'translate' to translate page",
      ]
    ).forEach((cmd) => {
      const li = document.createElement("div");
      li.textContent = "• " + cmd;
      overlay.appendChild(li);
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✖ Close";
    closeBtn.style.marginTop = "10px";
    closeBtn.style.background = "#444";
    closeBtn.style.color = "#fff";
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "6px";
    closeBtn.style.padding = "4px 10px";
    closeBtn.style.cursor = "pointer";
    closeBtn.addEventListener("click", () => overlay.remove());
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
  }

});

async function translateCommandText(text, userLanguage = "en") {
  console.log("🎧 Sending command to background for Gemini translation...");

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: "translate_with_gemini",
        text,
        userLanguage,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Message error:", chrome.runtime.lastError.message);
          resolve([text]);
          return;
        }

        if (!response?.success) {
          console.warn("⚠️ Gemini translation failed:", response?.reason || response?.error);
          resolve([text]);
          return;
        }

        const result = (response.result || "")
          .split(",")
          .map((cmd) => cmd.trim().toLowerCase())
          .filter(Boolean);

        console.log("🌍 Gemini interpreted commands:", result);
        resolve(result.length ? result : [text]);
      }
    );
  });
}


let geminiReady = false;

async function initGeminiAfterGesture() {
  console.log("🚀 Checking Gemini availability...");
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkGemini'
    });
    
    console.log("📬 Gemini check result:", response);
    
    if (response.success) {
      geminiReady = true;
      console.log("✅ Gemini Nano is ready!");
      console.log("   Availability:", response.availability);
      hideCommandsOverlay();
      
      // Now you can send prompts
      // await sendPrompt("Your prompt here");
    } else {
      console.error("❌ Gemini not available:", response.reason);
      showGeminiStatusOverlay({
        title: "⚠️ Gemini Nano Unavailable",
        commands: [
          `Status: ${response.reason}`,
          response.availability ? `Availability: ${response.availability}` : '',
          response.debug ? `Debug: ${JSON.stringify(response.debug)}` : '',
          "Check chrome://on-device-internals for model status"
        ].filter(Boolean)
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    showGeminiStatusOverlay({
      title: "⚠️ Extension Error",
      commands: [
        error.message,
        "Try reloading the extension"
      ]
    });
  }
}

// Function to send a prompt to Gemini
async function sendPrompt(prompt) {
  try {
    console.log("📤 Sending prompt:", prompt);
    
    const response = await chrome.runtime.sendMessage({
      action: 'prompt',
      prompt: prompt
    });
    
    if (response.success) {
      console.log("📥 Response:", response.result);
      return response.result;
    } else {
      console.error("❌ Prompt failed:", response.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Error sending prompt:", error);
    return null;
  }
}

// Setup gesture listener
function setupUserGestureForGemini() {
  console.log("🎯 Waiting for user gesture...");
  const gestureEvents = ["click", "keydown", "touchstart"];
  
  const gestureHandler = async () => {
    console.log("👆 User gesture detected!");
    await initGeminiAfterGesture();
    
    gestureEvents.forEach((evt) => 
      document.removeEventListener(evt, gestureHandler)
    );
  };
  
  gestureEvents.forEach((evt) => 
    document.addEventListener(evt, gestureHandler, { once: true })
  );
}

// UI Helper functions
function showGeminiStatusOverlay(config) {
  console.log("📢", config.title);
  config.commands.forEach(cmd => console.log("  -", cmd));
  // TODO: Implement your actual UI overlay here
}

function hideCommandsOverlay() {
  console.log("✓ Overlay hidden");
  // TODO: Implement your actual UI overlay hiding here
}

// Initialize
console.log("📜 Gemini content script loaded");
setupUserGestureForGemini();

showGeminiStatusOverlay({
  title: "⚠️ Gemini Nano requires interaction",
  commands: ["Click anywhere on the page to activate AI features."]
});

// Export for use in other parts of your extension
window.geminiAPI = {
  isReady: () => geminiReady,
  sendPrompt: sendPrompt
};