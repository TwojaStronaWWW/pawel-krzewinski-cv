const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MockElement, MockDocument, MockWindow, createForbiddenFetch } = require('../helpers/mock-dom');

describe('Helper testowy Mock DOM (tests/helpers/mock-dom.js)', () => {
  it('MockElement.closest powinien obsłużyć przypadek braku dopasowania', () => {
    const el = new MockElement('myDiv', 'div');
    assert.strictEqual(el.closest('SPAN'), null);
    assert.strictEqual(el.closest('DIV'), el);
  });

  it('MockDocument.querySelectorAll powinien obsłużyć selektory inne niż ID i klasa', () => {
    const doc = new MockDocument();
    const el = new MockElement('test', 'button');
    doc.registerElement(el);

    const matches = doc.querySelectorAll('customTag');
    assert.deepStrictEqual(matches, []);
  });

  it('MockWindow.print powinien poprawnie zliczać wywołania', () => {
    const win = new MockWindow();
    assert.strictEqual(win.printCalled, 0);
    win.print();
    assert.strictEqual(win.printCalled, 1);
  });

  it('createForbiddenFetch oraz globalThis.fetch powinny blokować niezamockowane wywołania sieciowe (NETWORK_FORBIDDEN)', async () => {
    const forbidden = createForbiddenFetch();
    await assert.rejects(
      async () => forbidden('https://example.com'),
      (err) => err.code === 'NETWORK_FORBIDDEN' && err.message.includes('NETWORK_FORBIDDEN')
    );
  });
});
