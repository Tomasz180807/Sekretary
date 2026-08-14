/**
 * Tests für die Antwortlogik des Telegram-Bots.
 *
 *   node --test antworten.test.mjs
 *
 * bot.mjs selbst ist reiner Transport und bleibt ungetestet; alles, was eine
 * Antwort bestimmt, liegt in antworten.mjs und ist hier abgedeckt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { baueAntwort, erkenneAbsicht, HILFE } from './antworten.mjs';

const plan = {
  zeitzone: 'Europe/Berlin',
  briefingZeit: '15:00',
  vorlaufMinuten: 90,
  tage: {
    mo: [
      { von: '08:00', bis: '13:15', titel: 'Schule', ort: 'Gymnasium' },
      { von: '15:30', bis: '16:30', titel: 'Hausaufgaben' },
      { von: '18:00', bis: '19:30', titel: 'Sport', ort: 'Sporthalle' },
    ],
    di: [{ von: '09:00', bis: '10:00', titel: 'Musikschule' }],
    mi: [], do: [], fr: [], sa: [], so: [],
  },
  termine: [],
  freieTage: [],
};

// Montag, 17.08.2026, 15:05 Ortszeit
const MONTAG = new Date('2026-08-17T13:05:00Z');

test('erkenneAbsicht versteht Befehle', () => {
  assert.equal(erkenneAbsicht('/heute'), 'heute');
  assert.equal(erkenneAbsicht('/morgen'), 'morgen');
  assert.equal(erkenneAbsicht('/briefing'), 'briefing');
  assert.equal(erkenneAbsicht('/naechste'), 'naechste');
  assert.equal(erkenneAbsicht('/woche'), 'woche');
  assert.equal(erkenneAbsicht('/start'), 'hilfe');
});

test('erkenneAbsicht versteht Befehle mit Botnamen aus Gruppen', () => {
  assert.equal(erkenneAbsicht('/heute@sekretaerbot'), 'heute');
});

test('erkenneAbsicht versteht formlose deutsche Eingaben', () => {
  assert.equal(erkenneAbsicht('was steht heute an?'), 'heute');
  assert.equal(erkenneAbsicht('Was kommt als nächstes'), 'naechste');
  assert.equal(erkenneAbsicht('und morgen?'), 'morgen');
  assert.equal(erkenneAbsicht('zeig mir die woche'), 'woche');
});

test('leere und unverständliche Eingaben führen zur Hilfe', () => {
  assert.equal(erkenneAbsicht(''), 'hilfe');
  assert.equal(erkenneAbsicht('Kaufst du mir ein Eis'), 'unbekannt');
  assert.match(baueAntwort(plan, 'Kaufst du mir ein Eis', MONTAG), /nicht verstanden/);
});

test('/heute listet den ganzen Tag', () => {
  const antwort = baueAntwort(plan, '/heute', MONTAG);
  assert.match(antwort, /Montag, 17\.08\./);
  assert.match(antwort, /Schule/);
  assert.match(antwort, /Sport/);
});

test('/morgen springt auf den Folgetag', () => {
  const antwort = baueAntwort(plan, '/morgen', MONTAG);
  assert.match(antwort, /Dienstag, 18\.08\./);
  assert.match(antwort, /Musikschule/);
  assert.doesNotMatch(antwort, /Schule \(Gymnasium\)/);
});

test('/morgen kommt über einen Monatswechsel', () => {
  const antwort = baueAntwort(plan, '/morgen', new Date('2026-08-31T13:05:00Z'));
  assert.match(antwort, /Dienstag, 01\.09\./);
});

test('/briefing nennt nur, was noch aussteht', () => {
  const antwort = baueAntwort(plan, '/briefing', MONTAG);
  assert.match(antwort, /Hausaufgaben/);
  assert.doesNotMatch(antwort, /Schule/);
});

test('/naechste nennt die kommende Aufgabe', () => {
  assert.match(baueAntwort(plan, '/naechste', MONTAG), /Hausaufgaben/);
});

test('/naechste antwortet auch außerhalb des Vorlauffensters', () => {
  // 13:30 Ortszeit: Hausaufgaben erst in 120 Minuten, also außerhalb der 90.
  const antwort = baueAntwort(plan, '/naechste', new Date('2026-08-17T11:30:00Z'));
  assert.match(antwort, /Hausaufgaben/);
});

test('/naechste am Tagesende', () => {
  assert.match(baueAntwort(plan, '/naechste', new Date('2026-08-17T20:00:00Z')), /nichts mehr an/);
});

test('/woche deckt sieben Tage ab', () => {
  const antwort = baueAntwort(plan, '/woche', MONTAG);
  assert.match(antwort, /Montag, 17\.08\./);
  assert.match(antwort, /Sonntag, 23\.08\./);
  assert.match(antwort, /nichts eingetragen/); // Mittwoch ist leer
});

test('/hilfe listet alle Befehle', () => {
  const antwort = baueAntwort(plan, '/hilfe', MONTAG);
  assert.equal(antwort, HILFE);
  for (const befehl of ['/heute', '/morgen', '/briefing', '/naechste', '/woche']) {
    assert.match(antwort, new RegExp(befehl));
  }
});

test('ein Platzhalter-Plan gibt keine Beispieltermine heraus', () => {
  const beispiel = { ...plan, platzhalter: true };
  for (const eingabe of ['/heute', '/morgen', '/briefing', '/naechste', '/woche']) {
    const antwort = baueAntwort(beispiel, eingabe, MONTAG);
    assert.match(antwort, /Beispieldaten/);
    assert.doesNotMatch(antwort, /Schule|Sport|Musikschule/);
  }
});

test('die Hilfe bleibt auch bei Platzhalter-Plan erreichbar', () => {
  assert.equal(baueAntwort({ ...plan, platzhalter: true }, '/hilfe', MONTAG), HILFE);
});
