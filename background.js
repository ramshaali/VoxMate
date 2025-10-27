console.log('🧠 background.js loaded with voice + translation support');
chrome.runtime.onMessage.addListener((request) => {
  console.log("📩 [DEBUG] Received action:", request.action, request);
});
chrome.runtime.onStartup.addListener(() => console.log("🚀 Background started"));
chrome.runtime.onInstalled.addListener(() => console.log("🧩 Extension installed"));

// ===============================
// 🟢 INITIAL SETUP
// ===============================
chrome.runtime.onInstalled.addListener(async () => {
  const systemLang = navigator.language?.split('-')[0] || 'en';
  await chrome.storage.sync.set({ userLanguage: systemLang });
  console.log('🌐 Default language set:', systemLang);
});

// ===============================
// 🌐 TRANSLATION FUNCTIONS
// ===============================
let translatorCache = null;

async function detectLanguage(text) {
  console.log('🔍 Detecting language...');
  if (!('LanguageDetector' in self)) throw new Error('Language Detector API not supported.');

  const availability = await LanguageDetector.availability();
  console.log('📦 Detector model availability:', availability);

  const detector = await LanguageDetector.create();
  const results = await detector.detect(text);
  console.log('📊 Detection results:', results);
  return results[0]?.detectedLanguage || 'en';
}

async function translateText(text, userLanguage) {
  console.log('🔁 Translating text...');
  if (!('Translator' in self) || !('LanguageDetector' in self)) {
    throw new Error('Translation APIs not supported in this browser.');
  }

  const sourceLanguage = await detectLanguage(text);
  console.log(`🌍 Detected: ${sourceLanguage} → ${userLanguage}`);

  const availability = await Translator.availability({ sourceLanguage, targetLanguage: userLanguage });
  console.log('📦 Translator availability:', availability);

  if (availability !== 'available' && availability !== 'downloadable') {
    throw new Error(`Model unavailable for ${sourceLanguage} → ${userLanguage}.`);
  }

  try {
    if (
      translatorCache &&
      translatorCache.sourceLanguage === sourceLanguage &&
      translatorCache.targetLanguage === userLanguage
    ) {
      console.log('♻️ Reusing cached translator');
    } else {
      console.log('⬇️ Creating new translator...');
      translatorCache = await Translator.create({
        sourceLanguage,
        targetLanguage: userLanguage,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`📶 Model download progress: ${(e.loaded * 100).toFixed(1)}%`);
          });
        }
      });
    }
  } catch (err) {
    console.error('❌ Translator model creation failed:', err);
    throw new Error('Model not available or download failed. Please retry.');
  }

  const translated = await translatorCache.translate(text);
  console.log('✅ Translation done.');
  return translated;
}

// ===============================
// 📩 MESSAGE HANDLER
// ===============================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 Message received in background:', request.action);

  if (request.action === "translate_auto") {
    // Keep alive for async
    (async () => {
      const { userLanguage } = await chrome.storage.sync.get("userLanguage");
      console.log("🔧 User target language:", userLanguage);

      if (request.isVoiceCommand) {
        console.log("🎧 Voice command translation request received:", request.text);
        try {
          const translated = await translateCommandText(request.text);
          sendResponse({ success: true, result: translated });
        } catch (err) {
          console.error("❌ Voice command translation failed:", err);
          sendResponse({ success: false, error: err.message });
        }
        return;
      }

      // Normal translation
      try {
        const result = await translateText(request.text, request.targetLang || userLanguage);
        console.log("✅ Sending translated result back");
        sendResponse({ success: true, result });
      } catch (err) {
        console.error("❌ Translation failed:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();

    // <-- This keeps the service worker alive
    return true;
  }

  if (request.action === 'toggle_voice') {
    toggleVoiceRecognition?.();
  }

  if (request.action === 'show_commands') {
    showCommandOverlay?.();
  }

  return true; // Always keep async channel open
});

// ===============================
// 🎧 KEYBOARD SHORTCUT + COMMAND SCREEN
// ===============================
chrome.commands.onCommand.addListener(async (command) => {
  console.log('⌨️ Shortcut pressed:', command);
  if (command === 'toggle_voice_mode') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      // Send toggle to active tab — content script handles it
      chrome.tabs.sendMessage(tab.id, { action: 'toggle_voice' });
    }
  }
});

// ===============================
// 🧩 SHOW COMMAND OVERLAY HANDLER
// ===============================
async function showCommandOverlay() {
  const { userLanguage } = await chrome.storage.sync.get("userLanguage");
  const translations = {
    en: {
      title: "🎙️ Voice Commands",
      commands: [
        "Say 'read' to start reading",
        "Say 'pause' to pause",
        "Say 'stop' to stop reading",
        "Say 'translate' to translate this page",
        "Say 'show commands' to display this list"
      ]
    },
    hi: {
      title: "🎙️ वॉयस कमांड्स",
      commands: [
        "'पढ़ो' कहें पढ़ना शुरू करने के लिए",
        "'रुको' कहें रोकने के लिए",
        "'बंद करो' कहें समाप्त करने के लिए",
        "'अनुवाद करो' कहें पृष्ठ अनुवाद के लिए",
        "'कमांड दिखाओ' कहें यह सूची दिखाने के लिए"
      ]
    },
    es: {
      title: "🎙️ Comandos de voz",
      commands: [
        "Di 'leer' para empezar a leer",
        "Di 'pausa' para pausar",
        "Di 'detener' para detener la lectura",
        "Di 'traducir' para traducir esta página",
        "Di 'mostrar comandos' para ver esta lista"
      ]
    },
    zh: {
      title: "🎙️ 语音命令",
      commands: [
        "说“读”开始朗读",
        "说“暂停”暂停朗读",
        "说“停止”结束朗读",
        "说“翻译”翻译此页面",
        "说“显示命令”显示此列表"
      ]
    }
  };

  const text = translations[userLanguage] || translations.en;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "show_commands", text });
    }
  });
}
// background.js (Manifest V3 service worker)
// In background.js, update the handleCheckGemini function:

