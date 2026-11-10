const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findBrowserBinary, generatePdf, OUTPUT_PDF } = require('../../scripts/generate-pdf');

describe('Generator oficjalnego PDF (scripts/generate-pdf.js)', () => {
  let tempTestDir;

  before(() => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pawel-cv-pdf-test-'));
  });

  after(() => {
    if (tempTestDir && fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  it('powinien poprawnie wykryć silnik Chromium w systemie lub honorować CHROME_PATH', () => {
    const browser = findBrowserBinary();
    assert.ok(browser, 'Nie wykryto żadnego silnika Chromium (Edge/Chrome)');
    assert.ok(fs.existsSync(browser), `Wskazany plik silnika nie istnieje na dysku: ${browser}`);
  });

  it('powinien respektować niestandardową zmienną środowiskową CHROME_PATH', () => {
    const originalEnv = process.env.CHROME_PATH;
    const testBinary = process.execPath; // node.exe istnieje na pewno

    try {
      process.env.CHROME_PATH = testBinary;
      const detected = findBrowserBinary();
      assert.strictEqual(detected, testBinary);
    } finally {
      if (originalEnv !== undefined) {
        process.env.CHROME_PATH = originalEnv;
      } else {
        delete process.env.CHROME_PATH;
      }
    }
  });

  it('powinien definiować domyślną ścieżkę wyjściową OUTPUT_PDF w katalogu dist', () => {
    assert.ok(OUTPUT_PDF.endsWith('Pawel_Krzewinski_CV.pdf'));
    assert.ok(OUTPUT_PDF.includes('dist'));
  });

  it('powinien poprawnie wygenerować plik PDF do os.tmpdir() (bez zapisu w dist/) i zwrócić metadane', () => {
    const testPdfPath = path.join(tempTestDir, 'test-output.pdf');
    assert.ok(testPdfPath.startsWith(os.tmpdir()), 'Test PDF musi zapisywać plik wyłącznie w os.tmpdir()');
    assert.strictEqual(testPdfPath.includes(`${path.sep}dist${path.sep}`), false);

    const result = generatePdf(testPdfPath);
    assert.ok(result);
    assert.strictEqual(result.filePath, testPdfPath);
    assert.ok(result.sizeBytes > 50000, `Rozmiar wygenerowanego PDF jest za mały: ${result.sizeBytes} B`);
    assert.ok(fs.existsSync(testPdfPath));
  });

  describe('Obsługa błędów i warianty platformowe', () => {
    it('powinien symulować wykrycie silnika w środowisku Linux przy użyciu which', () => {
      const mockWhich = (cmd, args) => {
        if (args[0] === 'google-chrome') {
          return process.execPath;
        }
        throw new Error('not found');
      };

      const detected = findBrowserBinary('linux', {}, mockWhich);
      assert.strictEqual(detected, process.execPath);
    });

    it('powinien zwrócić null, gdy na platformie Linux żaden kandydat nie jest zainstalowany', () => {
      const mockWhich = () => {
        throw new Error('command not found');
      };

      const detected = findBrowserBinary('linux', {}, mockWhich);
      assert.strictEqual(detected, null);
    });

    it('powinien zwrócić null na platformie Windows, gdy żaden ze standardowych folderów nie zawiera silnika', () => {
      const fakeEnv = { LOCALAPPDATA: 'C:\\NonExistentPath_Test_123' };
      const originalExists = fs.existsSync;

      try {
        fs.existsSync = (p) => {
          if (typeof p === 'string' && (p.includes('msedge.exe') || p.includes('chrome.exe'))) {
            return false;
          }
          return originalExists(p);
        };

        const detected = findBrowserBinary('win32', fakeEnv);
        assert.strictEqual(detected, null);
      } finally {
        fs.existsSync = originalExists;
      }
    });

    it('generatePdf powinien rzucić błąd, gdy wskazany plik wejściowy HTML nie istnieje', () => {
      const dummyOut = path.join(tempTestDir, 'dummy-missing-input.pdf');
      assert.throws(
        () => {
          generatePdf(dummyOut, { inputHtml: path.join(tempTestDir, 'non-existent-file.html') });
        },
        /Plik źródłowy HTML nie istnieje/i
      );
    });

    it('generatePdf powinien rzucić błąd, gdy silnik przeglądarki nie zostanie znaleziony', () => {
      const dummyOut = path.join(tempTestDir, 'dummy-no-browser.pdf');
      assert.throws(
        () => {
          generatePdf(dummyOut, { browser: '' });
        },
        /Nie znaleziono silnika Chromium/i
      );
    });

    it('generatePdf powinien rzucić błąd, gdy rozmiar pliku wyjściowego jest mniejszy niż minSize', () => {
      const testPdfPath = path.join(tempTestDir, 'size-test.pdf');
      assert.throws(
        () => {
          // Wymuszamy nierealistyczny minimalny rozmiar 1 GB
          generatePdf(testPdfPath, { minSize: 1024 * 1024 * 1024 });
        },
        /Wygenerowany plik PDF jest podejrzanie mały/i
      );
    });

    it('skrypt powinien poprawnie wykonać się jako samodzielne polecenie CLI z zapisem do os.tmpdir()', () => {
      const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'generate-pdf.js');
      const cliTempPdf = path.join(tempTestDir, 'cli-output.pdf');
      const { execFileSync } = require('node:child_process');
      const output = execFileSync(process.execPath, [scriptPath, cliTempPdf], { encoding: 'utf-8' });
      assert.ok(output.includes('[PDF Generator]'));
      assert.ok(output.includes('Sukces'));
      assert.ok(fs.existsSync(cliTempPdf));
    });
  });
});
