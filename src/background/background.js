console.log('🧠 background.js loaded with voice + translation support');
chrome.runtime.onMessage.addListener((request) => {
  console.log("📩 [DEBUG] Received action:", request.action, request);
});
chrome.runtime.onStartup.addListener(() => console.log("🚀 Background started"));
chrome.runtime.onInstalled.addListener(() => console.log("🧩 Extension installed"));

// ===============================
// INITIAL SETUP
// ===============================
chrome.runtime.onInstalled.addListener(async () => {
  const systemLang = navigator.language?.split('-')[0] || 'en';
  await chrome.storage.sync.set({ userLanguage: systemLang });
  console.log('🌐 Default language set:', systemLang);
});

// ===============================
// TRANSLATION FUNCTIONS
// ===============================
let translatorCache = null;

async function detectLanguage(text) {
  console.log('🔍 Detecting language...');
  if (!('LanguageDetector' in self)) throw new Error('Language Detector API not supported.');

  const availability = await LanguageDetector.availability();
  console.log('📦 Detector model availability:', availability);

  const detector = await LanguageDetector.create();
  const results = await detector.detect(text);

  const detected = results?.[0]?.detectedLanguage || 'en';
  console.log(`🌎 Detected language: ${detected}`);
  return detected;
}


async function translateText(text, userLanguage) {
  console.log('Translating text...');
  if (!('Translator' in self) || !('LanguageDetector' in self)) {
    throw new Error('Translation APIs not supported in this browser.');
  }

  // Step 1— Detect source language first
  const sourceLanguage = await detectLanguage(text);

  // Step 2 — If same as userLanguage, skip translation
  if (sourceLanguage === userLanguage) {
    console.log('⚡ Same language detected — skipping translation');
    return text;
  }

  console.log(`🌍 Translating: ${sourceLanguage} → ${userLanguage}`);

  // Step 3 — Check model availability
  const availability = await Translator.availability({ sourceLanguage, targetLanguage: userLanguage });
  console.log('📦 Translator availability:', availability);

  if (!['available', 'downloadable'].includes(availability)) {
    throw new Error(`Model unavailable for ${sourceLanguage} → ${userLanguage}.`);
  }

  // Step 4— Reuse or create translator
  try {
    if (
      translatorCache &&
      translatorCache.sourceLanguage === sourceLanguage &&
      translatorCache.targetLanguage === userLanguage
    ) {
      console.log('Reusing cached translator');
    } else {
      console.log('⬇️ Creating new translator...');
      translatorCache = await Translator.create({
        sourceLanguage,
        targetLanguage: userLanguage,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(` Model download: ${(e.loaded * 100).toFixed(1)}%`);
          });
        },
      });
      translatorCache.sourceLanguage = sourceLanguage;
      translatorCache.targetLanguage = userLanguage;
    }
  } catch (err) {
    console.error('Translator creation failed:', err);
    throw new Error('Model not available or download failed. Please retry.');
  }

  // Step 5— Translate text
  const translated = await translatorCache.translate(text);
  console.log(' Translation complete.');
  return translated;
}


// ===============================
// MESSAGE HANDLER 
// ===============================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 Message received in background:', request.action);

  if (request.action === "translate_auto") {
    // Keep alive for async
    (async () => {
      const { userLanguage } = await chrome.storage.sync.get("userLanguage");
      console.log("🔧 User target language:", userLanguage);

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
    console.log("📨 Forwarding 'show_commands' to content.js");

    // Send message to all active tabs (or just the active one)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'show_commands' });
      }
    });

    return true;
  }

  return false; // Always keep async channel open
});



