document.addEventListener('DOMContentLoaded', () => {
  console.log('📦 popup.js loaded after DOM ready');

  const supportedLanguages = {
    en: 'English',
    hi: 'Hindi',
    fr: 'French',
    es: 'Spanish',
    zh: 'Chinese',
  };

  const uiText = {
    en: {
      title: '🌍 AI Voice Translator',
      save: '💾 Save Language',
      read: '🔊 Read',
      pause: '⏸️ Pause',
      stop: '⏹️ Stop',
      translate: '🌐 Translate Page',
      mic: '🎙️ Start Voice',
      voiceMode: '🎧 Voice Mode',
      showCommands: '🗒️ Show Commands'
    },
    ur: { /* ... */ },
    es: { /* ... */ }
  };

  const select = document.getElementById('userLanguage');
  const saveBtn = document.getElementById('saveBtn');
  const readBtn = document.getElementById('readBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const translateBtn = document.getElementById('translateBtn');
  const micBtn = document.getElementById('micBtn');
  const commandsBtn = document.getElementById('commandsBtn');
  const voiceModeEl = document.getElementById('voiceMode');

  if (!select || !saveBtn) {
    console.error("❌ popup.js: Some elements not found in popup.html");
    return;
  }

  // ✅ Now safe to attach event listeners
  for (const [code, name] of Object.entries(supportedLanguages)) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${name} (${code})`;
    select.appendChild(opt);
  }

  function applyTranslations(lang) { /* same as before */ }

  chrome.storage.sync.get(['userLanguage', 'voiceMode'], ({ userLanguage, voiceMode }) => {
    const lang = userLanguage || navigator.language.split('-')[0] || 'en';
    select.value = lang;
    document.getElementById('voiceMode').checked = voiceMode || false;
    applyTranslations(lang);
  });

  select.addEventListener('change', () => applyTranslations(select.value));

  saveBtn.addEventListener('click', async () => {
    const lang = select.value;
    await chrome.storage.sync.set({ userLanguage: lang });
    document.getElementById('status').textContent = `✅ Saved ${supportedLanguages[lang]}`;
    setTimeout(() => (document.getElementById('status').textContent = ''), 2000);
  });

  voiceModeEl.addEventListener('change', (e) => {
    chrome.storage.sync.set({ voiceMode: e.target.checked });
  });

  async function sendAction(action) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { action });
  }

  readBtn.onclick = () => sendAction('read_text');
  pauseBtn.onclick = () => sendAction('pause_read');
  stopBtn.onclick = () => sendAction('stop_read');
  translateBtn.onclick = () => sendAction('translate_page');
  commandsBtn.onclick = () => sendAction('show_commands');
  micBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: 'toggle_voice' });
  });


  const askBtn = document.getElementById('askBtn');
const askBox = document.getElementById('askBox');
const askInput = document.getElementById('askInput');
const askSendBtn = document.getElementById('askSendBtn');

askBtn.onclick = () => {
  // Toggle visibility of the input box
  askBox.style.display = askBox.style.display === 'none' ? 'block' : 'none';
  if (askBox.style.display === 'block') askInput.focus();
};

askSendBtn.onclick = async () => {
  const question = askInput.value.trim();
  if (!question) {
    askInput.placeholder = "❗ Enter a question first";
    return;
  }

  // Send question to the active tab content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'ask_command', question });
  }

  askInput.value = '';
  askBox.style.display = 'none';
};

});
