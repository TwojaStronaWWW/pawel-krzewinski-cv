/**
 * Lekki helper Mock DOM do testów jednostkowych JavaScript w Node.js
 * Nie wymaga zewnętrznych zależności (np. jsdom), działa błyskawicznie w node:test.
 */

class MockClassList {
  constructor() {
    this.classes = new Set();
  }

  add(cls) {
    this.classes.add(cls);
  }

  remove(cls) {
    this.classes.delete(cls);
  }

  contains(cls) {
    return this.classes.has(cls);
  }

  toggle(cls) {
    if (this.classes.has(cls)) {
      this.classes.delete(cls);
      return false;
    } else {
      this.classes.add(cls);
      return true;
    }
  }
}

class MockElement {
  constructor(id = '', tagName = 'div', classNames = []) {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.classList = new MockClassList();
    classNames.forEach(c => this.classList.add(c));
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = '';
    this.children = [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  focus() {
    this.isFocused = true;
  }

  closest(selector) {
    if (selector.toUpperCase() === this.tagName) return this;
    return null;
  }

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  click() {
    const event = { target: this };
    const handlers = this.listeners.get('click') || [];
    for (const fn of handlers) {
      fn(event);
    }
  }

  contains(target) {
    if (this === target) return true;
    return this.children.some(child => child === target || (child.contains && child.contains(target)));
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

class MockDocument {
  constructor() {
    this.elementsById = new Map();
    this.elements = [];
    this.docListeners = new Map();
  }

  registerElement(el) {
    if (el.id) {
      this.elementsById.set(el.id, el);
    }
    this.elements.push(el);
    return el;
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map(s => s.trim());
    return this.elements.filter(el => {
      return selectors.some(sel => {
        if (sel.startsWith('#')) {
          return el.id === sel.slice(1);
        }
        if (sel.startsWith('.')) {
          return el.classList.contains(sel.slice(1));
        }
        return false;
      });
    });
  }

  addEventListener(event, callback) {
    if (!this.docListeners.has(event)) {
      this.docListeners.set(event, []);
    }
    this.docListeners.get(event).push(callback);
  }

  dispatchDocumentClick(target) {
    const event = { target };
    const handlers = this.docListeners.get('click') || [];
    for (const fn of handlers) {
      fn(event);
    }
  }

  dispatchDocumentKeyDown(keyEvent) {
    const handlers = this.docListeners.get('keydown') || [];
    for (const fn of handlers) {
      fn(keyEvent);
    }
  }
}

class MockWindow {
  constructor(initialWidth = 500) {
    this.innerWidth = initialWidth;
    this.listeners = new Map();
    this.printCalled = 0;
  }

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  dispatchResize(newWidth) {
    this.innerWidth = newWidth;
    const handlers = this.listeners.get('resize') || [];
    for (const fn of handlers) {
      fn({ target: this });
    }
  }

  print() {
    this.printCalled++;
  }
}

function createForbiddenFetch() {
  return async (url) => {
    const err = new Error(`NETWORK_FORBIDDEN: Niezamockowane wywołanie fetch('${url}') w teście jednostkowym`);
    err.code = 'NETWORK_FORBIDDEN';
    throw err;
  };
}

globalThis.fetch = createForbiddenFetch();

module.exports = {
  MockElement,
  MockDocument,
  MockWindow,
  createForbiddenFetch,
};