// ===============================
//  KEYBOARD SHORTCUT + COMMAND SCREEN
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
// PROMPT API
// ===============================
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "translate_with_gemini") {
    (async () => {
      const { text, userLanguage } = req;
      console.log("🎧 Received translate_with_gemini:", { text, userLanguage });

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          console.error("❌ No active tab found");
          sendResponse({ success: false, reason: "No active tab found" });
          return;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: async (text, userLanguage) => {
            const LM = window.ai?.languageModel || window.LanguageModel;
            if (!LM) {
              return { success: false, reason: "Language Model API not available in this context" };
            }

            async function waitUntilReady(timeoutMs = 10000, intervalMs = 500) {
              const start = Date.now();
              while (Date.now() - start < timeoutMs) {
                const availability = LM.availability ? await LM.availability() : "readily";
                if (["available", "readily", "after-download"].includes(availability)) return true;
                await new Promise((res) => setTimeout(res, intervalMs));
              }
              return false;
            }

            const ready = await waitUntilReady();
            if (!ready) return { success: false, reason: "Model not ready" };

            console.log("✅ Model ready. Creating session...");
            const inputLanguages = ["en"];
            if (userLanguage && userLanguage.toLowerCase() !== "en") {
              if (userLanguage.toLowerCase() === "es" || userLanguage.toLowerCase() === "ja") {
                inputLanguages.push(userLanguage);
              }
            }
            const session = await LM.create({
              expectedInputs: [{ type: "text", languages: inputLanguages }],
              expectedOutputs: [{ type: "text", languages: ["en"] }],
              outputLanguage: "en",
              initialPrompts: [
                {
                  role: "system",
                  content: `
                You are an AI assistant that interprets spoken or written user commands into
                one of the following English commands: read, pause, stop, translate,
                show commands, ask, summarise.

                Rules:
                - Always choose only ONE command that best represents the user's intent.
                - If the user says something like "read and pause", select the one that sounds
                  like the *main* or *first* intent.
                - Output must always follow this schema:
                    { "command": "<command>", "question": "<optional>" }
                - *Only include "question" if the command is "ask" *.
                - No explanations, text, or formatting outside valid JSON.
              `,
                },
              ],
            });

            console.log("🧠 Session created. Sending prompt...");

            const promptText = `
          User said (in ${userLanguage}): "${text}"
          Determine which one command applies, and respond strictly following the JSON schema.
        `;


            const responseSchema = {
              type: "object",
              properties: {
                command: {
                  type: "string",
                  enum: ["read", "pause", "stop", "translate", "show commands", "ask", "summarise"],
                },
                question: { type: "string" },
              },
              required: ["command"],
              additionalProperties: false,
            };

            try {
              const result = await session.prompt(promptText, {
                responseConstraint: responseSchema,
                omitResponseConstraintInput: true,
              });

              console.log("✅ Gemini JSON Result:", result);

              let parsed;
              try {
                parsed = JSON.parse(result);
              } catch (e) {
                console.warn("⚠️ Invalid JSON:", result);
                parsed = { command: "unknown", raw: result };
              }

              return { success: true, result: parsed };
            } catch (err) {
              console.error("Prompt failed:", err);
              return { success: false, error: err?.message || "Prompt failed" };
            }
          },
          args: [text, userLanguage],
        });

        if (!results?.length || !results[0]?.result) {
          console.error("No valid results from executeScript");
          sendResponse({ success: false, reason: "No valid result returned" });
          return;
        }

        sendResponse(results[0].result);
      } catch (error) {
        console.error("Gemini translation failed:", error);
        sendResponse({ success: false, error: error?.message || "Unknown error" });
      }
    })();

    // ✅ Tell Chrome to keep message channel open for async response
    return true;
  }


  if (req.action === "ask_with_gemini") {
    (async () => {
      const { question, userLanguage, languageFullName } = request;
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const language = userLanguage || "en";
        console.log("🌐 User language for ask_with_gemini:", language, languageFullName);

        // Get page content (limited to visible text)
        const [{ result: pageText }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText.slice(0, 8000), // limit for token safety
        });

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: async (question, pageText) => {
            const LM = window.ai?.languageModel || window.LanguageModel;
            if (!LM) {
              return { success: false, reason: "Language Model API not available" };
            }

            async function waitUntilReady(timeoutMs = 10000, intervalMs = 500) {
              const start = Date.now();
              while (Date.now() - start < timeoutMs) {
                const availability = LM.availability ? await LM.availability() : "readily";
                if (["available", "readily", "after-download"].includes(availability)) return true;
                await new Promise((res) => setTimeout(res, intervalMs));
              }
              return false;
            }

            const ready = await waitUntilReady();
            if (!ready) return { success: false, reason: "Model not ready" };

            const session = await LM.create({
              expectedInputs: [{ type: "text", languages: ["en"] }],
              expectedOutputs: [{ type: "text", languages: ["en"] }],
            });

            const prompt = `
          You are an assistant that answers questions about the current webpage content.
          Use only the information available in the provided text. 
          If the answer is not found, respond with: "I couldn’t find that in this page.
          ** Always answer in **${language}-${languageFullName}**.

          Webpage content:
          """${pageText}"""

          User question: "${question}"

          Respond clearly and concisely.
        `;


            const result = await session.prompt(prompt, { outputLanguage: "en" });
            return { success: true, answer: result };
          },
          args: [question, pageText],
        });

        sendResponse(results[0].result);
      } catch (error) {
        console.error("⚠️ Ask command failed:", error);
        sendResponse({ success: false, error: error.message });
      }

    })();

    // ✅ Tell Chrome to keep message channel open for async response
    return true;
  }

  if (req.action === "run_summarizer") {
    (async () => {
      try {
        const summary = await runSummarizer(req.text, req.lang);
        console.log("✅ Summary generated.");
        sendResponse({ success: true, summary });
      } catch (err) {
        console.error("❌ Summarizer error:", err);
        sendResponse({
          success: false,
          summary: "Summarizer unavailable or failed. Please try again later.",
        });
      }
    })();

    // ✅ Keep channel open for async sendResponse
    return true;
  }

});


//  handleCheckGemini function

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
              console.log("Session created! Model downloaded successfully");
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
              console.log("Session created successfully");
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
    console.error("Error executing script:", error);
    return {
      success: false,
      reason: 'script execution failed',
      error: error.message
    };
  }
}

// ===========================
// Summarizer Helper
// ===========================
async function runSummarizer(text, lang = "en") {
  if (!("Summarizer" in self)) {
    throw new Error("Summarizer API not supported in this browser.");
  }

  // Check availability first
  const availability = await Summarizer.availability();
  if (availability === "unavailable") {
    throw new Error("Summarizer API unavailable or model not downloaded yet.");
  }

  console.log("📦 Summarizer availability:", availability);

  // Create summarizer with monitored download progress
  const summarizer = await Summarizer.create({
    type: "key-points",
    format: "markdown",
    length: "medium",
    expectedInputLanguages: [lang, "en"],
    outputLanguage: lang,
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        console.log(`📥 Downloaded ${Math.round(e.loaded * 100)}%`);
      });
    },
  });

  console.log("🧠 Summarizer ready. Generating summary...");

  // Clean and summarize
  const cleanedText = text.replace(/\s+/g, " ").trim();
  const summary = await summarizer.summarize(cleanedText, {
    context: "Summarizing page content for the user in a concise format.",
  });

  return summary;
}

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "togglePopup" });
});