async function handleCheckGemini(tabId) {
  try {
    console.log("🔍 Checking Gemini availability for tab:", tabId);
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: async () => {
        console.log("🌍 Running in MAIN world");
        console.log("window.ai exists:", !!window.ai);
        
        if (!window.ai) {
          return { 
            success: false, 
            reason: 'window.ai not available',
            debug: { windowAi: typeof window.ai }
          };
        }
        
        console.log("window.ai.languageModel exists:", !!window.ai.languageModel);
        
        if (!window.ai.languageModel) {
          return { 
            success: false, 
            reason: 'window.ai.languageModel not available',
            debug: { 
              aiKeys: Object.keys(window.ai),
              languageModel: typeof window.ai.languageModel
            }
          };
        }
        
        try {
          console.log("📡 Checking availability...");
          const availability = await window.ai.languageModel.availability();
          console.log("✓ Availability:", availability);
          
          // Return availability info even if not ready
          if (availability === 'after-download') {
            console.log("📥 Model needs download - attempting to trigger...");
            
            // Try to create session to trigger download
            try {
              const session = await window.ai.languageModel.create();
              window.__geminiSession = session;
              console.log("✅ Session created! Model downloaded successfully");
              return { success: true, availability: 'readily' };
            } catch (error) {
              console.log("⏳ Download in progress...");
              return { 
                success: false, 
                reason: 'downloading',
                availability: 'after-download',
                error: error.message 
              };
            }
          }
          
          if (availability === 'readily') {
            // Try to create a session to verify it really works
            try {
              const session = await window.ai.languageModel.create();
              window.__geminiSession = session;
              console.log("✅ Session created successfully");
              return { success: true, availability };
            } catch (error) {
              return { 
                success: false, 
                reason: 'session creation failed',
                availability,
                error: error.message 
              };
            }
          }
          
          return { 
            success: false, 
            reason: 'not readily available',
            availability 
          };
          
        } catch (error) {
          return { 
            success: false, 
            reason: 'availability check failed',
            error: error.message 
          };
        }
      }
    });
    
    const result = results[0].result;
    console.log("📊 Check result:", result);
    return result;
    
  } catch (error) {
    console.error("❌ Error executing script:", error);
    return { 
      success: false, 
      reason: 'script execution failed',
      error: error.message 
    };
  }


}


chrome.runtime.onMessage.addListener(async (req, sender, sendResponse) => {
  if (req.action === "translate_with_gemini") {
    const { text, userLanguage } = req;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: async (text, userLanguage) => {
          const LM = window.ai?.languageModel || window.LanguageModel;
          if (!LM) {
            return { success: false, reason: "Language Model API not available in this context" };
          }

          // ✅ Wait for model readiness (accept both available & readily)
          async function waitUntilReady(timeoutMs = 10000, intervalMs = 500) {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
              const availability = LM.availability ? await LM.availability() : "readily";
              if (["available", "readily"].includes(availability)) return true;
              await new Promise((res) => setTimeout(res, intervalMs));
            }
            return false;
          }

          const ready = await waitUntilReady();
          if (!ready) {
            return { success: false, reason: "Language model not ready after waiting" };
          }

          console.log("✅ Model ready. Creating session...");

          const session = await LM.create({
            expectedInputs: [{ type: "text", languages: ["en", userLanguage] }],
            expectedOutputs: [{ type: "text", languages: ["en"] }],
            outputLanguage: "en", // ✅ prevents output language warning
            initialPrompts: [
              {
                role: "system",
                content: `
                  You are an AI assistant that translates and interprets spoken or written commands
                  into short, clear English command words.
                  Supported commands: read, pause, stop, translate, show commands, ask, summarise.
                  If multiple commands exist (like "read and then pause"), separate them with commas.
                  Always respond with only the English command(s) in lowercase, no explanations.
                `,
              },
            ],
          });

          console.log("🧠 Session created. Sending prompt...");

          const result = await session.prompt(
            `
            User said (in ${userLanguage}): "${text}"
            Task: Detect if the text includes any actionable command
            and return the English commands only, separated by commas.
            `,
            { outputLanguage: "en" } // ✅ enforce consistent output
          );

          console.log("✅ Result:", result);
          return { success: true, result };
        },
        args: [text, userLanguage],
      });

      sendResponse(results[0].result);
    } catch (error) {
      console.error("⚠️ Gemini translation failed:", error);
      sendResponse({ success: false, error: error.message });
    }

    return true; // Keep the channel open for async sendResponse
  }
});
