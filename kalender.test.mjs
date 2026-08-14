/**
 * Tests für den Kalender-Export.
 *
 *   node --test kalender.test.mjs
 *
 * Schwerpunkt: die Verankerung der A/B-Wochen (ein Fehler dort verschiebt den
 * ganzen Kalender um eine Woche) und die Formvorgaben aus RFC 5545, an denen
 * Kalender-Apps sonst stillschweigend scheitern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { baueKalender, ersterTermin, maskiere, falte } from './kalender.mjs';

const abPlan = {
  zeitzone: 'Europe/Berlin',
  vorlaufMinuten: 10,
  wochenwechsel: { ankerDatum: '2026-08-17', ankerWoche: 'B' },
  wochen: {
    A: { mo: [{ von: '08:00', bis: '15:15', titel: 'Schule' }], di: [], mi: [], do: [], fr: [], sa: [], so: [] },
    B: { mo: [{ von: '08:00', bis: '13:10', titel: 'Schule' }], di: [], mi: [], do: [], fr: [], sa: [], so: [] },
  },
};

const einfach = {
  zeitzone: 'Europe/Berlin',
  vorlaufMinuten: 10,
  tage: { mo: [{ von: '08:00', bis: '09:00', titel: 'Schule' }], di: [], mi: [], do: [], fr: [], sa: [], so: [] },
};

test('maskiere schützt die Sonderzeichen aus RFC 5545', () => {
  assert.equal(maskiere('a,b;c\\d'), 'a\\,b\\;c\\\\d');
  assert.equal(maskiere('zwei\nZeilen'), 'zwei\\nZeilen');
});

test('falte bricht auf 75 Oktette um und zerreißt keine Umlaute', () => {
  const lang = `SUMMARY:${'ä'.repeat(80)}`;
  const gefaltet = falte(lang);
  for (const zeile of gefaltet.split('\r\n')) {
    assert.ok(Buffer.byteLength(zeile, 'utf8') <= 75, `zu lang: ${Buffer.byteLength(zeile, 'utf8')}`);
  }
  // Rückgefaltet muss exakt das Original herauskommen.
  assert.equal(gefaltet.split('\r\n ').join(''), lang);
});

test('kurze Zeilen bleiben unangetastet', () => {
  assert.equal(falte('SUMMARY:Sport'), 'SUMMARY:Sport');
});

test('ersterTermin trifft Wochentag und Wochenvariante', () => {
  const ab = new Date('2026-08-14T00:00:00Z'); // Freitag, Woche A
  assert.equal(ersterTermin(abPlan, ab, 'mo', 'B').toISOString().slice(0, 10), '2026-08-17');
  assert.equal(ersterTermin(abPlan, ab, 'mo', 'A').toISOString().slice(0, 10), '2026-08-24');
  assert.equal(ersterTermin(abPlan, ab, 'sa', 'A').toISOString().slice(0, 10), '2026-08-15');
  assert.equal(ersterTermin(abPlan, ab, 'sa', 'B').toISOString().slice(0, 10), '2026-08-22');
});

test('ohne Wochenvariante zählt nur der Wochentag', () => {
  const ab = new Date('2026-08-14T00:00:00Z');
  assert.equal(ersterTermin(einfach, ab, 'mo', null).toISOString().slice(0, 10), '2026-08-17');
});

test('A/B-Wochen werden im Zweiwochentakt verankert', () => {
  const { ics, anzahl } = baueKalender(abPlan, { ab: '2026-08-14' });
  assert.equal(anzahl, 2);
  assert.match(ics, /UID:B-mo-0800-0@sekretary\r\nDTSTAMP:[^\r]+\r\nDTSTART;TZID=Europe\/Berlin:20260817T080000/);
  assert.match(ics, /UID:A-mo-0800-0@sekretary\r\nDTSTAMP:[^\r]+\r\nDTSTART;TZID=Europe\/Berlin:20260824T080000/);
  assert.equal(ics.match(/RRULE:FREQ=WEEKLY;INTERVAL=2/g).length, 2);
});

test('ein einfacher Wochenplan wird wöchentlich wiederholt', () => {
  const { ics } = baueKalender(einfach, { ab: '2026-08-14' });
  assert.match(ics, /RRULE:FREQ=WEEKLY\r\n/);
  assert.doesNotMatch(ics, /INTERVAL=2/);
});

test('jeder Termin bekommt eine Erinnerung mit dem gewünschten Vorlauf', () => {
  const { ics } = baueKalender(abPlan, { ab: '2026-08-14', vorlaufMinuten: 5 });
  assert.equal(ics.match(/TRIGGER:-PT5M/g).length, 2);
  assert.match(ics, /DESCRIPTION:In 5 Minuten: Schule/);
});

test('die Zeitzonenregeln stehen mit in der Datei', () => {
  const { ics } = baueKalender(abPlan, { ab: '2026-08-14' });
  assert.match(ics, /BEGIN:VTIMEZONE/);
  assert.match(ics, /TZID:Europe\/Berlin/);
  assert.match(ics, /RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU/);  // Sommerzeit
  assert.match(ics, /RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU/); // Winterzeit
});

test('Ort und Hinweis landen in den passenden Feldern', () => {
  const mit = {
    ...einfach,
    tage: { ...einfach.tage, mo: [{ von: '08:00', bis: '09:00', titel: 'Sport', ort: 'Halle', hinweis: 'Zeug mitnehmen' }] },
  };
  const { ics } = baueKalender(mit, { ab: '2026-08-14' });
  assert.match(ics, /LOCATION:Halle/);
  assert.match(ics, /DESCRIPTION:Zeug mitnehmen/);
});

test('ein Eintrag ohne Endzeit bekommt eine Vorgabedauer', () => {
  const offen = { ...einfach, tage: { ...einfach.tage, mo: [{ von: '08:00', titel: 'Trading' }] } };
  const { ics } = baueKalender(offen, { ab: '2026-08-14' });
  assert.match(ics, /DTSTART;TZID=Europe\/Berlin:20260817T080000/);
  assert.match(ics, /DTEND;TZID=Europe\/Berlin:20260817T083000/);
});

test('die Datei erfüllt die Formvorgaben von RFC 5545', () => {
  const { ics } = baueKalender(abPlan, { ab: '2026-08-14' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'nacktes LF gefunden');
  for (const zeile of ics.split('\r\n')) {
    assert.ok(Buffer.byteLength(zeile, 'utf8') <= 75, `Zeile zu lang: ${zeile.slice(0, 40)}`);
  }
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, ics.match(/END:VEVENT/g).length);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, ics.match(/END:VALARM/g).length);
});

test('UIDs sind eindeutig – sonst überschreiben sich Termine beim Import', () => {
  const { ics } = baueKalender(abPlan, { ab: '2026-08-14' });
  const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((t) => t[1]);
  assert.equal(new Set(uids).size, uids.length);
});

test('der echte Wochenplan liefert für jeden Block genau eine Erinnerung', async () => {
  const { ladePlan, STANDARD_PLAN } = await import('./plan.mjs');
  const plan = ladePlan(STANDARD_PLAN);
  const { ics, anzahl, uebersprungen } = baueKalender(plan, { ab: '2026-08-14' });
  assert.deepEqual(uebersprungen, []);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, anzahl);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, anzahl);
  const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((t) => t[1]);
  assert.equal(new Set(uids).size, uids.length);
});
