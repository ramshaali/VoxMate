console.log("📜 content.js loaded");

// ===============================
// Highlighting & Reading functions
// ===============================
let utterance;
let textNodes = [];
let currentNodeIndex = 0;
let reading = false;
let paused = false;
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
  // Resume from pause
  if (paused) {
    console.log("▶️ Resuming reading from index", currentNodeIndex);
    paused = false;
    reading = true;
    continueReading(); // 🔁 call the loop again
    return;
  }

  // Start fresh
  if (!reading) {
    textNodes = getVisibleTextNodes();
    if (!textNodes.length) return alert("No readable text found.");
    reading = true;
    paused = false;
    currentNodeIndex = 0;
    continueReading(); // start loop
  }
}

async function continueReading() {
  console.log(
    `Continuing from node ${currentNodeIndex}/${textNodes.length}`
  );

  for (let i = currentNodeIndex; i < textNodes.length && reading; i++) {
    if (paused) break; // stop immediately if paused
    const node = textNodes[i];
    if (!node) continue; // safety guard if node was removed

    const span = highlightNode(node);
    if (!span) continue;

    utterance = new SpeechSynthesisUtterance(span.textContent);
    const { userLanguage } = await chrome.storage.sync.get("userLanguage");
    utterance.lang = userLanguage || "en";

    await new Promise((resolve) => {
      utterance.onend = () => {
        // Double-check span still exists before changing its style
        if (span && span.style) {
          span.style.backgroundColor = "transparent";
        }
        currentNodeIndex = i + 1; // remember where we stopped
        resolve();
      };

      utterance.onerror = (err) => {
        console.error("Speech error:", err);
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
  window.speechSynthesis.cancel(); // cancel current utterance
}

function stopReading() {
  if (!reading) return;
  reading = false;
  paused = false;
  currentNodeIndex = 0;
  console.log("Reading stopped completely");
  window.speechSynthesis.cancel();
}
// =======================================
// Handle messages from popup or background
// =======================================
chrome.runtime.onMessage.addListener(async (req) => {
  const { userLanguage } = await chrome.storage.sync.get("userLanguage");
  console.log("user language: ",userLanguage )
  if (req.action === "read_text") startReading();
  if (req.action === "pause_read") pauseReading();
  if (req.action === "stop_read") stopReading();
  if (req.action === "translate_page") translatePage();


  if (req.action === "show_commands") {
    const text = getCommandsText(userLanguage);
    window.voxmateOverlay.showCommands(text);
  }

  if (req.action === "ask_command") {
    const { question } = req;
    if (!question) return;
    console.log("💬 User asked:", question);
    handleAskCommand(question);
  }

  if (req.action === "summarise_page") {
    handleSummarisePage();
  }

});

// =======================================
// TranslatePage
// =======================================
async function translatePage() {
  const loadingId = 'translate_' + Date.now();

  try {
    console.log("⚙️ Starting page translation...");
    window.voxmateOverlay.showLoading(
      "Translating page content...",
      "Translation",
      loadingId
    );

    const bodyText = document.body.innerText.slice(0, 20000);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "translate_auto", text: bodyText },
        (response) => {
          
          window.voxmateOverlay.removeLoading(loadingId);

          if (!response?.success) {
            console.error("❌ Translation failed:", response?.error);
            window.voxmateOverlay.showError(
              `Translation failed: ${response?.error || 'Unknown error'}`,
              "Translation Error"
            );
            resolve(false);
            return;
          }

          try {
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

            window.voxmateOverlay.showSuccess(
              "Page translation completed successfully!",
              "Translation Complete"
            );
            resolve(true);
          } catch (error) {
            console.error("❌ Error applying translation:", error);
            window.voxmateOverlay.showError(
              "Error applying translation to page",
              "Application Error"
            );
            resolve(false);
          }
        }
      );
    });
  } catch (error) {
    console.error("❌ Error in translatePage:", error);
    window.voxmateOverlay.removeLoading(loadingId);
    window.voxmateOverlay.showError(
      "Failed to start translation process",
      "Process Error"
    );
    return false;
  }
}


