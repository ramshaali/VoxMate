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
    this.init();
  }

  async init() {
    this.cacheElements();
    this.attachEventListeners();
    await this.loadSavedSettings();
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
    };
  }

  attachEventListeners() {
    // Close button with smooth interaction
    
    this.elements.closeBtn.addEventListener("click", () => {
       this.elements.root.style.transition = "opacity 0.2s ease";
      this.elements.root.style.opacity = "0";
      this.animateClose().then(() => {
        
        window.parent.postMessage({ type: "voxmate-close" }, "*");
      });
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
      this.sendAction("show_commands")
    );

    //Summary
    this.elements.summaryBtn.addEventListener("click", () =>
      this.summarisePage()
    );

    // Ask functionality
    this.elements.askSendBtn.addEventListener("click", () =>
      this.sendQuestion()
    );
    //this.elements.summaryBtn.addEventListener('click', () => this.sendQuickQuestion('What is this page about?'));
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
    this.elements.userLanguage.addEventListener("change", () => {
      this.saveLanguage();
    });
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
      const { userLanguage } = await chrome.storage.sync.get(["userLanguage"]);
      const lang = userLanguage || navigator.language.split("-")[0] || "en";
      this.elements.userLanguage.value = lang;
    } catch (error) {
      console.error("Error loading settings:", error);
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
      await chrome.storage.sync.set({ userLanguage: lang });
    } catch (error) {
      this.showToast("Error saving language");
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
      this.showToast("Error performing action");
    }
  }

  async toggleVoiceControl() {
    await this.sendAction("toggle_voice");
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
      }
    } catch (error) {
    } finally {
      setTimeout(() => this.setLoading(this.elements.summaryBtn, false), 1500);
    }
  }

  async sendQuestion() {
    const question = this.elements.askInput.value.trim();
    if (!question) {
      this.showToast("Please enter a question");
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

        setTimeout(() => {
          this.setLoading(this.elements.askSendBtn, false);
          this.elements.askInput.value = "";
          this.elements.askInput.style.height = "auto";
        }, 1500);
      }
    } catch (error) {
      this.setLoading(this.elements.askSendBtn, false);
      this.showToast("Error sending question");
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
  const root = document.getElementById("popupRoot");
  new VoxMatePopup(root);
});
