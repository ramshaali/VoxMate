document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 VoxMate popup loaded');

  // Configuration
  const CONFIG = {
    supportedLanguages: {
      en: 'English',
      hi: 'Hindi', 
      fr: 'French',
      es: 'Spanish',
      zh: 'Chinese'
    },
    quickQuestions: {
      'Summary': 'What is this page about?',
      'Key Points': 'What are the key points?'
    }
  };

  // DOM Elements
  const elements = {
    userLanguage: document.getElementById('userLanguage'),
    saveBtn: document.getElementById('saveBtn'),
    readBtn: document.getElementById('readBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    stopBtn: document.getElementById('stopBtn'),
    translateBtn: document.getElementById('translateBtn'),
    micBtn: document.getElementById('micBtn'),
    commandsBtn: document.getElementById('commandsBtn'),
    voiceMode: document.getElementById('voiceMode'),
    askInput: document.getElementById('askInput'),
    askSendBtn: document.getElementById('askSendBtn'),
    status: document.getElementById('status')
  };

  // Initialize
  function init() {
    populateLanguageSelect();
    loadSavedSettings();
    attachEventListeners();
  }

  // Populate language dropdown
  function populateLanguageSelect() {
    const select = elements.userLanguage;
    select.innerHTML = '';
    
    Object.entries(CONFIG.supportedLanguages).forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      select.appendChild(option);
    });
  }

  // Load saved settings
  async function loadSavedSettings() {
    try {
      const { userLanguage, voiceMode } = await chrome.storage.sync.get(['userLanguage', 'voiceMode']);
      const lang = userLanguage || navigator.language.split('-')[0] || 'en';
      
      elements.userLanguage.value = lang;
      elements.voiceMode.checked = Boolean(voiceMode);
      
      showStatus('Settings loaded', 'success');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Event Listeners
  function attachEventListeners() {
    // Language and settings
    elements.saveBtn.addEventListener('click', saveLanguage);
    elements.voiceMode.addEventListener('change', toggleVoiceMode);
    
    // Reading controls
    elements.readBtn.addEventListener('click', () => sendAction('read_text'));
    elements.pauseBtn.addEventListener('click', () => sendAction('pause_read'));
    elements.stopBtn.addEventListener('click', () => sendAction('stop_read'));
    elements.translateBtn.addEventListener('click', () => sendAction('translate_page'));
    
    // Voice controls
    elements.micBtn.addEventListener('click', toggleVoiceControl);
    elements.commandsBtn.addEventListener('click', () => sendAction('show_commands'));
    
    // Ask functionality
    elements.askSendBtn.addEventListener('click', sendQuestion);
    elements.askInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendQuestion();
    });
    
    // Quick action buttons
    document.querySelectorAll('[data-question]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const question = e.target.getAttribute('data-question');
        sendQuickQuestion(question);
      });
    });
  }

  // Core Functions
  async function saveLanguage() {
    const lang = elements.userLanguage.value;
    try {
      await chrome.storage.sync.set({ userLanguage: lang });
      showStatus(`Language set to ${CONFIG.supportedLanguages[lang]}`, 'success');
    } catch (error) {
      showStatus('Error saving language', 'error');
    }
  }

  async function toggleVoiceMode(e) {
    try {
      await chrome.storage.sync.set({ voiceMode: e.target.checked });
      showStatus(`Voice mode ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      showStatus('Error updating voice mode', 'error');
    }
  }

  async function sendAction(action) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action });
        showStatus(`Action sent: ${action}`, 'success');
      }
    } catch (error) {
      showStatus('Error sending action', 'error');
    }
  }

  async function toggleVoiceControl() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle_voice' });
        showStatus('Voice control toggled', 'success');
      }
    } catch (error) {
      showStatus('Error toggling voice control', 'error');
    }
  }

  async function sendQuestion() {
    const question = elements.askInput.value.trim();
    if (!question) {
      showStatus('Please enter a question', 'error');
      elements.askInput.focus();
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'ask_command', question });
        showStatus('Question sent!', 'success');
        elements.askInput.value = '';
      }
    } catch (error) {
      showStatus('Error sending question', 'error');
    }
  }

  async function sendQuickQuestion(question) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'ask_command', question });
        showStatus('Quick question sent!', 'success');
      }
    } catch (error) {
      showStatus('Error sending quick question', 'error');
    }
  }

  // UI Feedback
  function showStatus(message, type = 'info') {
    const status = elements.status;
    status.textContent = message;
    
    // Reset styles
    status.style.background = 'rgba(57, 211, 162, 0.1)';
    status.style.color = 'var(--text)';
    
    if (type === 'error') {
      status.style.background = 'rgba(255, 107, 107, 0.1)';
    } else if (type === 'success') {
      status.style.background = 'rgba(57, 211, 162, 0.2)';
    }
    
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
  }

  // Initialize the popup
  init();
});