const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, '../../flower/static/js/theme.js'), 'utf8');
const mode = (primary, background, text, fontId = 'legacy') => ({
  surface: { canvas: background, paper: background, divider: '#777777' },
  text: { primary: text, secondary: text },
  interaction: { primary, onPrimary: null, link: null, focus: null, selectedBg: null, selectedText: null },
  status: { success: { main: '#23969A', contrastText: '#000' }, warning: { main: '#FAD22D', contrastText: '#242424' }, error: { main: '#C52A32', contrastText: '#FFF' } },
  typography: { fontId, monoFontId: fontId === 'hilda' ? 'hilda-mono' : 'legacy', bodySize: 16 },
  geometry: { radius: 8 }
});
const palette = (preferred = 'dark', light = mode('#FAD22D', '#F4F5FA', 'rgba(58, 53, 65, 0.87)'), dark = mode('#1174E6', '#242424', '#FFFFFF', 'hilda')) => ({
  schema_version: 1, preferred_mode: preferred, modes: { light, dark }
});

function boot(stored = null) {
  const attrs = {}, css = {}, handlers = {}, requests = [], storage = new Map(stored ? [['flower-theme', stored]] : []);
  const root = { setAttribute: (key, value) => { attrs[key] = value }, getAttribute: key => attrs[key], style: { setProperty: (key, value) => { css[key] = value } } };
  const options = ['oscar', 'light', 'dark'].map(value => ({
    value, attrs: { 'data-bs-theme-value': value }, classList: { toggle() {} },
    setAttribute(key, val) { this.attrs[key] = val }, getAttribute(key) { return this.attrs[key] },
    addEventListener(key, handler) { this[key] = handler }
  }));
  const elements = {
    'theme-toggle': { setAttribute(key, value) { this[key] = value } },
    'theme-toggle-label': { textContent: '' },
    'theme-toggle-icon': { setAttribute(key, value) { this[key] = value } }
  };
  const document = { documentElement: root, getElementById: id => elements[id], querySelectorAll: () => options,
    addEventListener: (key, handler) => { handlers[key] = handler } };
  const window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, val) => storage.set(key, val), removeItem: key => storage.delete(key) },
    matchMedia: () => ({ matches: true, addEventListener() {} }), addEventListener: (key, handler) => { handlers[key] = handler } };
  const fetch = url => new Promise((resolve, reject) => { requests.push({ url, resolve: value => resolve({ ok: true, json: async () => value }), reject }) });
  vm.runInNewContext(script, { document, window, fetch });
  handlers.DOMContentLoaded();
  return { attrs, css, handlers, requests, storage, options, elements, click: name => options.find(option => option.value === name).click(),
    answer: async (index, value) => { requests[index].resolve(value); await new Promise(resolve => setImmediate(resolve)) } };
}

test('OSCAR is the default and applies its preferred palette from the canonical endpoint', async () => {
  const app = boot();
  assert.equal(app.attrs['data-bs-theme'], 'dark');
  assert.equal(app.requests[0].url, '/api/branding/flower/');
  await app.answer(0, palette('light'));
  assert.equal(app.attrs['data-bs-theme'], 'light');
  assert.equal(app.css['--bs-primary'], '#FAD22D');
  assert.equal(app.options[0].attrs['aria-pressed'], 'true');
  assert.match(app.elements['theme-toggle'].getAttribute?.('aria-label') ?? app.elements['theme-toggle']['aria-label'], /OSCAR/);
});

test('manual selection persists, still receives palette updates, and OSCAR resets it', async () => {
  const app = boot();
  await app.answer(0, palette());
  app.click('light');
  assert.equal(app.storage.get('flower-theme'), 'light');
  assert.equal(app.css['--bs-primary'], '#FAD22D');
  app.handlers.focus();
  await app.answer(1, palette('dark', mode('#C52A32', '#F4F5FA', '#242424')));
  assert.equal(app.attrs['data-bs-theme'], 'light');
  assert.equal(app.css['--bs-primary'], '#C52A32');
  app.click('oscar');
  assert.equal(app.storage.has('flower-theme'), false);
  assert.equal(app.attrs['data-bs-theme'], 'dark');
  assert.equal(app.css['--bs-primary'], '#1174E6');
});

test('a persisted override survives a direct visit without OSCAR opening first', async () => {
  const app = boot('light');
  assert.equal(app.attrs['data-bs-theme'], 'light');
  await app.answer(0, palette('dark'));
  assert.equal(app.attrs['data-bs-theme'], 'light');
});

test('latest focus response wins when older fetch finishes last', async () => {
  const app = boot();
  app.handlers.focus();
  await app.answer(1, palette('light', mode('#C52A32', '#F4F5FA', '#242424')));
  await app.answer(0, palette('dark'));
  assert.equal(app.attrs['data-bs-theme'], 'light');
  assert.equal(app.css['--bs-primary'], '#C52A32');
});

test('invalid data and failures retain the last good palette', async () => {
  const app = boot();
  app.requests[0].reject(new Error('offline'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.attrs['data-bs-theme'], 'dark');
  app.handlers.focus();
  await app.answer(1, palette());
  const before = app.css['--bs-primary'];
  app.handlers.focus();
  await app.answer(2, { ...palette('light'), schema_version: 2 });
  assert.equal(app.css['--bs-primary'], before);
  app.handlers.focus();
  await app.answer(3, palette('light', mode('red; color: hotpink', '#fff', '#000')));
  assert.equal(app.css['--bs-primary'], before);
  app.handlers.focus();
  await app.answer(4, palette('light', mode('#FAD22D', '#fff', '#000', 'evil')));
  assert.equal(app.css['--bs-primary'], before);
});

test('Classic null roles, rgba text, and yellow primary fill remain usable', async () => {
  const app = boot();
  await app.answer(0, palette('light'));
  assert.match(app.css['--bs-body-font-family'], /Montserrat/);
  assert.match(app.css['--bs-body-color-rgb'], /^\d+, \d+, \d+$/);
  assert.match(app.css['--bs-link-color'], /^#/);
  assert.equal(app.css['--flower-on-primary'], '#242424');
  assert.equal(app.css['--flower-accent-text'], app.css['--bs-body-color']);
  app.click('dark');
  assert.equal(app.css['--bs-body-color-rgb'], '255, 255, 255');
  assert.equal(app.css['--bs-primary-rgb'], '17, 116, 230');
});

test('resolved control border and focus roles reach input and button variables', async () => {
  const app = boot();
  const light = mode('#1174E6', '#F2F2F2', '#242424', 'hilda');
  light.interaction.controlBorder = '#767676';
  light.interaction.focus = '#000082';
  await app.answer(0, palette('light', light));
  assert.equal(app.css['--flower-control-border'], '#767676');
  assert.equal(app.css['--flower-focus'], '#000082');
  assert.equal(app.css['--flower-focus-rgb'], '0, 0, 130');
});
