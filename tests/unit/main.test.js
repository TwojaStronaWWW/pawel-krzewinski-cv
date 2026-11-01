const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { MockDocument, MockElement, MockWindow } = require('../helpers/mock-dom');
const { initSidebar, initPrintButtons } = require('../../assets/js/main');

describe('Moduł UI (assets/js/main.js)', () => {
  describe('initSidebar - Zarządzanie panelem bocznym na urządzeniach mobilnych', () => {
    let mockDoc;
    let toggleBtn;
    let sidebar;

    beforeEach(() => {
      mockDoc = new MockDocument();
      toggleBtn = new MockElement('toggleBtn', 'button');
      toggleBtn.textContent = 'Menu';
      toggleBtn.setAttribute('aria-expanded', 'false');

      sidebar = new MockElement('sidebar', 'aside');

      mockDoc.registerElement(toggleBtn);
      mockDoc.registerElement(sidebar);
    });

    it('powinien zwrócić null, gdy brakuje dokumentu lub wymaganych elementów DOM', () => {
      assert.strictEqual(initSidebar(null), null);

      const emptyDoc = new MockDocument();
      assert.strictEqual(initSidebar(emptyDoc), null);
    });

    it('powinien poprawnie zainicjalizować listenery i zwrócić referencje', () => {
      const result = initSidebar(mockDoc);
      assert.ok(result);
      assert.strictEqual(result.toggleBtn, toggleBtn);
      assert.strictEqual(result.sidebar, sidebar);
    });

    it('powinien otworzyć sidebar (dodać klasę active, aria-expanded=true, tekst "Ukryj menu") po kliknięciu', () => {
      initSidebar(mockDoc);

      toggleBtn.click();

      assert.strictEqual(sidebar.classList.contains('active'), true);
      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'true');
      assert.strictEqual(toggleBtn.textContent, 'Ukryj menu');
    });

    it('powinien zamknąć sidebar (usunąć active, aria-expanded=false, tekst "Menu") po ponownym kliknięciu', () => {
      initSidebar(mockDoc);

      // 1. Otwarcie
      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);

      // 2. Zamknięcie
      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), false);
      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(toggleBtn.textContent, 'Menu');
    });

    it('powinien zamknąć aktywny sidebar, gdy użytkownik kliknie poza nim i poza przyciskiem menu', () => {
      initSidebar(mockDoc);

      // Otwórz menu
      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);

      // Kliknięcie w zewnętrzny element (np. tło strony)
      const outsideElement = new MockElement('outsideArea', 'main');
      mockDoc.registerElement(outsideElement);

      mockDoc.dispatchDocumentClick(outsideElement);

      assert.strictEqual(sidebar.classList.contains('active'), false);
      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(toggleBtn.textContent, 'Menu');
    });

    it('NIE powinien zamykać sidebara, gdy użytkownik kliknie w element informacyjny (np. nagłówek, tło) wewnątrz sidebara', () => {
      initSidebar(mockDoc);

      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);

      // Element tekstowy/nagłówek wewnątrz sidebara (nie jest linkiem <a>)
      const innerHeading = new MockElement('contactHeading', 'h2');
      sidebar.appendChild(innerHeading);

      mockDoc.dispatchDocumentClick(innerHeading);

      // Sidebar nadal otwarty
      assert.strictEqual(sidebar.classList.contains('active'), true);
      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'true');
      assert.strictEqual(toggleBtn.textContent, 'Ukryj menu');
    });

    it('powinien zamknąć otwarty sidebar po naciśnięciu klawisza Escape (WCAG 2.1) i przywrócić focus na przycisk menu', () => {
      initSidebar(mockDoc);

      // Otwórz menu
      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);

      // Naciśnięcie klawisza Escape
      mockDoc.dispatchDocumentKeyDown({ key: 'Escape' });

      assert.strictEqual(sidebar.classList.contains('active'), false);
      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(toggleBtn.textContent, 'Menu');
      assert.strictEqual(toggleBtn.isFocused, true);
    });

    it('NIE powinien reagować na inne klawisze klawiatury (np. Tab, Enter)', () => {
      initSidebar(mockDoc);

      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);

      mockDoc.dispatchDocumentKeyDown({ key: 'Tab' });
      mockDoc.dispatchDocumentKeyDown({ key: 'Enter' });

      assert.strictEqual(sidebar.classList.contains('active'), true);
    });

    it('powinien zamknąć menu mobilne, gdy użytkownik kliknie bezpośrednio w odnośnik <a> w panelu', () => {
      initSidebar(mockDoc);

      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);

      // Odnośnik <a> w menu
      const navLink = new MockElement('emailLink', 'a');
      sidebar.appendChild(navLink);

      // Kliknięcie w link
      const clickEvent = { target: navLink };
      const sidebarClickHandlers = sidebar.listeners.get('click') || [];
      for (const fn of sidebarClickHandlers) {
        fn(clickEvent);
      }

      assert.strictEqual(sidebar.classList.contains('active'), false);
      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(toggleBtn.textContent, 'Menu');
    });

    it('powinien być idempotentny i nie rejestrować podwójnych listenerów przy wielokrotnym wywołaniu initSidebar', () => {
      const firstCall = initSidebar(mockDoc);
      const secondCall = initSidebar(mockDoc);

      assert.strictEqual(firstCall.toggleBtn, secondCall.toggleBtn);
      assert.strictEqual(firstCall.sidebar, secondCall.sidebar);

      // Sprawdzenie, czy kliknięcie nie wykonuje podwójnego toggle (otwórz -> zamknij w jednym kliku)
      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);
    });

    it('powinien automatycznie zamknąć sidebar, gdy okno zostanie powiększone powyżej 900px (zgodnie z @media max-width: 900px w main.css)', () => {
      const mockWin = new MockWindow(375); // Ekran mobilny
      initSidebar(mockDoc, mockWin);

      // Otwórz menu
      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);

      // Zmiana rozmiaru na desktop (> 900px, np. 1024px)
      mockWin.dispatchResize(1024);

      assert.strictEqual(sidebar.classList.contains('active'), false);
      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(toggleBtn.textContent, 'Menu');
    });

    it('NIE powinien zamykać sidebara przy zmianie rozmiaru, jeśli szerokość nadal pozostaje mobilna/tabletowa (<= 900px)', () => {
      const mockWin = new MockWindow(375);
      initSidebar(mockDoc, mockWin);

      toggleBtn.click();
      assert.strictEqual(sidebar.classList.contains('active'), true);

      // Zmiana szerokości nadal w zakresie mobile/tablet (np. 412px oraz 820px)
      mockWin.dispatchResize(412);
      assert.strictEqual(sidebar.classList.contains('active'), true);

      mockWin.dispatchResize(820);
      assert.strictEqual(sidebar.classList.contains('active'), true);
    });
  });

  describe('initPrintButtons - Obsługa drukowania i generowania PDF', () => {
    let mockDoc;
    let mockWin;
    let printCalled;

    beforeEach(() => {
      mockDoc = new MockDocument();
      printCalled = 0;
      mockWin = {
        print: () => {
          printCalled++;
        },
      };
    });

    it('powinien zwrócić pustą tablicę, gdy brak przycisków drukowania', () => {
      const result = initPrintButtons(mockDoc, mockWin);
      assert.deepStrictEqual(result, []);
    });

    it('powinien zarejestrować handlery i wywołać window.print() po kliknięciu w dowolny przycisk drukowania', () => {
      const btn1 = new MockElement('printBtn', 'button', ['btn-print']);
      const btn2 = new MockElement('sidebarPrint', 'button', ['btn-print']);

      mockDoc.registerElement(btn1);
      mockDoc.registerElement(btn2);

      const registered = initPrintButtons(mockDoc, mockWin);
      assert.strictEqual(registered.length, 2);

      // Kliknięcie pierwszego przycisku
      btn1.click();
      assert.strictEqual(printCalled, 1);

      // Kliknięcie drugiego przycisku
      btn2.click();
      assert.strictEqual(printCalled, 2);
    });

    it('powinien być idempotentny i nie duplikować wywołań window.print() przy wielokrotnym wywołaniu initPrintButtons', () => {
      const btn = new MockElement('printBtn', 'button', ['btn-print']);
      mockDoc.registerElement(btn);

      initPrintButtons(mockDoc, mockWin);
      initPrintButtons(mockDoc, mockWin);

      btn.click();
      assert.strictEqual(printCalled, 1);
    });

    it('powinien działać bezpiecznie nawet jeśli window.print nie jest zdefiniowane', () => {
      const btn = new MockElement('printBtn', 'button', ['btn-print']);
      mockDoc.registerElement(btn);

      const registered = initPrintButtons(mockDoc, {});
      assert.strictEqual(registered.length, 1);

      // Nie rzuca błędem
      assert.doesNotThrow(() => {
        btn.click();
      });
    });
  });

  describe('Autostart w środowisku przeglądarkowym', () => {
    it('powinien automatycznie zainicjalizować moduły, gdy document i window istnieją globalnie', () => {
      const autostartDoc = new MockDocument();
      const autostartWin = new MockWindow();
      const btn = new MockElement('toggleBtn', 'button');
      const side = new MockElement('sidebar', 'aside');
      autostartDoc.registerElement(btn);
      autostartDoc.registerElement(side);

      // Ustawienie atrap środowiska przeglądarki
      globalThis.document = autostartDoc;
      globalThis.window = autostartWin;

      try {
        delete require.cache[require.resolve('../../assets/js/main')];
        const loadedMain = require('../../assets/js/main');
        assert.ok(loadedMain.initSidebar);
        assert.strictEqual(btn._sidebarInitialized, true);
      } finally {
        delete globalThis.document;
        delete globalThis.window;
        delete require.cache[require.resolve('../../assets/js/main')];
      }
    });
  });
});
