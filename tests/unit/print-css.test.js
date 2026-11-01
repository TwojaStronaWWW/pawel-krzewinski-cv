const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PRINT_CSS_PATH = path.join(__dirname, '..', '..', 'assets', 'css', 'print.css');
const HTML_PATH = path.join(__dirname, '..', '..', 'index.html');

describe('Standardy wydruku A4 i generowania PDF (print.css)', () => {
  const printCss = fs.readFileSync(PRINT_CSS_PATH, 'utf-8');
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');

  it('index.html powinien dołączać print.css z atrybutem media="print"', () => {
    assert.match(
      htmlContent,
      /<link[^>]+rel="stylesheet"[^>]+href="assets\/css\/print\.css[^"]*"[^>]+media="print"/i,
      'Brak poprawnego podpięcia print.css z media="print" w index.html'
    );
  });

  it('powinien definiować regułę @page ze skalą A4 portrait', () => {
    assert.match(printCss, /@page\s*\{[^}]*size:\s*A4 portrait/i, 'Brak reguły @page definiującej format A4 portrait');
  });

  it('powinien wymuszać dokładne drukowanie kolorów (print-color-adjust: exact)', () => {
    assert.match(printCss, /print-color-adjust:\s*exact/i);
    assert.match(printCss, /-webkit-print-color-adjust:\s*exact/i);
  });

  it('powinien posiadać regułę .page-break-before do kontrolowanego łamania stron A4', () => {
    assert.match(
      printCss,
      /\.page-break-before\s*\{[^}]*page-break-before:\s*always/i,
      'Brak reguły .page-break-before z page-break-before: always'
    );
  });

  it('powinien ukrywać elementy czysto ekranowe/interaktywne w widoku druku (display: none)', () => {
    assert.match(printCss, /\.toggle-menu/i);
    assert.match(printCss, /\.btn-print/i);
    assert.match(printCss, /display:\s*none\s*!important/i);
  });

  it('powinien zabezpieczać pojedyncze wpisy historii pracy (article) przed rozrywaniem na granicy strony', () => {
    assert.match(printCss, /article\s*\{[^}]*page-break-inside:\s*avoid/i);
  });
});