// -------------------------------
// Local command mapper (returns same object shape as Gemini mapping)
// -------------------------------
function mapLocalCommand(rawText, userLang = "en") {
  const raw = String(rawText || "").trim();
  const rawLC = raw.toLowerCase();

  // Phrase maps per language (you can expand)
  const maps = {
    en: {
      read: ["read", "start reading", "read page", "read this"],
      pause: ["pause", "hold on", "wait"],
      stop: ["stop", "cancel", "end reading", "stop reading"],
      translate: ["translate", "translate page", "translate this"],
      "show commands": ["show commands", "commands", "help", "what can you say", "what can i say"],
      summarise: ["summarise", "summarize", "summary", "summarize this", "summarise this"],
    },
    zh: {
      read: ["读", "朗读"],
      pause: ["暂停"],
      stop: ["停止"],
      translate: ["翻译"],
      "show commands": ["显示命令", "命令", "帮助"],
      summarise: ["总结"],
    },
    es: {
      read: ["leer"],
      pause: ["pausa"],
      stop: ["detener"],
      translate: ["traducir"],
      "show commands": ["comandos", "mostrar comandos", "ayuda"],
      summarise: ["resumir"],
    },
    fr: {
      read: ["lire"],
      pause: ["pause"],
      stop: ["arrêter", "stop"],
      translate: ["traduire"],
      "show commands": ["commandes", "afficher les commandes", "aide"],
      summarise: ["résumer"],
    }
  };

  // Use userLang map AND english map (english always included)
  const primaryMap = maps[userLang] || {};
  const englishMap = maps["en"];

  // helper to test if any phrase matches (word boundary-ish)
  const phraseMatches = (phrase) => {
    const p = phrase.toLowerCase();
    // match whole words or common multiword phrases
    return rawLC.includes(` ${p}`) || rawLC.startsWith(p) || rawLC.endsWith(p) || rawLC === p || rawLC.includes(p + " ");
  };

  // check primaryLang first
  for (const [cmd, phrases] of Object.entries(primaryMap)) {
    if (phrases.some(phraseMatches)) {
      // If command is 'ask' like question? handled below
      if (cmd === "show commands") {
        return [{ command: "show commands", raw }];
      }
      if (cmd === "summarise") {
        return [{ command: "summarise", raw }];
      }
      return [{ command: cmd, raw }];
    }
  }

  // always also check English map
  for (const [cmd, phrases] of Object.entries(englishMap)) {
    if (phrases.some(phraseMatches)) {
      if (cmd === "show commands") {
        return [{ command: "show commands", raw }];
      }
      if (cmd === "summarise") {
        return [{ command: "summarise", raw }];
      }
      return [{ command: cmd, raw }];
    }
  }

  // If the utterance *looks* like a question -> treat as ask
  if (/^(what|who|how|when|why|where|which|is|are)\b/i.test(rawLC) || rawLC.endsWith("?")) {
    return [{ command: "ask", question: raw, raw }];
  }

  // Some natural "ask" phrases in other languages
  if (/(ask|tell me|explain|define|बताओ|बताइए|请问|请告诉我|पुछो)/i.test(raw)) {
    // extract probable question part (naive)
    const q = raw.replace(/^(ask|tell me|explain|define)\s*/i, "").trim();
    return [{ command: "ask", question: q || raw, raw }];
  }

  // No confident local mapping
  return [{ command: "unknown", raw }];
}

// -------------------------------
// Robust speakCommands (async) - fixes chrome.storage usage and string checks
// -------------------------------
async function speakCommands(text) {
  try {
    window.speechSynthesis.cancel();

    const title = text?.title ? String(text.title) : "Commands";
    const commandsList = Array.isArray(text?.commands) ? text.commands.join(". ") : String(text?.commands || "");

    const { userLanguage } = await chrome.storage.sync.get("userLanguage");
    const lang = userLanguage || "en";

    const utter = new SpeechSynthesisUtterance(`${title}. ${commandsList}`);
    utter.lang = (lang === "en" ? "en-US" : (lang === "zh" ? "zh-CN" : lang));
    utter.onend = () => console.log("✅ Finished speaking commands");
    utter.onerror = (err) => {
      console.error("🔊 speakCommands error:", err);
      if (err && err.error === "not-allowed") {
        console.warn("🔇 Speech blocked. Ensure the page had a user gesture to enable audio.");
      }
    };

    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.error("❌ speakCommands failed:", e);
  }
}

