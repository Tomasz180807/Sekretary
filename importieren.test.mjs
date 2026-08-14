/**
 * Tests für den HTML-Import.
 *
 *   node --test importieren.test.mjs
 *
 * Geprüft werden die Formen, in denen Wochenpläne typischerweise vorliegen:
 * Tabelle, Liste mit Überschriften, Einzeiler, Abkürzungen, HTML-Entities.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseWochenplan, alsZeilen } from './importieren.mjs';
import { ladePlan } from './plan.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('alsZeilen macht aus Blockgrenzen Zeilenumbrüche', () => {
  const zeilen = alsZeilen('<tr><td>Montag</td><td>08:00</td></tr><tr><td>Dienstag</td></tr>');
  assert.deepEqual(zeilen, ['Montag', '08:00', 'Dienstag']);
});

test('alsZeilen wirft Skript- und Stilblöcke weg', () => {
  const zeilen = alsZeilen('<style>td{color:red}</style><p>Montag</p><script>var x=1</script>');
  assert.deepEqual(zeilen, ['Montag']);
});

test('Tabelle: Wochentag, Zeitspanne und Titel in eigenen Zellen', () => {
  const html = `<table>
    <tr><td>Montag</td><td>08:00–13:15</td><td>Schule</td></tr>
    <tr><td>Dienstag</td><td>09:00–10:00</td><td>Musikschule</td></tr>
  </table>`;
  const { plan, anzahl, warnungen } = parseWochenplan(html);
  assert.equal(anzahl, 2);
  assert.deepEqual(plan.tage.mo, [{ von: '08:00', bis: '13:15', titel: 'Schule' }]);
  assert.deepEqual(plan.tage.di, [{ von: '09:00', bis: '10:00', titel: 'Musikschule' }]);
  assert.deepEqual(warnungen, []);
});

test('Überschrift plus Liste, mit Ort in Klammern', () => {
  const html = `
    <h3>Montag</h3>
    <ul>
      <li>08:00–13:15 Schule (Gymnasium)</li>
      <li>15:30–16:30 Hausaufgaben</li>
    </ul>
    <h3>Mittwoch</h3>
    <ul><li>08:00–15:00 Schule (Gymnasium)</li></ul>`;
  const { plan, anzahl } = parseWochenplan(html);
  assert.equal(anzahl, 3);
  assert.deepEqual(plan.tage.mo[0], { von: '08:00', bis: '13:15', titel: 'Schule', ort: 'Gymnasium' });
  assert.deepEqual(plan.tage.mo[1], { von: '15:30', bis: '16:30', titel: 'Hausaufgaben' });
  assert.equal(plan.tage.mi.length, 1);
  assert.equal(plan.tage.di.length, 0);
});

test('Einzeiler: Wochentag, Zeit und Titel in derselben Zeile', () => {
  const { plan } = parseWochenplan('<p>Montag 08:00 Schule</p><p>Freitag 14:30–15:30 Hausaufgaben</p>');
  assert.deepEqual(plan.tage.mo, [{ von: '08:00', titel: 'Schule' }]);
  assert.deepEqual(plan.tage.fr, [{ von: '14:30', bis: '15:30', titel: 'Hausaufgaben' }]);
});

test('Abkürzungen und deutsche Punktschreibweise', () => {
  const { plan, anzahl } = parseWochenplan('<p>Mo.</p><p>8.00 Uhr Schule</p><p>Di</p><p>9.30 Uhr Musik</p>');
  assert.equal(anzahl, 2);
  assert.deepEqual(plan.tage.mo, [{ von: '08:00', titel: 'Schule' }]);
  assert.deepEqual(plan.tage.di, [{ von: '09:30', titel: 'Musik' }]);
});

test('HTML-Entities werden aufgelöst', () => {
  const { plan } = parseWochenplan('<p>Montag</p><p>08:00&ndash;13:15 Fr&uuml;hst&uuml;ck &amp; Schule</p>');
  assert.deepEqual(plan.tage.mo, [{ von: '08:00', bis: '13:15', titel: 'Frühstück & Schule' }]);
});

test('Einträge werden nach Startzeit sortiert', () => {
  const { plan } = parseWochenplan('<p>Montag</p><p>18:00 Sport</p><p>08:00 Schule</p><p>15:30 Hausaufgaben</p>');
  assert.deepEqual(plan.tage.mo.map((e) => e.titel), ['Schule', 'Hausaufgaben', 'Sport']);
});

test('Uhrzeit vor dem ersten Wochentag wird gemeldet, nicht verschluckt', () => {
  const { anzahl, warnungen } = parseWochenplan('<p>08:00 Irgendwas</p>');
  assert.equal(anzahl, 0);
  assert.equal(warnungen.length, 1);
  assert.match(warnungen[0], /ohne vorangehenden Wochentag/);
});

test('nicht zuordenbare Zeilen werden gemeldet', () => {
  const { warnungen } = parseWochenplan('<p>Montag</p><p>Bitte Sportzeug mitbringen</p>');
  assert.equal(warnungen.length, 1);
  assert.match(warnungen[0], /Nicht zugeordnet/);
});

test('eine Uhrzeit ohne Titel am Ende wird gemeldet', () => {
  const { warnungen } = parseWochenplan('<p>Montag</p><p>08:00</p>');
  assert.equal(warnungen.length, 1);
  assert.match(warnungen[0], /ohne Titel/);
});

test('unsinnige Uhrzeiten werden nicht als Zeit gelesen', () => {
  const { anzahl, warnungen } = parseWochenplan('<p>Montag</p><p>99:99 Unfug</p>');
  assert.equal(anzahl, 0);
  assert.ok(warnungen.length >= 1);
});

test('der Import setzt kein "platzhalter" – es sind echte Daten', () => {
  const { plan } = parseWochenplan('<p>Montag</p><p>08:00 Schule</p>');
  assert.equal(plan.platzhalter, undefined);
  assert.equal(plan.diskretePush, true);
  assert.equal(plan.zeitzone, 'Europe/Berlin');
});

test('die Zeitzone lässt sich überschreiben', () => {
  const { plan } = parseWochenplan('<p>Montag</p><p>08:00 Schule</p>', { zeitzone: 'Europe/Vienna' });
  assert.equal(plan.zeitzone, 'Europe/Vienna');
});

test('das Ergebnis ist ein für ladePlan gültiger Wochenplan', () => {
  const html = `<h3>Montag</h3><ul><li>08:00–13:15 Schule (Gymnasium)</li></ul>
                <h3>Samstag</h3><ul><li>10:00 Einkaufen</li></ul>`;
  const { plan } = parseWochenplan(html);

  const ordner = mkdtempSync(join(tmpdir(), 'import-'));
  const pfad = join(ordner, 'wochenplan.json');
  writeFileSync(pfad, JSON.stringify(plan, null, 2));

  const geladen = ladePlan(pfad);
  assert.equal(geladen.zeitzone, 'Europe/Berlin');
  assert.equal(geladen.tage.mo[0].titel, 'Schule');
  assert.equal(geladen.tage.sa[0].titel, 'Einkaufen');
});
