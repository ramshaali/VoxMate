// ===============================
// Modern Centralized Overlay System
// ===============================
class VoxMateOverlay {
  constructor() {
    this.overlay = null;
    this.timeoutId = null;
    this.currentLoadingId = null;
    this.setupEscapeListener();
    this.setupGlobalStyles();
  }

  createOverlay() {
    // Remove existing overlay
    this.removeOverlay();

    // Create new overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'voxmate-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      max-width: 400px;
      width: 90%;
      background: var(--voxmate-surface, rgba(255, 255, 255, 0.95));
      color: var(--voxmate-text, #1a1a1a);
      border-radius: 12px;
      padding: 0;
      z-index: 10000;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.8);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-height: 200px;
      overflow: hidden;
    `;

    document.body.appendChild(this.overlay);
    this.detectColorScheme();

    return this.overlay;
  }

  setupGlobalStyles() {
    if (document.getElementById('voxmate-overlay-styles')) return;

    const styles = `
      :root {
        --voxmate-surface-light: rgba(255, 255, 255, 0.95);
        --voxmate-surface-dark: rgba(26, 26, 26, 0.95);
        --voxmate-text-light: #1a1a1a;
        --voxmate-text-dark: #ffffff;
        --voxmate-border-light: rgba(0, 0, 0, 0.1);
        --voxmate-border-dark: rgba(255, 255, 255, 0.2);
        --voxmate-accent: #2B2F8A;
        --voxmate-accent-light: #4548C7;
        --voxmate-success: #39D3A2;
        --voxmate-warning: #FFB54A;
        --voxmate-error: #E53E3E;
      }

      #voxmate-overlay {
        --voxmate-surface: var(--voxmate-surface-light);
        --voxmate-text: var(--voxmate-text-light);
        --voxmate-border: var(--voxmate-border-light);
      }

