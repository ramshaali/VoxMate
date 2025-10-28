// ===============================
// Modern Centralized Overlay System
// ===============================
class VoxMateOverlay {
  constructor() {
    this.overlay = null;
    this.timeoutId = null;
    this.setupEscapeListener();
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
      transform: translateX(-50%);
      max-width: 90%;
      width: 600px;
      background: var(--voxmate-surface, #ffffff);
      color: var(--voxmate-text, #1a1a1a);
      border-radius: 16px;
      padding: 0;
      z-index: 10000;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-height: 70vh;
      overflow: hidden;
    `;

    // Add CSS variables for theme support
    this.addOverlayStyles();
    document.body.appendChild(this.overlay);

    // Add dark/light mode detection
    this.detectColorScheme();

    return this.overlay;
  }

  addOverlayStyles() {
    if (document.getElementById('voxmate-overlay-styles')) return;

    const styles = `
      :root {
        --voxmate-surface-light: #ffffff;
        --voxmate-surface-dark: #1a1a1a;
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
        padding: 16px 20px;
        border-bottom: 1px solid var(--voxmate-border);
        background: rgba(0, 0, 0, 0.02);
      }

      .voxmate-overlay-title {
        font-weight: 600;
        font-size: 16px;
        color: var(--voxmate-text);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .voxmate-overlay-close {
        background: none;
        border: none;
        padding: 8px;
        border-radius: 8px;
        cursor: pointer;
        color: var(--voxmate-text);
        opacity: 0.7;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .voxmate-overlay-close:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
      }

      .voxmate-overlay-content {
        padding: 20px;
        max-height: 50vh;
        overflow-y: auto;
      }

      .voxmate-overlay-content p {
        margin: 0 0 12px 0;
      }

      .voxmate-overlay-content p:last-child {
        margin-bottom: 0;
      }

      .voxmate-overlay-content ul, 
      .voxmate-overlay-content ol {
        margin: 12px 0;
        padding-left: 20px;
      }

      .voxmate-overlay-content li {
        margin-bottom: 6px;
      }

      .voxmate-overlay-content strong {
        font-weight: 600;
        color: var(--voxmate-accent);
      }

      .voxmate-overlay-content code {
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 0.9em;
      }

      .voxmate-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px 20px;
        color: var(--voxmate-text);
        opacity: 0.8;
      }

      .voxmate-loading-spinner {
        width: 20px;
        height: 20px;
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
        gap: 6px;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        margin-left: 8px;
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
    `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'voxmate-overlay-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  detectColorScheme() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.overlay.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
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
      type = 'info', // info, success, warning, error, loading
      autoHide = true,
      duration = 60000, // 1 minute
      showClose = true
    } = options;

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

    // Add close button event listener
    if (showClose) {
      const closeBtn = overlay.querySelector('.voxmate-overlay-close');
      closeBtn.addEventListener('click', () => this.removeOverlay());
    }

    // Show with animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Auto-hide if enabled
    if (autoHide) {
      this.timeoutId = setTimeout(() => {
        this.removeOverlay();
      }, duration);
    }

    return overlay;
  }

  getIcon(type) {
    const icons = {
      info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`,
      success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline>
      </svg>`,
      warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`,
      error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`,
      loading: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

  // Convenience methods for different overlay types
  showLoading(message, title = 'Processing') {
    return this.show(message, { 
      title, 
      type: 'loading', 
      autoHide: false, 
      showClose: true 
    });
  }

  showInfo(content, title = 'Information') {
    return this.show(content, { title, type: 'info' });
  }

  showSuccess(content, title = 'Success') {
    return this.show(content, { title, type: 'success' });
  }

  showError(content, title = 'Error') {
    return this.show(content, { title, type: 'error', autoHide: false });
  }
}


// Create global instance
window.voxmateOverlay = new VoxMateOverlay();