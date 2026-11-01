const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { findBrowserBinary, generatePdf, OUTPUT_PDF } = require('../../scripts/generate-pdf');

describe('Generator oficjalnego PDF (scripts/generate-pdf.js)', () => {
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
    assert.ok(OUTPUT_PDF.endsWith('Krzysztof_Poczatek_CV.pdf'));
    assert.ok(OUTPUT_PDF.includes('dist'));
  });

  it('powinien poprawnie wygenerować plik PDF i zwrócić metadane o pliku', () => {
    const testPdfPath = path.join(__dirname, '..', '..', 'dist', 'test-output.pdf');

    const result = generatePdf(testPdfPath);
    assert.ok(result);
    assert.strictEqual(result.filePath, testPdfPath);
    assert.ok(result.sizeBytes > 50000, `Rozmiar wygenerowanego PDF jest za mały: ${result.sizeBytes} B`);
    assert.ok(fs.existsSync(testPdfPath));

    // Porządki po teście
    try {
      fs.unlinkSync(testPdfPath);
    } catch {
      // Ignoruj błąd usunięcia
    }
  });

  describe('Obsługa błędów i warianty platformowe', () => {
    it('powinien symulować wykrycie silnika w środowisku Linux przy użyciu which', () => {
      const mockWhich = (cmd, args) => {
        if (args[0] === 'google-chrome') {
          return process.execPath; // Zwracamy istniejący plik na dysku
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
      assert.throws(
        () => {
          generatePdf('dist/dummy.pdf', { inputHtml: 'non-existent-file.html' });
        },
        /Plik źródłowy HTML nie istnieje/i
      );
    });

    it('generatePdf powinien rzucić błąd, gdy silnik przeglądarki nie zostanie znaleziony', () => {
      assert.throws(
        () => {
          generatePdf('dist/dummy.pdf', { browser: '' });
        },
        /Nie znaleziono silnika Chromium/i
      );
    });

    it('generatePdf powinien rzucić błąd, gdy rozmiar pliku wyjściowego jest mniejszy niż minSize', () => {
      const testPdfPath = path.join(__dirname, '..', '..', 'dist', 'size-test.pdf');
      try {
        assert.throws(
          () => {
            // Wymuszamy nierealistyczny minimalny rozmiar 1 GB
            generatePdf(testPdfPath, { minSize: 1024 * 1024 * 1024 });
          },
          /Wygenerowany plik PDF jest podejrzanie mały/i
        );
      } finally {
        try {
          fs.unlinkSync(testPdfPath);
        } catch {
          // Ignoruj
        }
      }
    });

    it('skrypt powinien poprawnie wykonać się jako samodzielne polecenie CLI (require.main === module)', () => {
      const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'generate-pdf.js');
      const { execFileSync } = require('node:child_process');
      const output = execFileSync(process.execPath, [scriptPath], { encoding: 'utf-8' });
      assert.ok(output.includes('[PDF Generator]'));
      assert.ok(output.includes('Sukces'));
    });
  });
});
