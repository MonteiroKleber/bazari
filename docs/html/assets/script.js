/**
 * BAZARI DOCUMENTATION - SCRIPTS
 * Gerencia troca de idioma, tema e navegação
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  const STORAGE_KEYS = {
    lang: 'bazari:doc-lang',
    theme: 'bazari:doc-theme'
  };

  const LANGUAGES = {
    pt: { name: 'Português', flag: '🇧🇷' },
    en: { name: 'English', flag: '🇺🇸' }
  };

  const DOC_MAPPING = {
    'index': 'index',
    '01-visao-geral': '01-overview-context',
    '01-overview-context': '01-visao-geral',
    '02-proof-of-commerce': '02-proof-of-commerce',
    '03-dores-mercado': '03-market-pain-points',
    '03-market-pain-points': '03-dores-mercado',
    '04-modulos-ecossistema': '04-ecosystem-modules',
    '04-ecosystem-modules': '04-modulos-ecossistema',
    '05-arquitetura': '05-architecture',
    '05-architecture': '05-arquitetura',
    '06-roadmap': '06-roadmap'
  };

  // ============================================
  // UTILITÁRIOS
  // ============================================

  function getCurrentLang() {
    const path = window.location.pathname;
    const match = path.match(/\/(pt|en)\//);
    return match ? match[1] : 'pt';
  }

  function getCurrentDoc() {
    const path = window.location.pathname;
    const match = path.match(/\/([^/]+)\.html$/);
    return match ? match[1] : 'index';
  }

  function saveLang(lang) {
    localStorage.setItem(STORAGE_KEYS.lang, lang);
  }

  function getSavedLang() {
    return localStorage.getItem(STORAGE_KEYS.lang);
  }

  function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }

  function getSavedTheme() {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  }

  // ============================================
  // TROCA DE IDIOMA
  // ============================================

  function switchLanguage(newLang) {
    const currentLang = getCurrentLang();
    if (currentLang === newLang) return;

    const currentDoc = getCurrentDoc();
    const basePath = window.location.pathname.split('/').slice(0, -2).join('/');

    // Constrói nova URL
    const newPath = `${basePath}/${newLang}/${currentDoc}.html`;

    // Salva preferência
    saveLang(newLang);

    // Redireciona
    window.location.href = newPath;
  }

  function initLanguageSwitcher() {
    const buttons = document.querySelectorAll('.lang-switcher button');
    const currentLang = getCurrentLang();

    buttons.forEach(button => {
      const lang = button.dataset.lang;

      // Marca botão ativo
      if (lang === currentLang) {
        button.classList.add('active');
      }

      // Event listener
      button.addEventListener('click', () => {
        switchLanguage(lang);
      });
    });
  }

  // ============================================
  // TROCA DE TEMA
  // ============================================

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);

    // Atualiza ícone do botão
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function toggleTheme() {
    const currentTheme = getSavedTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;

    // Aplica tema salvo
    const savedTheme = getSavedTheme();
    setTheme(savedTheme);

    // Event listener
    themeToggle.addEventListener('click', toggleTheme);
  }

  // ============================================
  // NAVEGAÇÃO ATIVA
  // ============================================

  function highlightActiveNav() {
    const currentDoc = getCurrentDoc();
    const navLinks = document.querySelectorAll('.doc-nav a');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentDoc)) {
        link.classList.add('active');
      }
    });
  }

  // ============================================
  // SMOOTH SCROLL
  // ============================================

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ============================================
  // COPY CODE
  // ============================================

  function initCodeCopy() {
    document.querySelectorAll('pre code').forEach(block => {
      const button = document.createElement('button');
      button.className = 'copy-code-btn';
      button.textContent = '📋 Copy';
      button.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 8px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        opacity: 0;
        transition: opacity 0.2s;
      `;

      const pre = block.parentElement;
      pre.style.position = 'relative';
      pre.appendChild(button);

      pre.addEventListener('mouseenter', () => {
        button.style.opacity = '1';
      });

      pre.addEventListener('mouseleave', () => {
        button.style.opacity = '0';
      });

      button.addEventListener('click', async () => {
        const code = block.textContent;
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = '✅ Copied!';
          setTimeout(() => {
            button.textContent = '📋 Copy';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    });
  }

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K: Buscar
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.focus();
      }

      // Ctrl/Cmd + D: Toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  // ============================================
  // TABELA RESPONSIVA
  // ============================================

  function makeTablesResponsive() {
    document.querySelectorAll('table').forEach(table => {
      if (!table.parentElement.classList.contains('table-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        wrapper.style.cssText = 'overflow-x: auto; margin-bottom: 1rem;';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });
  }

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  function init() {
    // Aguarda DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Inicializa todos os módulos
    initLanguageSwitcher();
    initThemeToggle();
    highlightActiveNav();
    initSmoothScroll();
    initCodeCopy();
    initKeyboardShortcuts();
    makeTablesResponsive();

    console.log('✅ Bazari Docs initialized');
  }

  // Inicia
  init();

})();
