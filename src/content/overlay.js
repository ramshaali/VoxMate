// ===============================
// macOS-style Compact Overlay System
// ===============================
class VoxMateOverlay {
  constructor() {
    this.overlay = null;
    this.timeoutId = null;
    this.currentLoadingId = null;
    this.isRemoving = false;
    this.setupEscapeListener();
    this.setupGlobalStyles();
  }

  createOverlay() {
    // Remove existing overlay immediately if not in removal state
    if (!this.isRemoving) {
      this.removeOverlayImmediate();
    }

    // Create new overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'voxmate-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 320px;
      width: auto;
      background: var(--voxmate-surface, rgba(255, 255, 255, 0.85));
      color: var(--voxmate-text, #1a1a1a);
      border-radius: 10px;
      padding: 12px 16px;
      z-index: 10000;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.3;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      max-height: 400px;
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
        --voxmate-surface-light: rgba(255, 255, 255, 0.85);
        --voxmate-surface-dark: rgba(28, 28, 30, 0.85);
        --voxmate-text-light: #1a1a1a;
        --voxmate-text-dark: #ffffff;
        --voxmate-accent: #2B2F8A;
        --voxmate-accent-light: #4548C7;
        --voxmate-success: #30D158;
        --voxmate-warning: #FF9F0A;
        --voxmate-error: #FF453A;
      }

      #voxmate-overlay {
        --voxmate-surface: var(--voxmate-surface-light);
        --voxmate-text: var(--voxmate-text-light);
      }

      @media (prefers-color-scheme: dark) {
        #voxmate-overlay {
          --voxmate-surface: var(--voxmate-surface-dark);
          --voxmate-text: var(--voxmate-text-dark);
        }
      }

      .voxmate-toast-content {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
      }

      .voxmate-toast-icon {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        margin-top: 1px;
      }

      .voxmate-toast-message {
        flex: 1;
        min-width: 0;
      }

      .voxmate-toast-title {
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 2px;
        color: var(--voxmate-text);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .voxmate-toast-text {
        font-size: 13px;
        line-height: 1.3;
        color: var(--voxmate-text);
        opacity: 0.9;
      }

      .voxmate-toast-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
        color: var(--voxmate-text);
        opacity: 0.5;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
      }

      .voxmate-toast-close:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
      }

      .voxmate-loading {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .voxmate-loading-spinner {
        width: 14px;
        height: 14px;
        border: 1.5px solid transparent;
        border-top: 1.5px solid var(--voxmate-accent);
        border-radius: 50%;
        animation: voxmate-spin 1s linear infinite;
      }

      @keyframes voxmate-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .voxmate-commands-grid {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-top: 4px;
      }

      .voxmate-command-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border-radius: 4px;
        transition: all 0.2s ease;
        font-size: 12px;
        line-height: 1.2;
      }

      .voxmate-command-item:hover {
        background: rgba(43, 47, 138, 0.08);
      }

      .voxmate-command-bullet {
        color: var(--voxmate-accent);
        font-weight: 600;
        font-size: 12px;
        flex-shrink: 0;
        width: 12px;
      }

      .voxmate-command-text {
        flex: 1;
      }

      .voxmate-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
        background: var(--voxmate-accent);
        color: white;
      }

      /* Compact text formatting */
      .voxmate-toast-text p {
        margin: 0 0 4px 0;
      }

      .voxmate-toast-text p:last-child {
        margin-bottom: 0;
      }

      .voxmate-toast-text strong {
        font-weight: 600;
        color: var(--voxmate-accent);
      }

      .voxmate-toast-text code {
        background: rgba(0, 0, 0, 0.1);
        padding: 1px 4px;
        border-radius: 3px;
        font-family: 'SF Mono', Monaco, Consolas, monospace;
        font-size: 0.85em;
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
      title = '',
      type = 'info',
      autoHide = true,
      duration = 60000,
      showClose = true,
      loadingId = null
    } = options;

    // If we're currently removing an overlay, wait a tiny bit
    if (this.isRemoving) {
      setTimeout(() => this.show(content, options), 50);
      return;
    }

    // If this is a loading overlay, store its ID
    if (type === 'loading' && loadingId) {
      this.currentLoadingId = loadingId;
    }

    const overlay = this.createOverlay();

    // Build compact macOS-style structure
    overlay.innerHTML = `
      ${showClose ? `
        <button class="voxmate-toast-close" aria-label="Close overlay">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      ` : ''}
      <div class="voxmate-toast-content">
        <div class="voxmate-toast-icon">
          ${this.getIcon(type)}
        </div>
        <div class="voxmate-toast-message">
          ${title ? `<div class="voxmate-toast-title">${title}${type === 'loading' ? '<span class="voxmate-status-badge">Processing</span>' : ''}</div>` : ''}
          <div class="voxmate-toast-text">
            ${type === 'loading' ? this.createLoadingContent(content) : this.formatContent(content)}
          </div>
        </div>
      </div>
    `;

    // Add close button event listener
    if (showClose) {
      const closeBtn = overlay.querySelector('.voxmate-toast-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeOverlay();
      });
    }

    // Show with smooth animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateY(0) scale(1)';
    });

    // Auto-hide if enabled (except loading states)
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
        <path d="M20 6L9 17l-5-5"></path>
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
        <span>${message}</span>
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

    if (this.overlay && !this.isRemoving) {
      this.isRemoving = true;
      this.overlay.style.opacity = '0';
      this.overlay.style.transform = 'translateY(20px) scale(0.95)';
      
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
          this.overlay = null;
        }
        this.isRemoving = false;
      }, 300);
    }
  }

  removeOverlayImmediate() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.currentLoadingId = null;

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
    this.isRemoving = false;
  }

  removeLoading(loadingId) {
    if (this.currentLoadingId === loadingId) {
      // For loading states, use immediate removal to allow next overlay to show
      this.removeOverlayImmediate();
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

  showInfo(content, title = '') {
    return this.show(content, { title, type: 'info', duration: 8000 });
  }

  showSuccess(content, title = '') {
    return this.show(content, { title, type: 'success', duration: 4000 });
  }

  showError(content, title = '') {
    return this.show(content, { title, type: 'error', autoHide: false });
  }

  showWarning(content, title = '') {
    return this.show(content, { title, type: 'warning', duration: 6000 });
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
      duration: 12000
    });
  }
}

// Create global instance
window.voxmateOverlay = new VoxMateOverlay();