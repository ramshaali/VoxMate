const supportedLanguages = {
  en: 'English',
  hi: 'Hindi',
  fr: "French",
  es: 'Spanish',
  zh: 'Mandarin Chinese'
};


function populateSelect(selectId) {
  const select = document.getElementById(selectId);
  for (const [code, name] of Object.entries(supportedLanguages)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${name} (${code})`;
    select.appendChild(option);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  populateSelect('sourceLanguage');
  populateSelect('targetLanguage');

  const { sourceLanguage, targetLanguage } = await chrome.storage.sync.get([
    'sourceLanguage',
    'targetLanguage'
  ]);

  document.getElementById('sourceLanguage').value = sourceLanguage || 'en';
  document.getElementById('targetLanguage').value = targetLanguage || 'en';
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const source = document.getElementById('sourceLanguage').value;
  const target = document.getElementById('targetLanguage').value;
  await chrome.storage.sync.set({ sourceLanguage: source, targetLanguage: target });

  const status = document.getElementById('status');
  status.textContent = '✅ Settings saved!';
  setTimeout(() => (status.textContent = ''), 2000);
});