      @media (prefers-color-scheme: dark) {
        #voxmate-overlay {
          --voxmate-surface: var(--voxmate-surface-dark);
          --voxmate-text: var(--voxmate-text-dark);
          --voxmate-border: var(--voxmate-border-dark);
        }
      }

      .voxmate-overlay-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--voxmate-border);
        background: rgba(0, 0, 0, 0.02);
      }

      .voxmate-overlay-title {
        font-weight: 600;
        font-size: 14px;
        color: var(--voxmate-text);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .voxmate-overlay-close {
        background: none;
        border: none;
        padding: 6px;
        border-radius: 6px;
        cursor: pointer;
        color: var(--voxmate-text);
        opacity: 0.7;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
      }

      .voxmate-overlay-close:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
      }

      .voxmate-overlay-content {
        padding: 16px;
        max-height: 120px;
        overflow-y: auto;
        font-size: 13px;
        line-height: 1.4;
      }

      .voxmate-overlay-content p {
        margin: 0 0 8px 0;
      }

      .voxmate-overlay-content p:last-child {
        margin-bottom: 0;
      }

      .voxmate-overlay-content ul, 
      .voxmate-overlay-content ol {
        margin: 8px 0;
        padding-left: 16px;
      }

      .voxmate-overlay-content li {
        margin-bottom: 4px;
      }

      .voxmate-overlay-content strong {
        font-weight: 600;
        color: var(--voxmate-accent);
      }

      .voxmate-overlay-content code {
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 0.85em;
      }

      .voxmate-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 20px 16px;
        color: var(--voxmate-text);
        opacity: 0.8;
      }

      .voxmate-loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid var(--voxmate-accent);
        border-radius: 50%;
        animation: voxmate-spin 1s linear infinite;
      }

      @keyframes voxmate-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .voxmate-status-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        margin-left: 6px;
      }

      .voxmate-status-processing {
        background: var(--voxmate-accent);
        color: white;
      }

      .voxmate-status-success {
        background: var(--voxmate-success);
        color: white;
      }

      .voxmate-status-warning {
        background: var(--voxmate-warning);
        color: #1a1a1a;
      }

      .voxmate-commands-grid {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .voxmate-command-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: rgba(43, 47, 138, 0.08);
        border-radius: 6px;
        transition: all 0.2s ease;
        font-size: 12px;
      }

      .voxmate-command-item:hover {
        background: rgba(43, 47, 138, 0.12);
      }

      .voxmate-command-bullet {
        color: var(--voxmate-accent);
        font-weight: 600;
        font-size: 14px;
      }

      .voxmate-command-text {
        flex: 1;
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'voxmate-overlay-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  detectColorScheme() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (this.overlay) {
      this.overlay.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }
  }

  setupEscapeListener() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay) {
        this.removeOverlay();
      }
    });
  }

  show(content, options = {}) {
    const {
      title = 'VoxMate',
      type = 'info',
      autoHide = true,
      duration = 60000,
      showClose = true,
      loadingId = null
    } = options;

    // If this is a loading overlay, store its ID
    if (type === 'loading' && loadingId) {
      this.currentLoadingId = loadingId;
    }

    const overlay = this.createOverlay();

    // Build overlay structure
    overlay.innerHTML = `
      <div class="voxmate-overlay-header">
        <div class="voxmate-overlay-title">
          ${this.getIcon(type)}
          <span>${title}</span>
          ${type === 'loading' ? '<span class="voxmate-status-indicator voxmate-status-processing">Processing</span>' : ''}
        </div>
        ${showClose ? `
          <button class="voxmate-overlay-close" aria-label="Close overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ` : ''}
      </div>
      <div class="voxmate-overlay-content">
        ${type === 'loading' ? this.createLoadingContent(content) : this.formatContent(content)}
      </div>
    `;

    // Add close button event listener - FIXED: Use proper event binding
    if (showClose) {
      const closeBtn = overlay.querySelector('.voxmate-overlay-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeOverlay();
      });
    }

    // Show with animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Auto-hide if enabled - FIXED: For loading states, don't auto-hide
    if (autoHide && type !== 'loading') {
      this.timeoutId = setTimeout(() => {
        this.removeOverlay();
      }, duration);
    }

    return overlay;
  }

  getIcon(type) {
    const icons = {
      info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`,
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline>
      </svg>`,
      warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`,
      error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`,
      loading: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
      </svg>`
    };
    return icons[type] || icons.info;
  }

  createLoadingContent(message) {
    return `
      <div class="voxmate-loading">
        <div class="voxmate-loading-spinner"></div>
        <div>${message}</div>
      </div>
    `;
  }

  formatContent(content) {
    if (typeof content === 'string') {
      // Clean and format the content
      let formatted = content
        .replace(/\\n/g, '\n')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');

      // Convert line breaks to paragraphs
      const paragraphs = formatted.split('\n').filter(p => p.trim());
      return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
    }
    return content;
  }

  removeOverlay() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.currentLoadingId = null;

    if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.transform = 'translateX(-50%) translateY(20px)';
      
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
          this.overlay = null;
        }
      }, 300);
    }
  }

  removeLoading(loadingId) {
    if (this.currentLoadingId === loadingId) {
      this.removeOverlay();
    }
  }

  // Convenience methods for different overlay types
  showLoading(message, title = 'Processing', loadingId = null) {
    return this.show(message, { 
      title, 
      type: 'loading', 
      autoHide: false, 
      showClose: true,
      loadingId
    });
  }

  showInfo(content, title = 'Information') {
    return this.show(content, { title, type: 'info', duration: 10000 });
  }

  showSuccess(content, title = 'Success') {
    return this.show(content, { title, type: 'success', duration: 5000 });
  }

  showError(content, title = 'Error') {
    return this.show(content, { title, type: 'error', autoHide: false });
  }

  showWarning(content, title = 'Warning') {
    return this.show(content, { title, type: 'warning', duration: 8000 });
  }

  showCommands(commandsData) {
    const commandsHtml = `
      <div class="voxmate-commands-grid">
        ${commandsData.commands.map(cmd => `
          <div class="voxmate-command-item">
            <span class="voxmate-command-bullet">•</span>
            <span class="voxmate-command-text">${cmd}</span>
          </div>
        `).join('')}
      </div>
    `;
    
    return this.show(commandsHtml, { 
      title: commandsData.title, 
      duration: 15000
    });
  }
}

// Create global instance
window.voxmateOverlay = new VoxMateOverlay();