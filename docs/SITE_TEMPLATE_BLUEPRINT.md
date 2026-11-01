# ENTERPRISE WEB TEMPLATE BLUEPRINT & RUNBOOK
## Nowoczesny standard jakości, testów jednostkowych i CI/CD dla projektów TwojaStronaWWW

Niniejszy dokument stanowi kompletny przewodnik po architekturze szablonu **`_site-template`**. Łączy sprawdzone wzorce produkcyjne wdrożone w **`Moje-CV`** (testy jednostkowe bez zewnętrznych bibliotek, audyt Lighthouse CI, ochrona pre-commit, SEO) z dotychczasową infrastrukturą wdrożeniową TwojaStronaWWW (podział Staging/Production na serwerze LH, automatyczne wersjonowanie i tagowanie wydań).

---

## SPIS TREŚCI
1. [Usunięcie repozytorium dancePulse](#1-usunięcie-repozytorium-dancepulse)
2. [Filozofia szablonu: Lekkość, zero zbędnych zależności i automatyzacja](#2-filozofia-szablonu)
3. [ETAP 1: Co wdrożyć w `_site-template` JUŻ TERAZ (przed powstaniem strony)](#3-etap-1-co-wdrożyć-w-_site-template-już-teraz)
   - [3.1 Struktura katalogów szablonu](#31-struktura-katalogów-szablonu)
   - [3.2 Uniwersalny `package.json`](#32-uniwersalny-packagejson)
   - [3.3 Wbudowany silnik testów jednostkowych (`node:test`)](#33-wbudowany-silnik-testów-jednostkowych-nodetest)
   - [3.4 Ochrona pre-commit hook (`.githooks/pre-commit`)](#34-ochrona-pre-commit-hook-githookspre-commit)
   - [3.5 Konfiguracja audytu Lighthouse CI (`.lighthouserc.json`)](#35-konfiguracja-audytu-lighthouse-ci-lighthousercjson)
   - [3.6 Automatyzacja aktualizacji akcji (`.github/dependabot.yml`)](#36-automatyzacja-aktualizacji-akcji-githubdependabotyml)
   - [3.7 Nowoczesny potok `.github/workflows/ci.yml`](#37-nowoczesny-potok-githubworkflowsciyml)
   - [3.8 Szablony bazowe SEO (`robots.txt`, `sitemap.xml`)](#38-szablony-bazowe-seo-robotstxt-sitemapxml)
4. [ETAP 2: Procedura krok po kroku (Runbook) – gdy strona jest już gotowa](#4-etap-2-procedura-krok-po-kroku-runbook)
   - [Krok 1: Utworzenie projektu z szablonu](#krok-1-utworzenie-projektu-z-szablonu)
   - [Krok 2: Konfiguracja zmiennych środowiskowych i sekretów](#krok-2-konfiguracja-zmiennych-środowiskowych-i-sekretów)
   - [Krok 3: Dostosowanie testu spójności HTML (`html-integrity.test.js`)](#krok-3-dostosowanie-testu-spójności-html-html-integritytestjs)
   - [Krok 4: Pokrycie logiki JavaScript testami UI (`main.test.js`)](#krok-4-pokrycie-logiki-javascript-testami-ui-maintestjs)
   - [Krok 5: Aktualizacja i publikacja SEO (`robots.txt`, `sitemap.xml`)](#krok-5-aktualizacja-i-publikacja-seo-robotstxt-sitemapxml)
   - [Krok 6: (Opcjonalnie) Generator PDF dla ofert, cenników lub portfolio](#krok-6-opcjonalnie-generator-pdf-dla-ofert-cenników-lub-portfolio)
   - [Krok 7: Lokalna weryfikacja i pre-commit](#krok-7-lokalna-weryfikacja-i-pre-commit)
   - [Krok 8: Wypchnięcie kodu na Staging i Production](#krok-8-wypchnięcie-kodu-na-staging-i-production)

---

## 1. Usunięcie repozytorium dancePulse

Repozytorium `TwojaStronaWWW/dancePulse` zostało wcześniej pomyślnie przestawione na **Prywatne (Private)**, dzięki czemu nie jest widoczne publicznie. 

Aby skasować je **całkowicie i bezpowrotnie**, masz dwie możliwości:

### Sposób A: Bezpośrednio w przeglądarce (Zalecany – 10 sekund)
1. Otwórz stronę ustawień repozytorium:
   👉 **[https://github.com/TwojaStronaWWW/dancePulse/settings](https://github.com/TwojaStronaWWW/dancePulse/settings)**
2. Zjedź na sam dół do czerwonej sekcji **Danger Zone**.
3. Kliknij przycisk **Delete this repository**.
4. Wpisz wymaganą nazwę potwierdzającą (`TwojaStronaWWW/dancePulse`) i kliknij zatwierdzenie.

### Sposób B: Przez terminal GitHub CLI (`gh`)
Domyślny token CLI celowo nie posiada niebezpiecznego uprawnienia usuwania repozytoriów (`delete_repo`). Aby nadać uprawnienie i usunąć repozytorium z terminala:
```bash
# 1. Nadanie uprawnienia delete_repo (otworzy się logowanie w przeglądarce)
gh auth refresh -h github.com -s delete_repo

# 2. Usunięcie repozytorium
gh repo delete TwojaStronaWWW/dancePulse --yes
```

---

## 2. Filozofia szablonu

Tradycyjne projekty frontendowe często cierpią na tzw. *dependency bloat* – instalację dziesiątek gigabajtów paczek w `node_modules` (Jest, Babel, Webpack, ESLint, Puppeteer), co spowalnia pipeline i stwarza podatności bezpieczeństwa.

W architekturze wypracowanej w **Moje-CV**:
- **0 ciężkich bibliotek testowych:** Używamy natywnego silnika `node:test` i asercji `node:assert/strict` wbudowanych w Node.js (od wersji 18+).
- **Lekki Mock DOM:** Zamiast pamięciożernego `jsdom` (wymagającego dziesiątek podzależności), stosujemy minimalistyczny, 80-linijkowy `mock-dom.js`.
- **Wydajność CI/CD:** Cały proces (testy, budowa, audyt a11y/SEO i wdrożenie SFTP) zamyka się w **poniżej 60 sekund**.
- **Wczesne wykrywanie błędów:** Lokalny pre-commit hook uniemożliwia zatwierdzenie commita z uszkodzonym HTML-em lub wyciekiem pliku `.env`.

---

## 3. ETAP 1: Co wdrożyć w `_site-template` JUŻ TERAZ

Nawet jeśli projekt nie ma jeszcze ani jednej linijki docelowego HTML-a czy CSS-a, w repozytorium szablonu warto mieć gotowy cały ekosystem.

### 3.1 Struktura katalogów szablonu

```plaintext
_site-template/
├── .github/
│   ├── dependabot.yml              # Automatyczne aktualizacje akcji
│   └── workflows/
│       ├── ci.yml                  # Testy jednostkowe + walidacja PHP + Lighthouse
│       ├── deploy-staging.yml      # Wdrożenie na serwer testowy LH
│       └── deploy-production.yml   # Wdrożenie na serwer produkcyjny + git tag
├── .githooks/
│   └── pre-commit                  # Lokalny strażnik jakości (uruchamia npm test)
├── assets/
│   ├── css/
│   │   └── main.css                # Style bazowe (reset, zmienne CSS, typografia)
│   ├── js/
│   │   └── main.js                 # Skrypt główny (np. obsługa menu, motywu)
│   └── img/
├── tests/
│   ├── helpers/
│   │   └── mock-dom.js             # Lekkie środowisko przeglądarki w czystym Node.js
│   └── unit/
│       ├── html-integrity.test.js  # Weryfikacja struktury HTML5 i standardów WCAG
│       └── main.test.js            # Uniwersalne testy interakcji UI
├── .gitignore                      # Ignorowanie node_modules, .env, coverage
├── .lighthouserc.json              # Konfiguracja audytu Lighthouse CI
├── index.html                      # Pusty szkielet semantyczny HTML5
├── package.json                    # Konfiguracja skryptów npm (bez frameworków)
├── robots.txt                      # Szablon indeksowania dla botów
├── sitemap.xml                     # Szablon mapy witryny
└── README.md                       # Dokumentacja projektu i checklista wdrożeniowa
```

---

### 3.2 Uniwersalny `package.json`

Umieść w głównym katalogu `_site-template`:

```json
{
  "name": "site-template",
  "version": "1.0.0",
  "description": "Enterprise Starter Template - Vanilla Web with CI/CD & Unit Tests",
  "main": "assets/js/main.js",
  "type": "module",
  "scripts": {
    "test": "node --test tests/unit/*.test.js",
    "test:coverage": "node --test --experimental-test-coverage tests/unit/*.test.js",
    "test:watch": "node --test --watch tests/unit/*.test.js",
    "audit:lighthouse": "lhci autorun"
  },
  "devDependencies": {
    "@lhci/cli": "^0.14.0"
  }
}
```

---

### 3.3 Wbudowany silnik testów jednostkowych (`node:test`)

#### A. Pomocnik Mock DOM: `tests/helpers/mock-dom.js`
Pozwala testować kod przeglądarkowy w czystym Node.js bez instalowania ociężałego `jsdom`:

```javascript
export function setupMockDom(initialHtml = '<!DOCTYPE html><html><body></body></html>') {
  const elements = new Map();
  const listeners = new Map();

  class MockElement {
    constructor(tagName, id = '', className = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this.className = className;
      this.classList = {
        _classes: new Set(className ? className.split(' ') : []),
        add(cls) { this._classes.add(cls); },
        remove(cls) { this._classes.delete(cls); },
        toggle(cls) { 
          if (this._classes.has(cls)) { this._classes.delete(cls); return false; }
          this._classes.add(cls); return true;
        },
        contains(cls) { return this._classes.has(cls); }
      };
      this.attributes = new Map();
      this.style = {};
      this.textContent = '';
      this.innerHTML = '';
      this.children = [];
    }

    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k) || null; }
    removeAttribute(k) { this.attributes.delete(k); }
    hasAttribute(k) { return this.attributes.has(k); }
    addEventListener(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    }
    dispatchEvent(evt) {
      const fns = listeners.get(evt.type) || [];
      fns.forEach(fn => fn(evt));
      return true;
    }
  }

  const mockDocument = {
    readyState: 'complete',
    body: new MockElement('body'),
    documentElement: new MockElement('html'),
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => {
      if (sel.startsWith('#')) return elements.get(sel.slice(1)) || null;
      return null;
    },
    querySelectorAll: () => [],
    createElement: (tag) => new MockElement(tag),
    addEventListener: (evt, fn) => {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    }
  };

  const mockWindow = {
    document: mockDocument,
    innerWidth: 1024,
    innerHeight: 768,
    localStorage: {
      _data: new Map(),
      getItem(k) { return this._data.get(k) || null; },
      setItem(k, v) { this._data.set(k, String(v)); },
      removeItem(k) { this._data.delete(k); },
      clear() { this._data.clear(); }
    },
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    addEventListener: (evt, fn) => mockDocument.addEventListener(evt, fn)
  };

  globalThis.window = mockWindow;
  globalThis.document = mockDocument;
  globalThis.localStorage = mockWindow.localStorage;

  return { mockWindow, mockDocument, MockElement, elements, listeners };
}
```

#### B. Generyczny test spójności: `tests/unit/html-integrity.test.js`
Weryfikuje standardy semantyczne każdego pliku HTML, który powstanie w projekcie:

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('HTML & SEO Integrity Checks', () => {
  const htmlPath = path.resolve('index.html');
  const content = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';

  test('Plik index.html istnieje i nie jest pusty', () => {
    assert.ok(content.length > 50, 'index.html powinien zawierać szkielet dokumentu');
  });

  test('Posiada poprawny DOCTYPE i atrybut lang', () => {
    assert.match(content, /<!DOCTYPE html>/i, 'Brak <!DOCTYPE html>');
    assert.match(content, /<html\s+lang=["'][a-z]{2}["']/i, 'Brak atrybutu lang w tagu <html>');
  });

  test('Zawiera kluczowe znaczniki sekcji <head> (meta charset, viewport, title, description)', () => {
    assert.match(content, /<meta\s+charset=["']?utf-8/i, 'Brak kodowania UTF-8');
    assert.match(content, /<meta\s+name=["']viewport["']/i, 'Brak meta viewport');
    assert.match(content, /<title>.+<\/title>/i, 'Brak niepustego tagu <title>');
    assert.match(content, /<meta\s+name=["']description["']/i, 'Brak meta description dla SEO');
  });

  test('Zawiera semantyczną strukturę (dokładnie jeden tag <h1> oraz sekcje <main>)', () => {
    const h1Matches = content.match(/<h1[\s>]/gi) || [];
    assert.equal(h1Matches.length, 1, 'Na stronie powinien znajdować się dokładnie jeden tag <h1>');
    assert.match(content, /<main[\s>]/i, 'Strona powinna zawierać główny kontener semantyczny <main>');
  });

  test('Nie zawiera niedozwolonych pustych linków (href="#" bez celu)', () => {
    const emptyLinks = content.match(/href=["']#["']/gi) || [];
    assert.equal(emptyLinks.length, 0, 'Wykryto puste linki href="#". Użyj znaczników <button> lub podaj identyfikator sekcji.');
  });
});
```

---

### 3.4 Ochrona pre-commit hook (`.githooks/pre-commit`)

Umieść w katalogu `.githooks/pre-commit`:

```bash
#!/bin/sh
echo "🔍 [Pre-commit] Sprawdzanie jakości kodu przed zatwierdzeniem commita..."

# 1. Blokada przypadkowego commitowania sekretów .env
if git diff --cached --name-only | grep -E "\.env$"; then
  echo "❌ BŁĄD: Wykryto plik .env w paczce do zatwierdzenia!"
  echo "Usuń plik z indeksu poleceniem: git reset HEAD .env"
  exit 1
fi

# 2. Uruchomienie testów jednostkowych
if [ -f package.json ]; then
  npm test
  RESULT=$?
  if [ $RESULT -ne 0 ]; then
    echo "❌ BŁĄD: Testy jednostkowe nie przeszły! Popraw kod przed zatwierdzeniem."
    exit 1
  fi
fi

echo "✅ [Pre-commit] Wszystkie testy zaliczone. Commit dopuszczony."
exit 0
```

---

### 3.5 Konfiguracja audytu Lighthouse CI (`.lighthouserc.json`)

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./",
      "numberOfRuns": 2
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.90 }],
        "categories:best-practices": ["error", { "minScore": 0.90 }],
        "categories:seo": ["error", { "minScore": 0.90 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

### 3.6 Automatyzacja aktualizacji akcji (`.github/dependabot.yml`)

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

---

### 3.7 Nowoczesny potok `.github/workflows/ci.yml`

```yaml
name: CI & Quality Gate

on:
  push:
    branches:
      - staging
      - main
  pull_request:
    branches:
      - staging
      - main

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    name: 1. Quality Gate & Testy
    runs-on: ubuntu-latest

    steps:
      - name: 1.1 Pobranie kodu repozytorium
        uses: actions/checkout@v4

      - name: 1.2 Sprawdzenie pliku wejściowego (index.html lub index.php)
        run: |
          if [ ! -f index.html ] && [ ! -f index.php ]; then
            echo "Brak pliku wejściowego index.html lub index.php!"
            exit 1
          fi

      - name: 1.3 Ochrona przed wyciekiem .env
        run: |
          if git ls-files | grep -E "\.env$"; then
            echo "Wykryto plik .env w repozytorium!"
            exit 1
          fi

      - name: 1.4 Walidacja składni PHP (jeśli występują pliki .php)
        run: |
          if find . -type f -name "*.php" | grep -q .; then
            echo "Sprawdzanie składni PHP..."
            find . -type f -name "*.php" -print0 | xargs -0 -n1 php -l
          else
            echo "Brak plików PHP – pomijanie."
          fi

      - name: 1.5 Konfiguracja środowiska Node.js
        if: hashFiles('package.json') != ''
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: 1.6 Uruchomienie testów jednostkowych z raportem pokrycia
        if: hashFiles('package.json') != ''
        run: npm test -- --experimental-test-coverage

  lighthouse:
    name: 2. Audyt Lighthouse CI
    needs: validate
    runs-on: ubuntu-latest

    steps:
      - name: 2.1 Pobranie kodu
        uses: actions/checkout@v4

      - name: 2.2 Konfiguracja środowiska Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: 2.3 Instalacja Lighthouse CI CLI
        run: npm install -g @lhci/cli@0.14.0

      - name: 2.4 Uruchomienie audytu jakości
        run: lhci autorun
```

---

### 3.8 Szablony bazowe SEO (`robots.txt`, `sitemap.xml`)

#### `robots.txt`
```plaintext
User-agent: *
Allow: /

Sitemap: https://twojadomena.pl/sitemap.xml
```

#### `sitemap.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://twojadomena.pl/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

---

## 4. ETAP 2: Procedura krok po kroku (Runbook) – gdy strona jest już gotowa

Gdy tworzysz nowy serwis z szablonu `_site-template` lub gdy zakończono etap kodowania widoków, wykonaj poniższe kroki.

### Krok 1: Utworzenie projektu z szablonu
1. Na GitHubie wejdź w `TwojaStronaWWW/_site-template` i kliknij zielony przycisk **"Use this template"** -> **"Create a new repository"**.
2. Sklonuj nowe repozytorium na dysk:
   ```bash
   git clone https://github.com/TwojaStronaWWW/twoj-nowy-projekt.git
   cd twoj-nowy-projekt
   ```
3. Aktywuj lokalny pre-commit hook:
   ```bash
   git config core.hooksPath .githooks
   ```

---

### Krok 2: Konfiguracja zmiennych środowiskowych i sekretów
W ustawieniach nowego repozytorium na GitHubie (`Settings` -> `Secrets and variables` -> `Actions`):

1. **Repository Secrets:**
   - `FTP_SERVER`: np. `serwer417204.lh.pl`
   - `FTP_USERNAME`: login konta SFTP/FTP
   - `FTP_PASSWORD`: hasło do konta
   - `FTP_PORT`: `22` (dla SFTP) lub `21` (dla FTP)
2. **Repository Variables:**
   - `STAGING_PATH`: podkatalog serwera testowego (np. `dev.twojadomena.pl`)
   - `PRODUCTION_PATH`: podkatalog serwera produkcyjnego (np. `twojadomena.pl`)

---

### Krok 3: Dostosowanie testu spójności HTML (`html-integrity.test.js`)
Gdy strona ma gotową zawartość w `index.html`:
1. Otwórz `tests/unit/html-integrity.test.js`.
2. Dodaj specyficzne asercje dla Twojej witryny, np.:
   - Czy istnieje logo (`id="site-logo"`).
   - Czy sekcja kontaktowa zawiera poprawny link telefoniczny `tel:` i mailowy `mailto:`.
   - Czy wszystkie obrazki `<img>` posiadają niepusty atrybut `alt` (kluczowy wymóg WCAG 2.1).

---

### Krok 4: Pokrycie logiki JavaScript testami UI (`main.test.js`)
Dla każdego modułu JavaScript w `assets/js/`:
1. Utwórz lub zaktualizuj plik `tests/unit/main.test.js`.
2. Zainicjalizuj środowisko za pomocą `setupMockDom()`:
   ```javascript
   import { test, describe, beforeEach } from 'node:test';
   import assert from 'node:assert/strict';
   import { setupMockDom } from '../helpers/mock-dom.js';

   describe('Nawigacja mobilna (Hamburger)', () => {
     let dom;
     beforeEach(() => {
       dom = setupMockDom();
       const btn = dom.mockDocument.createElement('button');
       btn.id = 'menu-toggle';
       dom.elements.set('menu-toggle', btn);
     });

     test('Kliknięcie przycisku przełącza klasę aktywną', () => {
       const btn = dom.mockDocument.getElementById('menu-toggle');
       btn.classList.toggle('is-active');
       assert.ok(btn.classList.contains('is-active'));
     });
   });
   ```

---

### Krok 5: Aktualizacja i publikacja SEO (`robots.txt`, `sitemap.xml`)
1. **W `robots.txt`:** Podmień `twojadomena.pl` na właściwą domenę klienta (np. `krzysztofpoczatek.pl`).
2. **W `sitemap.xml`:**
   - Podmień adresy URL `<loc>` na docelową domenę.
   - Zaktualizuj znacznik daty `<lastmod>` do bieżącego dnia w formacie `YYYY-MM-DD`.
   - Jeśli strona posiada podstrony (np. `/polityka-prywatnosci`, `/cennik`), dopisz kolejne bloki `<url>`.

---

### Krok 6: (Opcjonalnie) Generator PDF dla ofert, cenników lub portfolio
Jeśli projekt wymaga eksportu widoku do PDF (tak jak w `Moje-CV`):
1. Skopiuj skrypt `scripts/generate-pdf.js`.
2. Dodaj arkusz `assets/css/print.css` z definicjami `@media print` i `@page { size: A4; margin: 10mm; }`.
3. Dodaj w `package.json` zależność `"puppeteer-core": "^22.0.0"` oraz skrypt:
   ```json
   "build:pdf": "node scripts/generate-pdf.js"
   ```

---

### Krok 7: Lokalna weryfikacja i pre-commit
Zanim wyślesz zmiany do repozytorium, sprawdź czy wszystko działa:
```bash
# 1. Uruchomienie testów z analizą pokrycia
npm run test:coverage

# 2. Uruchomienie audytu Lighthouse lokalnie
npm run audit:lighthouse

# 3. Zacommitowanie zmian (pre-commit hook sam zweryfikuje poprawność)
git add .
git commit -m "feat: Implementation of site views and SEO configuration"
```

---

### Krok 8: Wypchnięcie kodu na Staging i Production
1. **Wdrożenie na środowisko testowe:**
   ```bash
   git checkout -b staging
   git push origin staging
   ```
   *GitHub Actions automatycznie odpali testy, sprawdzi Lighthouse i wdroży pliki pod ścieżkę `${{ vars.STAGING_PATH }}`.*
2. **Wdrożenie na produkcję:**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```
   *Workflow wdroży pliki pod `${{ vars.PRODUCTION_PATH }}` i automatycznie utworzy tag wersji (np. `v2026.10.12-7f71fff`).*

---
*Dokumentacja przygotowana dla ekosystemu TwojaStronaWWW.*
