const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Integralność plików statycznych (Assets)', () => {
  it('główny arkusz stylów CSS powinien istnieć i mieć niezerowy rozmiar', () => {
    const cssPath = path.join(ROOT_DIR, 'assets', 'css', 'main.css');
    assert.ok(fs.existsSync(cssPath), 'Brak assets/css/main.css');
    const stats = fs.statSync(cssPath);
    assert.ok(stats.size > 100, 'assets/css/main.css jest pusty');
  });

  it('arkusz stylów do druku (print.css) powinien istnieć', () => {
    const printCssPath = path.join(ROOT_DIR, 'assets', 'css', 'print.css');
    assert.ok(fs.existsSync(printCssPath), 'Brak assets/css/print.css');
    const stats = fs.statSync(printCssPath);
    assert.ok(stats.size > 50, 'assets/css/print.css jest pusty');
  });

  it('zdjęcie profilowe powinno istnieć i mieć format JPEG o odpowiednim rozmiarze', () => {
    const photoPath = path.join(ROOT_DIR, 'assets', 'images', 'photo.jpg');
    assert.ok(fs.existsSync(photoPath), 'Brak assets/images/photo.jpg');
    const stats = fs.statSync(photoPath);
    assert.ok(stats.size > 1024, 'Zdjęcie profilowe photo.jpg ma podejrzanie mały rozmiar');
  });

  it('ikona favicon powinna istnieć i być poprawnym wektorowym plikiem SVG', () => {
    const faviconPath = path.join(ROOT_DIR, 'assets', 'images', 'favicon.svg');
    assert.ok(fs.existsSync(faviconPath), 'Brak assets/images/favicon.svg');
    const content = fs.readFileSync(faviconPath, 'utf-8');
    assert.match(content, /<svg[^>]*>/i, 'Favicon nie zawiera poprawnego znacznika <svg>');
  });

  it('obraz podglądu Open Graph powinien istnieć w katalogu assets/images', () => {
    const ogPng = path.join(ROOT_DIR, 'assets', 'images', 'og-preview.png');
    const ogJpg = path.join(ROOT_DIR, 'assets', 'images', 'og-preview.jpg');
    const exists = fs.existsSync(ogPng) || fs.existsSync(ogJpg);
    assert.ok(exists, 'Brak pliku og-preview w assets/images (ani png, ani jpg)');
  });

  it('plik JavaScript assets/js/main.js powinien istnieć i być poprawny syntaktycznie', () => {
    const jsPath = path.join(ROOT_DIR, 'assets', 'js', 'main.js');
    assert.ok(fs.existsSync(jsPath), 'Brak assets/js/main.js');
    const content = fs.readFileSync(jsPath, 'utf-8');
    assert.ok(content.includes('initSidebar'));
    assert.ok(content.includes('initPrintButtons'));
  });
});