function getCommandsText(lang) {
  const translations = {
    en: {
      title: "Voice Commands",
      commands: [
        "Say 'read'",
        "Say 'pause'",
        "Say 'stop'",
        "Say 'translate'",
        "Say 'show commands'",
      ],
    },
    zh: {
      title: "语音命令",
      commands: ["说“读”", "说“暂停”", "说“停止”", "说“翻译”", "说“显示命令”"],
    },
    es: {
      title: "Comandos de voz",
      commands: [
        "Di 'leer'",
        "Di 'pausa'",
        "Di 'detener'",
        "Di 'traducir'",
        "Di 'mostrar comandos'",
      ],
    },
    fr: {
      title: "Commandes vocales",
      commands: [
        "Dites 'lire'",
        "Dites 'pause'",
        "Dites 'arrêter'",
        "Dites 'traduire'",
        "Dites 'afficher les commandes'",
      ],
    },

  };

  return translations[lang] || translations.en;
}

// =======================================
// Handle voice Input
// =======================================
let recognition;
let voiceActive = false;

function initVoiceRecognition() {
  if (!("webkitSpeechRecognition" in window)) {
    console.error("❌ Speech Recognition not supported.");
    return;
  }

  recognition = new webkitSpeechRecognition();

  // set language based on user preference where possible (fallback to en-US)
  chrome.storage.sync.get("userLanguage", ({ userLanguage }) => {
    const lang = userLanguage || "en";
    // Map small codes to speech recognition locales
    const recognitionLangMap = {
      en: "en-US",
      zh: "zh-CN",
      es: "es-ES",
      fr: "fr-FR",
    };
    recognition.lang = recognitionLangMap[lang] || "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
      const rawCommand = event.results[event.results.length - 1][0].transcript.trim();
      console.log("🎙️ Voice command:", rawCommand);
      window.voxmateOverlay.showInfo(`Heard: "${rawCommand}"`, "Voice Command", { duration: 3000 });

      const { userLanguage } = await chrome.storage.sync.get("userLanguage");
      const lang = userLanguage || "en";

      // 1) Try local/direct mapping (primary language + english)
      let commandObjects = mapLocalCommand(rawCommand, lang);
      console.log("🔎 Local mapping result:", commandObjects);

      // 2) If local mapping returns unknown -> fallback to Gemini mapping
      if (!commandObjects || (commandObjects.length === 1 && commandObjects[0].command === "unknown")) {
        try {
          console.log("➡️ Fallback to Gemini mapping...");
          const geminiResult = await translateCommandText(rawCommand, lang);
          // translateCommandText in your code returns an array or single object. Normalize:
          if (Array.isArray(geminiResult) && geminiResult.length) {
            commandObjects = geminiResult;
          } else if (geminiResult && geminiResult.command) {
            commandObjects = [geminiResult];
          } else {
            commandObjects = [{ command: "unknown", raw: rawCommand }];
          }
        } catch (err) {
          console.warn("⚠️ Gemini mapping failed, continuing with unknown:", err);
          commandObjects = [{ command: "unknown", raw: rawCommand }];
        }
      }

      // 3) Execute pipeline for each mapped object
      commandObjects.forEach(({ command, question, raw }) => {
        console.log(`⚙️ Executing command: ${command}`, question ? `(Question: ${question})` : "");

        switch (command) {
          case "read":
            startReading();
            break;
          case "pause":
            pauseReading();
            break;
          case "stop":
            stopReading();
            break;
          case "translate":
            translatePage();
            break;
          case "show commands":
            if (popupFrame?.contentWindow) {
              popupFrame.contentWindow.postMessage({ type: "voice-command", command: "show_commands" }, "*");
            }
            const text = getCommandsText(userLanguage);
            window.voxmateOverlay.showCommands(text);
            speakCommands(text);
            break;
          case "summarise":
            console.log("📝 Trigger summarise function");
            if (popupFrame?.contentWindow) {
              popupFrame.contentWindow.postMessage({ type: "voice-command", command: "summarise" }, "*");
            }
            handleSummarisePage().then((summary) => {
              if (summary) {
                console.log("🧠 Summary ready:", summary);
                speakAnswer(summary);
              }
            });
            break;
          case "ask":
            console.log("💬 User asked:", question || raw);
            if (popupFrame?.contentWindow) {
              popupFrame.contentWindow.postMessage({ type: "voice-command", command: "ask" }, "*");
            }
            // handleAskCommand returns the answer; ensure speaking from voice context
            handleAskCommand(question || raw).then((answer) => {
              if (answer) {
                console.log("🔊 Speaking from voice recognition context...");
                speakAnswer(answer);
              }
            });
            break;
          default:
            console.log("🤷 Unknown command, ignoring:", raw);
            break;
        }
      });
    };

    recognition.onerror = (e) => console.error("🎙️ Recognition error:", e.error);
    recognition.onend = () => {
      if (voiceActive) recognition.start(); // keep alive
    };

    recognition.start();
    voiceActive = true;
    console.log("🎧 Voice recognition started (lang:", recognition.lang, ")");
  });
}

function stopVoiceRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
    voiceActive = false;
    console.log("Voice recognition stopped");
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggle_voice") {
    voiceActive ? stopVoiceRecognition() : initVoiceRecognition();
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
          resolve([{ command: "unknown", raw: text }]);
          return;
        }

        if (!response?.success) {
          console.warn("⚠️ Gemini translation failed:", response?.reason || response?.error);
          resolve([{ command: "unknown", raw: text }]);
          return;
        }

        const result = response.result;
        console.log("🌍 Gemini interpreted command object:", result);

        if (result?.command) {
          resolve([result]); // structured [{ command, question? }]
        } else {
          resolve([{ command: "unknown", raw: text }]);
        }
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


// handleAskCommand function
async function handleAskCommand(question) {
  const loadingId = 'ask_' + Date.now();
  
  try {
    console.log("💬 Asking Gemini:", question);
    window.voxmateOverlay.showLoading(
      "Analyzing page content and finding the best answer...",
      "Asking Gemini",
      loadingId
    );

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "ask_with_gemini", question },
        (response) => {
          // Remove loading overlay first - this now uses immediate removal
          window.voxmateOverlay.removeLoading(loadingId);

          if (chrome.runtime.lastError) {
            console.error("❌ Ask message error:", chrome.runtime.lastError.message);
            window.voxmateOverlay.showError(
              "Gemini service is currently unavailable. Please try again later.",
              "Service Unavailable"
            );
            resolve(null);
            return;
          }

          if (!response?.success) {
            console.warn("⚠️ Ask failed:", response?.reason || response?.error);
            window.voxmateOverlay.showWarning(
              "I couldn't find a clear answer to your question in the page content.",
              "Answer Not Found"
            );
            resolve(null);
            return;
          }

          const answer = response.answer?.trim() || "No clear answer found in the page content.";
          console.log("🧠 Gemini Answer:", answer);
          
          // Use the new Q&A format that shows both question and answer
          window.voxmateOverlay.showQuestionAnswer(question, answer, "Gemini Answer");

          resolve(answer);
        }
      );
    });
  } catch (error) {
    console.error("❌ Error in handleAskCommand:", error);
    window.voxmateOverlay.removeLoading(loadingId);
    window.voxmateOverlay.showError(
      "An unexpected error occurred while processing your question.",
      "Processing Error"
    );
    return null;
  }
}

// -------------------------------
// Speak answer helper
// -------------------------------
async function speakAnswer(text) {
  // Stop any current speech so answers don't overlap
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    console.warn("Speech cancel failed", e);
  }

  // get user language from storage (your code uses await chrome.storage.sync.get elsewhere)
  const { userLanguage } = await chrome.storage.sync.get("userLanguage");
  const lang = userLanguage || "en";

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.onend = () => {
    console.log("🔊 Finished speaking the answer");
  };
  utter.onerror = (err) => {
    console.error("🔊 Speech error:", err);
  };

  try {
    window.speechSynthesis.speak(utter);
  } catch (err) {
    console.error("🔊 speak() failed:", err);
  }
}

