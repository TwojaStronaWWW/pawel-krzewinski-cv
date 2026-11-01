const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const MAIN_CSS_PATH = path.join(ROOT_DIR, 'assets', 'css', 'main.css');
const PRINT_CSS_PATH = path.join(ROOT_DIR, 'assets', 'css', 'print.css');

describe('Integralność i składnia arkuszy stylów CSS', () => {
  const mainCss = fs.readFileSync(MAIN_CSS_PATH, 'utf-8');
  const printCss = fs.readFileSync(PRINT_CSS_PATH, 'utf-8');

  it('główny arkusz stylów main.css powinien posiadać idealnie zbalansowane nawiasy klamrowe {}', () => {
    const openBraces = (mainCss.match(/\{/g) || []).length;
    const closeBraces = (mainCss.match(/\}/g) || []).length;
    assert.strictEqual(
      openBraces,
      closeBraces,
      `Niezbalansowane nawiasy klamrowe w main.css: { (${openBraces}) vs } (${closeBraces})`
    );
  });

  it('arkusz wydruku print.css powinien posiadać idealnie zbalansowane nawiasy klamrowe {}', () => {
    const openBraces = (printCss.match(/\{/g) || []).length;
    const closeBraces = (printCss.match(/\}/g) || []).length;
    assert.strictEqual(
      openBraces,
      closeBraces,
      `Niezbalansowane nawiasy klamrowe w print.css: { (${openBraces}) vs } (${closeBraces})`
    );
  });

  it('arkusze stylów powinny posiadać zbalansowane nawiasy okrągłe ()', () => {
    const mainOpenParen = (mainCss.match(/\(/g) || []).length;
    const mainCloseParen = (mainCss.match(/\)/g) || []).length;
    assert.strictEqual(mainOpenParen, mainCloseParen, 'Niezbalansowane nawiasy okrągłe w main.css');

    const printOpenParen = (printCss.match(/\(/g) || []).length;
    const printCloseParen = (printCss.match(/\)/g) || []).length;
    assert.strictEqual(printOpenParen, printCloseParen, 'Niezbalansowane nawiasy okrągłe w print.css');
  });

  it('główny arkusz powinien definiować spójną paletę zmiennych CSS w :root', () => {
    assert.match(mainCss, /:root\s*\{/i);
    assert.match(mainCss, /--color-primary:/i);
    assert.match(mainCss, /--color-text-dark:/i);
    assert.match(mainCss, /--color-text-light:/i);
  });

  it('arkusz print.css powinien nadpisywać zmienne i wymuszać print-color-adjust', () => {
    assert.match(printCss, /print-color-adjust:\s*exact/i);
    assert.match(printCss, /--color-primary:/i);
  });

  it('arkusze nie powinny zawierać pustych reguł CSS bez deklaracji właściwości', () => {
    // Sprawdza czy nie ma konstrukcji typu `selector { }` lub `selector {\n}`
    const emptyRuleRegex = /[^{}]+\{\s*\}/g;
    const emptyInMain = mainCss.match(emptyRuleRegex);
    const emptyInPrint = printCss.match(emptyRuleRegex);

    assert.strictEqual(emptyInMain, null, `Wykryto puste reguły w main.css: ${emptyInMain}`);
    assert.strictEqual(emptyInPrint, null, `Wykryto puste reguły w print.css: ${emptyInPrint}`);
  });
});
