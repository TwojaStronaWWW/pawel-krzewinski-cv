/**
 * Skrypt interaktywny dla CV Krzysztofa Początka
 * Obsługa mobilnego menu bocznego oraz akcji drukowania / generowania PDF.
 */

const MOBILE_BREAKPOINT = 900;

function initSidebar(
  doc = (typeof document !== 'undefined' ? document : null),
  win = (typeof window !== 'undefined' ? window : null)
) {
  if (!doc) return null;

  const toggleBtn = doc.getElementById('toggleBtn');
  const sidebar = doc.getElementById('sidebar');

  if (!toggleBtn || !sidebar) return null;

  // Zabezpieczenie przed wielokrotną rejestracją listenerów (idempotentność)
  if (toggleBtn._sidebarInitialized) {
    return { toggleBtn, sidebar };
  }
  toggleBtn._sidebarInitialized = true;

  const closeSidebar = () => {
    if (sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.textContent = 'Menu';
      if (typeof toggleBtn.focus === 'function') {
        toggleBtn.focus();
      }
    }
  };

  const handleToggle = () => {
    const isExpanded = sidebar.classList.toggle('active');
    toggleBtn.setAttribute('aria-expanded', String(isExpanded));
    toggleBtn.textContent = isExpanded ? 'Ukryj menu' : 'Menu';
  };

  const handleOutsideClick = (e) => {
    if (
      sidebar.classList.contains('active') &&
      !sidebar.contains(e.target) &&
      !toggleBtn.contains(e.target)
    ) {
      closeSidebar();
    }
  };

  // Obsługa klawiatury (WCAG 2.1): zamykanie menu klawiszem Escape
  const handleKeyDown = (e) => {
    if (e && (e.key === 'Escape' || e.key === 'Esc')) {
      closeSidebar();
    }
  };

  // Zamykanie menu po kliknięciu w link wewnątrz panelu (np. tel, email, link nawigacyjny)
  const handleSidebarLinkClick = (e) => {
    const targetLink = e.target && (e.target.tagName === 'A' || (typeof e.target.closest === 'function' && e.target.closest('a')));
    if (targetLink) {
      closeSidebar();
    }
  };

  // Obsługa zmiany orientacji/rozmiaru ekranu: reset do układu desktopowego (> 900px, zgodnie z main.css)
  const handleResize = () => {
    if (win && typeof win.innerWidth === 'number' && win.innerWidth > MOBILE_BREAKPOINT) {
      closeSidebar();
    }
  };

  toggleBtn.addEventListener('click', handleToggle);
  doc.addEventListener('click', handleOutsideClick);
  doc.addEventListener('keydown', handleKeyDown);
  sidebar.addEventListener('click', handleSidebarLinkClick);

  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('resize', handleResize);
  }

  return { toggleBtn, sidebar, handleToggle, handleOutsideClick, handleKeyDown, handleResize, closeSidebar };
}

function initPrintButtons(doc = (typeof document !== 'undefined' ? document : null), win = (typeof window !== 'undefined' ? window : null)) {
  if (!doc) return [];

  const printButtons = doc.querySelectorAll('.btn-print, #printBtn');
  if (!printButtons || printButtons.length === 0) return [];

  const registered = [];
  printButtons.forEach((btn) => {
    if (btn._printInitialized) {
      registered.push({ btn, handler: btn._printHandler });
      return;
    }
    const handler = () => {
      if (win && typeof win.print === 'function') {
        win.print();
      }
    };
    btn._printInitialized = true;
    btn._printHandler = handler;
    btn.addEventListener('click', handler);
    registered.push({ btn, handler });
  });

  return registered;
}

// Autostart w środowisku przeglądarki
if (typeof document !== 'undefined') {
  initSidebar(document, typeof window !== 'undefined' ? window : null);
  initPrintButtons(document, typeof window !== 'undefined' ? window : null);
}

// Eksport modułu dla testów jednostkowych (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initSidebar,
    initPrintButtons,
    MOBILE_BREAKPOINT,
  };
}