// =======================================
// Helper: Handle Page Summarisation
// =======================================
async function handleSummarisePage() {
  const loadingId = 'summary_' + Date.now();

  try {
    console.log("🧠 Starting summarisation...");
    window.voxmateOverlay.showLoading(
      "Reading page content and generating concise summary...",
      "Generating Summary",
      loadingId
    );

    const { userLanguage } = await chrome.storage.sync.get("userLanguage");
    const lang = userLanguage || "en";

    const text = document.body?.innerText || "";
    if (!text.trim()) {
      window.voxmateOverlay.removeLoading(loadingId);
      window.voxmateOverlay.showWarning(
        "No readable text found on this page to summarize.",
        "No Content"
      );
      return null;
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "run_summarizer", text, lang },
        (response) => {
          
          // Remove loading overlay first - this now uses immediate removal
          window.voxmateOverlay.removeLoading(loadingId);

          if (chrome.runtime.lastError) {
            console.error("❌ Summariser error:", chrome.runtime.lastError.message);
            window.voxmateOverlay.showError(
              "Summarization service is currently unavailable.",
              "Service Error"
            );
            resolve(null);
            return;
          }

          if (!response?.success) {
            console.warn("⚠️ Summarisation failed:", response?.reason || response?.error);
            window.voxmateOverlay.showError(
              "Could not generate summary at this time.",
              "Summary Failed"
            );
            resolve(null);
            return;
          }

          const summary = response.summary?.trim() || "No summary could be generated from this page.";
          console.log("📝 Summary received:", summary);

          window.voxmateOverlay.showInfo(summary, "Page Summary");
          resolve(summary);
        }
      );
    });
  } catch (err) {
    console.error("❌ Error in handleSummarisePage:", err);
    window.voxmateOverlay.removeLoading(loadingId);
    window.voxmateOverlay.showError(
      "An unexpected error occurred while summarizing.",
      "Error"
    );
    return null;
  }
}



// top-level in content.js
let popupFrame = null;
let parentClickForwarder = null;

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.action === "togglePopup") {
    // Close if open
    if (popupFrame) {
      // remove parent click listener
      if (parentClickForwarder) {
        document.removeEventListener("click", parentClickForwarder, true);
        parentClickForwarder = null;
      }

      popupFrame.remove();
      popupFrame = null;
      return;
    }

    // Create iframe for popup.html (runs in extension sandbox)
    popupFrame = document.createElement("iframe");
    popupFrame.id = "voxmate-iframe";
    popupFrame.src = chrome.runtime.getURL("src/popup/popup.html");

    Object.assign(popupFrame.style, {
      position: "fixed",
      top: "60px",
      right: "40px",
      zIndex: "2147483647",
      width: "420px",
      height: "575px",
      border: "none",
      borderRadius: "16px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      overflow: "auto",
      background: "transparent",
    });

    document.body.appendChild(popupFrame);

    // Forward parent clicks to the iframe so the iframe can react
    parentClickForwarder = (e) => {
      // if click target is the iframe toggle button (if any), you can early-ignore here.
      // If you want to ignore clicks on the iframe element itself:
      if (e.target === popupFrame) return;

      // Send a simple message into the iframe
      // You could restrict origin to chrome-extension://... but '*' is fine for this case
      popupFrame.contentWindow?.postMessage({ type: "parent-click" }, "*");
    };

    // Use capture phase (true) so we get clicks early
    document.addEventListener("click", parentClickForwarder, true);

    // Listen for close message from iframe
    window.addEventListener("message", (e) => {
      const data = e.data || {};
      if (data.type === "voxmate-close") {
        if (popupFrame) {
          popupFrame.style.transition = "opacity 0.01s ease";
          popupFrame.style.opacity = "0";
          setTimeout(() => {
            // cleanup
            document.removeEventListener("click", parentClickForwarder, true);
            parentClickForwarder = null;
            if (popupFrame && popupFrame.parentNode) {
            popupFrame.remove();
          }
          popupFrame = null;

          }, 100);
        }
      }
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      if (popupFrame) popupFrame.remove();
      popupFrame = null;
      if (parentClickForwarder) {
        document.removeEventListener("click", parentClickForwarder, true);
        parentClickForwarder = null;
      }
    });
  }
});




