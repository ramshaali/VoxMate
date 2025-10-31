# VoxMate - Your Voice-Powered Web Companion

VoxMate is a powerful Chrome extension that transforms the way you interact with web content through voice commands. Built with Google Chrome's native built-in APIs (Translate, Summarizer, and Prompt APIs), it operates completely offline and securely on your device. Read, summarize, and ask questions about any webpage - all hands-free, without internet dependency!

## VoxMate Demo Video
🎥 Click to [watch on YouTube](https://www.youtube.com/watch?v=0xKo47nco4s).

## Features

- 🎙️ **Voice Control**: Seamlessly navigate and interact with web content using voice commands
- 📖 **Text-to-Speech**: Have webpage content read aloud to you
- 💡 **Smart Summaries**: Get quick, AI-powered summaries of any webpage
- ❓ **Interactive Q&A**: Ask questions about webpage content and get instant answers
- 🌐 **Multi-language Support**: Available in English, Spanish, French, and Chinese
- ⌨️ **Keyboard Shortcuts**: Quick access with shortcuts (default: Ctrl+Shift+V)

## System Requirements

### Hardware Requirements
- **Operating System**: 
  - Windows 10 or 11
  - macOS 13+ (Ventura and onwards)
  - Linux
  - ChromeOS (Platform 16389.0.0+ on Chromebook Plus devices only)
  - Not supported: Chrome for Android, iOS, and non-Chromebook Plus ChromeOS devices
- **Storage**: Minimum 22 GB free space on Chrome profile volume
- **Memory & Processing**:
  - GPU Option: More than 4 GB VRAM
  - CPU Option: 16 GB RAM or more and 4+ CPU cores
- **Network**: Unlimited data or unmetered connection recommended

## Installation

### Method 1: Chrome Web Store (Coming Soon)
1. Download the extension from the Chrome Web Store (link coming soon)
2. Click "Add to Chrome" to install
3. Pin VoxMate to your browser toolbar for easy access

### Method 2: Developer Mode (For Testing)
1. Install Chrome Canary (version 128.0.6545.0 or above)
2. Download or clone this repository
3. Enable required Chrome flags (in Chrome Canary):
   - **For Gemini Nano and Prompt API**:
     - Navigate to `chrome://flags/#optimization-guide-on-device-model`
     - Select "Enabled BypassPerfRequirement"
     - Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
     - Select "Enabled"
     - Relaunch Chrome
   - **For Translation API**:
     - Navigate to `chrome://flags/#translation-api`
     - Select "Enabled"
     - Relaunch Chrome
   - **For Summarizer API**:
     - Navigate to `chrome://flags/#summarization-api-for-gemini-nano`
     - Select "Enabled Multilingual"
     - Relaunch Chrome
   - Optional: Enable additional capabilities like Reader API, Writer API in flags if available
4. Open Chrome Canary and go to `chrome://extensions/`
5. Enable "Developer mode" in the top-right corner
6. Click "Load unpacked" and select the extension directory
7. Pin VoxMate to your browser toolbar for easy access

Note: For development and testing, we recommend using Chrome Canary to access the latest features and APIs. Make sure to relaunch Chrome after enabling each flag for the changes to take effect.

## Usage

### Basic Commands

1. **Activate VoxMate**: 
   - Click the VoxMate icon in your toolbar, or
   - Use the keyboard shortcut `Ctrl+Shift+V`

2. **Voice Commands**:
   - Say "read" to start reading
   - Say "pause" to pause reading
   - Say "stop" to stop reading
   - Say "translate" to translate the page
   - Say "summarize" to get a quick overview
   - Ask questions by saying "Ask: [your question]"
   - Say "show commands" to see all available commands

### Permissions

VoxMate requires the following permissions to function:
- `activeTab`: To access and analyze current webpage content
- `storage`: To save your preferences
- `tabs`: To manage extension functionality across tabs
- `commands`: To enable keyboard shortcuts
- `scripting`: To inject necessary scripts for functionality

## Security

VoxMate prioritizes user privacy and security:
- All processing is done locally when possible
- Strict Content Security Policy (CSP) implementation
- No unnecessary data collection or storage
- Open-source code for transparency

## Technical Details

### Architecture
- Built using Manifest V3
- Background service worker for event handling
- Content scripts for webpage interaction
- Popup interface for user controls
- Leverages Chrome's built-in APIs:
  - **Prompt API with Gemini Nano**: For AI-powered interactions and content understanding
  - **Translation API**: For native, offline language translation
  - **Summarizer API**: For efficient webpage summarization
  - All APIs run locally on-device, ensuring privacy and offline functionality

### File Structure
```
├── manifest.json          # Extension configuration
├── _locales/             # Internationalization
├── public/               # Static assets
│   └── icons/           # Extension icons
└── src/                 # Source code
    ├── background/      # Service worker
    ├── content/         # Content scripts
    ├── popup/          # User interface
    └── utils/          # Shared utilities
```

## Browser Support

- Google Chrome (primary support)

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
