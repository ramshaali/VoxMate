// Modern VoxMate Popup with Calm Intelligence Design
class VoxMatePopup {
  constructor(root) {
    this.root = root;
    this.config = {
      supportedLanguages: {
        en: "English",
        fr: "French",
        es: "Spanish",
        zh: "Chinese",
      },
    };

    this.elements = {};
    this.currentMessages = {};
    this.init();
  }

  async init() {
    this.cacheElements();
    await this.loadSavedSettings();
    this.attachEventListeners();
    this.setupAutoSave();
    this.setupTextareaAutoResize();
    this.applyAccessibilityFeatures();
  }

  cacheElements() {
    this.elements = {
      closeBtn: this.root.querySelector("#closeBtn"),
      statusToast: this.root.querySelector("#statusToast"),
      userLanguage: this.root.querySelector("#userLanguage"),
      translateBtn: this.root.querySelector("#translateBtn"),
      readBtn: this.root.querySelector("#readBtn"),
      pauseBtn: this.root.querySelector("#pauseBtn"),
      stopBtn: this.root.querySelector("#stopBtn"),
      micBtn: this.root.querySelector("#micBtn"),
      commandsBtn: this.root.querySelector("#commandsBtn"),
      askInput: this.root.querySelector("#askInput"),
      askSendBtn: this.root.querySelector("#askSendBtn"),
      summaryBtn: this.root.querySelector("#summaryBtn"),
      // UI text elements that need translation
      title: this.root.querySelector(".title"),
      subtitle: this.root.querySelector(".subtitle"),
      cardTitles: this.root.querySelectorAll(".card-title"),
      gestureDisclaimer: this.root.querySelector('#gestureDisclaimer'),

    };
  }
  
 

  
  // ========== LANGUAGE SWITCHING METHODS ==========

