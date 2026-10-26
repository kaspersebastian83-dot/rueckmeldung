// Nur synthetische Daten. Ordner = Origin Private File System (statt echtem Ordnerdialog).
const os = require('node:os'), assert = require('node:assert/strict'), fs = require('node:fs'), http = require('node:http'), path = require('node:path'), zlib = require('node:zlib');
const playwright = require('playwright');
// kleines gültiges PNG (rot, 40x30)
function png(w, h) { const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xFFFFFFFF; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xFFFFFFFF) >>> 0; };
  const ch = (ty, d) => { const b = Buffer.concat([Buffer.from(ty), d]); const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([l, b, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w * 3 + 1) + 1 + x * 3] = 220;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]); }
const pick = (name, v) => page.click(`input[name="${name}"][value="${v}"]`);
let page;
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
  const server = http.createServer((q, r) => { r.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); r.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await playwright[process.argv[2] || 'chromium'].launch(); try {
  const ctx = await browser.newContext({viewport: {width: 1280, height: 1000}, acceptDownloads: true});
  page = await ctx.newPage(); const errors = [], downloads = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('download', d => downloads.push(d));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  // 0. Für Mitarbeiter nur das Formular; die Auswertung erscheint mit #auswertung (1.1.0)
  assert.equal(await page.locator('header nav').isVisible(), false); assert.equal(await page.locator('#tab-aus').isVisible(), false);
  // 1. Pflichtfelder
  await page.click('#b-senden');
  for (const id of ['e-app', 'e-art', 'e-titel', 'e-was', 'e-kuerzel']) assert.equal(await page.locator('#' + id).isVisible(), true, id);
  // 2. ohne Ordner: Anzeige + Download-Fallback, nichts geht verloren
  assert.match(await page.locator('#speicherort').textContent(), /Noch kein Speicherort/);
  await pick('app','labelkit'); await pick('art','fehler');
  await page.fill('#f-titel', 'Speichern zeigt rote Meldung'); await page.fill('#f-was', 'Nach Klick auf Speichern kam "Fehler" <b>fett</b>'); await page.fill('#f-kuerzel', 'ab');
  await page.reload(); // Entwurf überlebt Neuladen
  assert.equal(await page.inputValue('#f-titel'), 'Speichern zeigt rote Meldung'); assert.equal(await page.locator('input[name=art]:checked').getAttribute('value'), 'fehler');
  await page.click('#b-senden'); await page.waitForSelector('#fertig:not([hidden])');
  assert.equal(downloads.length, 1); assert.match(downloads[0].suggestedFilename(), /^R-\d{8}-\d{6}-AB\.json$/);
  assert.match(await page.locator('#fertig-text').textContent(), /heruntergeladen/);
  // 3. Ordner einrichten (OPFS statt echtem Dialog), zweite Rückmeldung mit Bild
  await page.evaluate(() => { window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('rm-test', {create: true}); });
  await page.click('#b-neu'); await page.click('#s-wahl'); await page.waitForFunction(() => /rm-test/.test(document.querySelector('#speicherort').textContent));
  await pick('app','plankit'); await pick('art','wunsch'); await pick('dring','stoert'); await pick('haeuf','immer');
  await page.fill('#f-titel', 'Karte größer'); await page.fill('#f-was', 'Die Karte ist zu klein.'); await page.fill('#f-soll', 'Mehr Platz.'); await page.fill('#f-projekt', '26.0123 Köln');
  await page.setInputFiles('#f-datei', {name: 'x.png', mimeType: 'image/png', buffer: png(40, 30)}); await page.waitForSelector('#bilder img');
  await page.click('#b-senden'); await page.waitForSelector('#fertig:not([hidden])');
  assert.equal(downloads.length, 1, 'mit Ordner kein Download');
  const dateien = await page.evaluate(async () => { const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('rm-test'); const o = []; for await (const [n] of d.entries()) o.push(n); return o.sort(); });
  assert.equal(dateien.length, 2); assert.ok(dateien.some(n => n.endsWith('.json')) && dateien.some(n => n.endsWith('_bild1.png')), dateien.join());
  // eine dritte, abgelehnt-fähige Rückmeldung
  await page.click('#b-neu'); await pick('app','spesenkit'); await pick('art','lob'); await page.fill('#f-titel', 'Monatsabschluss top'); await page.fill('#f-was', 'Ging schnell.'); await page.click('#b-senden'); await page.waitForSelector('#fertig:not([hidden])');
  // 4. Auswertung
  await page.evaluate(() => { location.hash = 'auswertung'; }); await page.waitForSelector('#tab-aus:not([hidden])');
  await page.click('#tab-aus'); await page.click('#a-laden'); await page.waitForSelector('#a-tbody tr[data-id]');
  assert.equal(await page.locator('#a-tbody tr[data-id]').count(), 2 + 0 + 0 === 2 ? 2 : 2); // PlanKit + SpesenKit im Ordner (die erste liegt im Download)
  assert.match(await page.locator('#a-zaehler').textContent(), /2 von 2 Einträgen · 2 offen/);
  await page.locator('#a-tbody tr[data-id]', {hasText: 'Karte größer'}).click();
  assert.match(await page.locator('#a-detail').textContent(), /Mehr Platz/); await page.waitForSelector('#d-bilder img');
  await page.selectOption('#d-status', 'in-arbeit'); await page.selectOption('#d-prio', 'hoch'); await page.fill('#d-gruppe', 'PlanKit Layout'); await page.fill('#d-notiz', 'Läuft');
  await page.click('#d-speichern'); await page.waitForFunction(() => /Gespeichert/.test(document.querySelector('#d-info')?.textContent || ''));
  const gespeichert = await page.evaluate(async () => { const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('rm-test'); for await (const [n, h] of d.entries()) if (n.endsWith('.json')) { const j = JSON.parse(await (await h.getFile()).text()); if (j.titel === 'Karte größer') return j; } });
  assert.equal(gespeichert.bearbeitung.status, 'in-arbeit'); assert.equal(gespeichert.bearbeitung.prioritaet, 'hoch'); assert.equal(gespeichert.was_passiert, 'Die Karte ist zu klein.', 'Angaben der Person bleiben unverändert');
  assert.equal(gespeichert.app, 'plankit'); assert.deepEqual(gespeichert.bilder.length, 1);
  // Filter
  await page.selectOption('#x-app', 'spesenkit'); assert.equal(await page.locator('#a-tbody tr[data-id]').count(), 1); await page.selectOption('#x-app', '');
  await page.fill('#x-text', 'karte'); assert.equal(await page.locator('#a-tbody tr[data-id]').count(), 1); await page.fill('#x-text', '');
  // 5. KI-Export
  const dl = page.waitForEvent('download'); await page.click('#k-export'); const md = fs.readFileSync(await (await dl).path(), 'utf8');
  assert.match(md, /kaspersebastian83-dot\/Probenplan/); assert.match(md, /Karte größer/); assert.match(md, /Monatsabschluss top/); assert.match(md, /Nichts erfinden|Nichts erfinden\./); assert.match(md, /```json/);
  assert.doesNotMatch(md, /<script/); fs.writeFileSync(path.join(os.tmpdir(), 'rueckmeldung-beispiel-ki-export.md'), md);
  const id1 = gespeichert.id;
  // 6. KI-Antwort einspielen
  await page.click('#a-ki summary');
  await page.fill('#k-antwort', 'Hier die Auswertung:\n```json\n[{"id":"' + id1 + '","status":"erledigt","prioritaet":"mittel","gruppe":"Layout","hinweis":"Kartenbreite anpassen."},{"id":"R-gibt-es-nicht","status":"neu"},{"id":"' + id1 + '","status":"kaputt"}]\n```');
  await page.click('#k-pruefen'); assert.match(await page.locator('#k-info').textContent(), /1 Eintrag.*bereit.*unbekannte ID.*ungültiger Status/);
  await page.click('#k-uebernehmen'); await page.waitForFunction(() => /aktualisiert/.test(document.querySelector('#k-info').textContent));
  await page.selectOption('#x-status', ''); await page.locator('#a-tbody tr[data-id]', {hasText: 'Karte größer'}).click();
  assert.match(await page.locator('#a-detail').textContent(), /Kartenbreite anpassen/); assert.equal(await page.inputValue('#d-status'), 'erledigt'); assert.equal(await page.inputValue('#d-notiz'), 'Läuft', 'manuelle Notiz bleibt');
  // 7. CSV
  const dc = page.waitForEvent('download'); await page.click('#k-csv'); const csv = fs.readFileSync(await (await dc).path(), 'utf8');
  assert.ok(csv.startsWith('﻿"ID";"Datum"')); assert.match(csv, /Karte größer/);
  // Screenshots zur Sichtprüfung
  await page.click('#tab-form'); await page.click('#b-neu'); await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'rueckmeldung-shot-form.png'), fullPage: true});
  await page.setViewportSize({width: 390, height: 900}); await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'rueckmeldung-shot-form-390.png'), fullPage: true});
  await page.setViewportSize({width: 1280, height: 1000}); await page.click('#tab-aus'); await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR || os.tmpdir(), 'rueckmeldung-shot-aus.png'), fullPage: true});
  // Aus einer App geöffnet: Programm, Version und Projekt vorbelegt; unbekannte Werte ignoriert (1.1.0)
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  await page.goto(base + '?app=fotokit&version=1.17.1&projekt=26.0999%20Test'); await page.waitForSelector('#c-app input');
  assert.equal(await page.locator('input[name=app][value=fotokit]').isChecked(), true);
  assert.equal(await page.inputValue('#f-version'), '1.17.1'); assert.equal(await page.inputValue('#f-projekt'), '26.0999 Test');
  const frisch = await (await browser.newContext()).newPage();   // eigener Browser-Speicher, kein Entwurf
  await frisch.goto(base + '?app=<b>x</b>&version=9'); await frisch.waitForSelector('#c-app input');
  assert.equal(await frisch.locator('input[name=app]:checked').count(), 0); assert.equal(await frisch.inputValue('#f-version'), '9');
  assert.equal(await frisch.locator('label.chip', {hasText: 'Datenarchiv'}).count(), 1);
  // 1.2.1: Nur vorbelegte Felder ergeben keinen Entwurf – die nächste App mit eigenem Link wird nicht überdeckt
  await page.goto(base + '?app=plankit&version=1.37.1&projekt=26.0456'); await page.waitForSelector('#c-app input');
  assert.equal(await page.locator('input[name=app][value=plankit]').isChecked(), true, 'Link der zweiten App gewinnt');
  assert.equal(await page.inputValue('#f-version'), '1.37.1'); assert.equal(await page.inputValue('#f-projekt'), '26.0456');
  assert.equal(await page.evaluate(() => localStorage.getItem('rueckmeldung:entwurf')), null, 'kein Entwurf ohne eigene Eingaben');
  // alter Entwurf (aus 1.2.0) nur mit Programm/Version/Projekt: der Link gewinnt
  await page.evaluate(() => localStorage.setItem('rueckmeldung:entwurf', JSON.stringify({app: 'fotokit', art: '', dring: '', haeuf: '', titel: '', tat: '', was: '', soll: '', projekt: '26.0123', version: '1.20.1'})));
  await page.goto(base + '?app=belegkit&version=2.0.0&projekt=26.0789'); await page.waitForSelector('#c-app input');
  assert.equal(await page.locator('input[name=app][value=belegkit]').isChecked(), true); assert.equal(await page.inputValue('#f-version'), '2.0.0'); assert.equal(await page.inputValue('#f-projekt'), '26.0789');
  // Entwurf mit eigenen Eingaben geht weiterhin vor
  await page.fill('#f-titel', 'Halb fertig'); await page.goto(base + '?app=labelkit&version=3.0.0'); await page.waitForSelector('#c-app input');
  assert.equal(await page.inputValue('#f-titel'), 'Halb fertig'); assert.equal(await page.locator('input[name=app][value=belegkit]').isChecked(), true); assert.equal(await page.inputValue('#f-version'), '2.0.0');
  // 1.2.1: Einfügen in ein Textfeld mit Text UND Bild (Excel) fügt den Text ein, ohne Text kommt das Bild in die Ablage
  const einfuegen = mitText => page.evaluate(async mitText => {
    const ta = document.querySelector('#f-was'); ta.focus();
    const c = document.createElement('canvas'); c.width = 4; c.height = 4; const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); if (mitText) dt.setData('text/plain', 'A1\tB1'); dt.items.add(new File([blob], 'image.png', {type: 'image/png'}));
    const ev = new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}); ta.dispatchEvent(ev);
    await new Promise(r => setTimeout(r, 400)); return {verhindert: ev.defaultPrevented, bilder: document.querySelectorAll('#bilder img').length};
  }, mitText);
  assert.deepEqual(await einfuegen(true), {verhindert: false, bilder: 0}, 'Text aus Excel wird nicht verschluckt');
  assert.deepEqual(await einfuegen(false), {verhindert: true, bilder: 1}, 'reines Bild wird weiter angehängt');
  assert.deepEqual(errors, []);
  console.log('Rückmeldung: Pflichtfelder, Entwurf, Download-Fallback, Ordner+Bild, Auswertung, Filter, KI-Export, KI-Import, CSV bestanden.');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