  /**
   * Load messages.json for a specific locale
   */
  async loadMessages(locale) {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load locale: ${locale}`);
    const messages = await response.json();
    this.currentMessages = messages;
    return messages;
  } catch (error) {
    console.error('Error loading messages:', error);
    if (locale !== 'en') return this.loadMessages('en');
    return null;
  }
}


  /**
   * Get translated message by key
   */
  getMessage(key, defaultValue = '') {
    return this.currentMessages[key]?.message || defaultValue || key;
  }

  /**
   * Update all UI text elements with current language
   */
  updateUIText() {
    // Update header
    if (this.elements.title) {
      this.elements.title.textContent = this.getMessage('extensionTitle', 'VoxMate');
    }
    if (this.elements.subtitle) {
      this.elements.subtitle.textContent = this.getMessage('extensionSubtitle', 'Let the web speak to everyone.');
    }

    // Update gesture disclaimer
    if (this.elements.gestureDisclaimer) {
      this.elements.gestureDisclaimer.textContent = this.getMessage(
        'gestureDisclaimer',
        '⚠️ Do any gesture (click or tap) on screen to start AI.'
      );
    }

    
    // Update close button aria-label
    this.elements.closeBtn.setAttribute('aria-label', this.getMessage('closeButton', 'Close extension'));
    
    // Update card titles
    if (this.elements.cardTitles[0]) {
      this.elements.cardTitles[0].textContent = this.getMessage('languageTranslation', 'Language & Translation');
    }
    if (this.elements.cardTitles[1]) {
      this.elements.cardTitles[1].textContent = this.getMessage('readingControls', 'Reading Controls');
    }
    if (this.elements.cardTitles[2]) {
      this.elements.cardTitles[2].textContent = this.getMessage('voiceControls', 'Voice Controls');
    }
    if (this.elements.cardTitles[3]) {
      this.elements.cardTitles[3].textContent = this.getMessage('askQuestions', 'Ask Questions');
    }
    
    // Update button text
    const translateBtnSpan = this.elements.translateBtn.querySelector('span');
    if (translateBtnSpan) {
      translateBtnSpan.textContent = this.getMessage('translateButton', 'Translate Page');
    }
    
    const readBtnSpan = this.elements.readBtn.querySelector('span');
    if (readBtnSpan) {
      readBtnSpan.textContent = this.getMessage('readButton', 'Read');
    }
    
    const pauseBtnSpan = this.elements.pauseBtn.querySelector('span');
    if (pauseBtnSpan) {
      pauseBtnSpan.textContent = this.getMessage('pauseButton', 'Pause');
    }
    
    const stopBtnSpan = this.elements.stopBtn.querySelector('span');
    if (stopBtnSpan) {
      stopBtnSpan.textContent = this.getMessage('stopButton', 'Stop');
    }
    
    const micBtnSpan = this.elements.micBtn.querySelector('span');
    if (micBtnSpan) {
      micBtnSpan.textContent = this.getMessage('micBtn', 'Start Voice Mode');
    }
    
    const commandsBtnSpan = this.elements.commandsBtn.querySelector('span');
    if (commandsBtnSpan) {
      commandsBtnSpan.textContent = this.getMessage('voiceCommands', 'Voice Commands');
    }
    
    const summaryBtnSpan = this.elements.summaryBtn.querySelector('span');
    if (summaryBtnSpan) {
      summaryBtnSpan.textContent = this.getMessage('getSummary', 'Get Summary');
    }
    
    // Update placeholder
    this.elements.askInput.placeholder = this.getMessage('askPlaceholder', 'Ask anything about this page...');
    
    // Update voice hint
    const voiceHint = this.root.querySelector('.voice-hint');
    if (voiceHint) {
      const shortcutSpan = voiceHint.querySelector('.shortcut');
      if (shortcutSpan) {
        const shortcutText = shortcutSpan.outerHTML;
        voiceHint.innerHTML = this.getMessage('voiceHint', 'Press ') + ' ' + shortcutText + ' ' + this.getMessage('voiceHintEnd', 'to start and stop voice mode');
      }
    }
  }

  /**
   * Handle language change
   */
  async handleLanguageChange(locale) {
    // Show loading toast
    this.showToast('Loading language...');
    
    try {
      // Load messages for selected locale
      const messages = await this.loadMessages(locale);
      
      if (messages) {
        // Update UI with new messages
        this.updateUIText();
        
        // Save preference
        await chrome.storage.sync.set({ selectedLanguage: locale, userLanguage: locale });
        
        // Show success message
        this.showToast(this.getMessage('languageUpdated', 'Language updated successfully!'));
      }
    } catch (error) {
      console.error('Error changing language:', error);
      this.showToast(this.getMessage('errorLoading', 'Error loading language'));
    }
  }

  // ========== END LANGUAGE SWITCHING METHODS ==========

  attachEventListeners() {
    // Close button with smooth interaction
    this.elements.closeBtn.addEventListener("click", () => {
      this.animateClose().then(() => {
        window.parent.postMessage({ type: "voxmate-close" }, "*");
      });
    });

    // Language change listener - THIS IS CRITICAL!
    this.elements.userLanguage.addEventListener("change", async (e) => {
      const selectedLanguage = e.target.value;
      await this.handleLanguageChange(selectedLanguage);
    });

    // Primary action buttons
    this.elements.translateBtn.addEventListener("click", () =>
      this.translatePage()
    );
    this.elements.readBtn.addEventListener("click", () =>
      this.sendAction("read_text")
    );
    this.elements.pauseBtn.addEventListener("click", () =>
      this.sendAction("pause_read")
    );
    this.elements.stopBtn.addEventListener("click", () =>
      this.sendAction("stop_read")
    );

    // Voice controls
    this.elements.micBtn.addEventListener("click", () =>
      this.toggleVoiceControl()
    );
    this.elements.commandsBtn.addEventListener("click", () =>
      this.showCommands()
    );

    //Summary
    this.elements.summaryBtn.addEventListener("click", () =>
      this.summarisePage()
    );

    // Ask functionality
    this.elements.askSendBtn.addEventListener("click", () =>
      this.sendQuestion()
    );
    this.elements.askInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendQuestion();
      }
    });

    // Keyboard shortcuts for power users
    this.root.addEventListener("keydown", (e) =>
      this.handleKeyboardShortcuts(e)
    );

    // Micro-interactions for buttons
    this.setupButtonInteractions();
  }

  setupAutoSave() {
    // Language change now handled in attachEventListeners
  }

  setupTextareaAutoResize() {
    this.elements.askInput.addEventListener("input", () => {
      this.elements.askInput.style.height = "auto";
      this.elements.askInput.style.height =
        Math.min(this.elements.askInput.scrollHeight, 120) + "px";
    });
  }

  setupButtonInteractions() {
    const buttons = this.root.querySelectorAll("button");
    buttons.forEach((btn) => {
      btn.addEventListener(
        "mousedown",
        (e) => (e.currentTarget.style.transform = "scale(0.98)")
      );
      btn.addEventListener(
        "mouseup",
        (e) => (e.currentTarget.style.transform = "")
      );
      btn.addEventListener(
        "mouseleave",
        (e) => (e.currentTarget.style.transform = "")
      );
    });
  }

  applyAccessibilityFeatures() {
    // Add dyslexic font option if needed
    const prefersDyslexic = localStorage.getItem("dyslexic-font");
    if (prefersDyslexic === "true") {
      this.root.body.classList.add("voice-friendly");
    }

    // Add calm mode for light sensitivity
    const prefersCalm = localStorage.getItem("calm-mode");
    if (prefersCalm === "true") {
      this.root.body.classList.add("calm-mode");
    }
  }

  async loadSavedSettings() {
    try {
      const { userLanguage, selectedLanguage } = await chrome.storage.sync.get([
        "userLanguage",
        "selectedLanguage"
      ]);
      
      // Prefer selectedLanguage, fallback to userLanguage, then browser language, then English
      const lang = selectedLanguage || userLanguage || navigator.language.split("-")[0] || "en";
      
      // Set the select value
      this.elements.userLanguage.value = lang;
      
      // Load and apply the language
      await this.loadMessages(lang);
      this.updateUIText();
      
    } catch (error) {
      console.error("Error loading settings:", error);
      // Load English as fallback
      await this.loadMessages('en');
      this.updateUIText();
    }
  }

  handleKeyboardShortcuts(e) {
    // Ctrl+Shift+V for voice mode
    if (e.ctrlKey && e.shiftKey && e.key === "V") {
      e.preventDefault();
      this.toggleVoiceControl();
    }

    // Escape to close popup
    if (e.key === "Escape") {
      this.animateClose().then(() => window.close());
    }

    // Focus management for accessibility
    if (e.key === "Tab" && !e.shiftKey) {
      this.handleTabNavigation(e);
    }
  }

  handleTabNavigation(e) {
    // Ensure focus stays within popup for keyboard users
    const focusableElements = this.root.querySelectorAll(
      "button, select, textarea"
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && this.root.activeElement === firstElement) {
      lastElement.focus();
      e.preventDefault();
    } else if (!e.shiftKey && this.root.activeElement === lastElement) {
      firstElement.focus();
      e.preventDefault();
    }
  }

  async animateClose() {
    return new Promise((resolve) => {
      const container = this.root.querySelector("#popup-container");
      if (container) {
        container.style.transform = "scale(0.95)";
        container.style.opacity = "0";
      }
      setTimeout(resolve, 150);
    });
  }

  async saveLanguage() {
    const lang = this.elements.userLanguage.value;
    try {
      await chrome.storage.sync.set({ userLanguage: lang, selectedLanguage: lang });
    } catch (error) {
      this.showToast(this.getMessage('errorLoading', "Error saving language"));
    }
  }

  async translatePage() {
    this.setLoading(this.elements.translateBtn, true);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "translate_page" });

        setTimeout(() => {
          this.setLoading(this.elements.translateBtn, false);
        }, 2000);
      }
    } catch (error) {
      this.setLoading(this.elements.translateBtn, false);
    }
  }

  async sendAction(action) {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action });

        if (action === "toggle_voice") {
          setTimeout(() => window.close(), 300);
        }
      }
    } catch (error) {
      this.showToast(this.getMessage('errorAction', "Error performing action"));
    }
  }

  async toggleVoiceControl() {
    await this.sendAction("toggle_voice");
  }

async showCommands() {
  this.setLoading(this.elements.commandsBtn, true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "show_commands" });

      // let the content script receive the message, then close iframe
      setTimeout(() => {
        window.parent.postMessage({ type: "voxmate-close" }, "*");
      }, 200); 
    }
  } catch (error) {
    console.error(error);
  } finally {
    setTimeout(() => this.setLoading(this.elements.commandsBtn, false), 1500);
  }
}

 async summarisePage() {
  this.setLoading(this.elements.summaryBtn, true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "summarise_page" });
      // let the content script receive the message, then close iframe
      setTimeout(() => {
        // notify parent (content script) to remove the iframe
        window.parent.postMessage({ type: "voxmate-close" }, "*");
      }, 200); // small delay so message ordering is less likely to race
    }
  } catch (error) {
    console.error(error);
  } finally {
    setTimeout(() => this.setLoading(this.elements.summaryBtn, false), 1500);
  }
}

 async sendQuestion() {
  const question = this.elements.askInput.value.trim();
  if (!question) {
    this.showToast(this.getMessage('enterQuestion', "Please enter a question"));
    this.elements.askInput.focus();
    return;
  }

  this.setLoading(this.elements.askSendBtn, true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "ask_command", question });

      // clear UI immediately for UX
      setTimeout(() => {
        this.setLoading(this.elements.askSendBtn, false);
        this.elements.askInput.value = "";
        this.elements.askInput.style.height = "auto";
      }, 1500);

      // notify parent to close iframe after a small delay
      setTimeout(() => {
        window.parent.postMessage({ type: "voxmate-close" }, "*");
      }, 250); // small delay
    }
  } catch (error) {
    this.setLoading(this.elements.askSendBtn, false);
    this.showToast(this.getMessage('errorSending', "Error sending question"));
  }
}


  async sendQuickQuestion(question) {
    this.setLoading(this.elements.summaryBtn, true);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "ask_command", question });

        setTimeout(() => {
          this.setLoading(this.elements.summaryBtn, false);
        }, 1500);
      }
    } catch (error) {
      this.setLoading(this.elements.summaryBtn, false);
    }
  }

  setLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add("loading");
      const originalHTML = button.innerHTML;
      button.setAttribute("data-original-html", originalHTML);
    } else {
      button.classList.remove("loading");
      const originalHTML = button.getAttribute("data-original-html");
      if (originalHTML) {
        button.innerHTML = originalHTML;
      }
    }
  }

  showToast(message) {
    const toast = this.elements.statusToast;
    toast.textContent = message;
    toast.className = "status-toast show";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // existing initialization
  const root = document.getElementById("popupRoot");
  new VoxMatePopup(root);

  const disclaimer = document.getElementById("gestureDisclaimer");

  if (!disclaimer) {
    console.warn("⚠️ No gesture disclaimer found.");
  } 
  // *** Listen for messages posted from parent page (content.js) ***
  window.addEventListener("message", (event) => {
    // Optionally check event.origin here to restrict sources
    const msg = event.data || {};
    if (msg.type === "parent-click") {
      const d = document.getElementById("gestureDisclaimer");
      if (d && !d.classList.contains("hidden")) {
        d.classList.add("hidden");
        console.log("✅ Parent click forwarded — hiding disclaimer.");
      }
    }
  });
});


