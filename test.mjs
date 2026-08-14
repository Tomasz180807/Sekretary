/**
 * Tests für die Tagesplan-Logik.
 *
 *   node --test tagesplan/
 *
 * Der Schwerpunkt liegt auf der Zeitzonenrechnung: Der Agent läuft in UTC,
 * der Plan gilt in Europe/Berlin. Sommer- und Winterzeit werden deshalb
 * ausdrücklich geprüft.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  zuMinuten,
  alsUhrzeit,
  alsDauer,
  inZone,
  tagVerschoben,
  eintraegeFuerTag,
  naechsterEintrag,
  laufenderEintrag,
  baueBriefing,
  baueErinnerung,
  agentEntscheidung,
  ladePlan,
  STANDARD_PLAN,
} from './plan.mjs';

const plan = {
  zeitzone: 'Europe/Berlin',
  briefingZeit: '15:00',
  vorlaufMinuten: 90,
  tage: {
    mo: [
      { von: '08:00', bis: '13:15', titel: 'Schule', ort: 'Gymnasium' },
      { von: '15:30', bis: '16:30', titel: 'Hausaufgaben' },
      { von: '18:00', bis: '19:30', titel: 'Sport' },
    ],
    di: [],
    mi: [],
    do: [],
    fr: [],
    sa: [],
    so: [],
  },
  termine: [],
  freieTage: [],
};

test('zuMinuten und alsUhrzeit sind zueinander invers', () => {
  assert.equal(zuMinuten('00:00'), 0);
  assert.equal(zuMinuten('15:30'), 930);
  assert.equal(zuMinuten('23:59'), 1439);
  assert.equal(alsUhrzeit(930), '15:30');
  assert.equal(alsUhrzeit(0), '00:00');
});

test('zuMinuten weist unsinnige Eingaben ab', () => {
  assert.throws(() => zuMinuten('25:00'), /außerhalb/);
  assert.throws(() => zuMinuten('12:60'), /außerhalb/);
  assert.throws(() => zuMinuten('viertel nach drei'), /Ungültige Uhrzeit/);
});

test('alsDauer schreibt Stunden und Minuten aus', () => {
  assert.equal(alsDauer(45), '45 min');
  assert.equal(alsDauer(60), '1 h');
  assert.equal(alsDauer(80), '1 h 20 min');
});

test('inZone rechnet Sommerzeit korrekt um (UTC+2)', () => {
  const zeit = inZone(new Date('2026-08-17T13:05:00Z'), 'Europe/Berlin');
  assert.equal(zeit.iso, '2026-08-17');
  assert.equal(zeit.stunde, 15);
  assert.equal(zeit.wochentag, 'mo');
});

test('inZone rechnet Winterzeit korrekt um (UTC+1)', () => {
  const zeit = inZone(new Date('2026-01-19T14:05:00Z'), 'Europe/Berlin');
  assert.equal(zeit.iso, '2026-01-19');
  assert.equal(zeit.stunde, 15);
  assert.equal(zeit.wochentag, 'mo');
});

test('inZone erkennt den Datumswechsel über Mitternacht', () => {
  const zeit = inZone(new Date('2026-08-17T22:30:00Z'), 'Europe/Berlin');
  assert.equal(zeit.iso, '2026-08-18');
  assert.equal(zeit.wochentag, 'di');
  assert.equal(zeit.stunde, 0);
});

test('tagVerschoben rechnet über Monats- und Jahreswechsel', () => {
  const august = inZone(new Date('2026-08-31T13:05:00Z'), 'Europe/Berlin');
  assert.equal(tagVerschoben(august, 1).iso, '2026-09-01');
  assert.equal(tagVerschoben(august, 1).wochentag, 'di');
  assert.equal(tagVerschoben(august, 0).iso, '2026-08-31');
  assert.equal(tagVerschoben(august, -1).iso, '2026-08-30');

  const silvester = inZone(new Date('2026-12-31T13:05:00Z'), 'Europe/Berlin');
  assert.equal(tagVerschoben(silvester, 1).iso, '2027-01-01');
});

test('tagVerschoben bleibt über die Zeitumstellung stabil', () => {
  // Die Umstellung auf Winterzeit liegt 2026 in der Nacht auf den 25.10.
  const davor = inZone(new Date('2026-10-24T12:00:00Z'), 'Europe/Berlin');
  assert.equal(davor.iso, '2026-10-24');
  assert.equal(tagVerschoben(davor, 1).iso, '2026-10-25');
  assert.equal(tagVerschoben(davor, 2).iso, '2026-10-26');
});

test('eintraegeFuerTag sortiert nach Startzeit', () => {
  const zeit = inZone(new Date('2026-08-17T13:05:00Z'), 'Europe/Berlin');
  const eintraege = eintraegeFuerTag(plan, zeit);
  assert.deepEqual(eintraege.map((e) => e.titel), ['Schule', 'Hausaufgaben', 'Sport']);
});

test('Einzeltermine werden in den Tag einsortiert', () => {
  const mitTermin = {
    ...plan,
    termine: [{ datum: '2026-08-17', von: '17:00', bis: '17:30', titel: 'Zahnarzt' }],
  };
  const zeit = inZone(new Date('2026-08-17T13:05:00Z'), 'Europe/Berlin');
  assert.deepEqual(
    eintraegeFuerTag(mitTermin, zeit).map((e) => e.titel),
    ['Schule', 'Hausaufgaben', 'Zahnarzt', 'Sport'],
  );
});

test('freie Tage unterdrücken den Wochenrhythmus, nicht die Einzeltermine', () => {
  const ferien = {
    ...plan,
    freieTage: ['2026-08-17'],
    termine: [{ datum: '2026-08-17', von: '11:00', titel: 'Schwimmbad' }],
  };
  const zeit = inZone(new Date('2026-08-17T06:00:00Z'), 'Europe/Berlin');
  assert.deepEqual(eintraegeFuerTag(ferien, zeit).map((e) => e.titel), ['Schwimmbad']);
});

test('naechsterEintrag und laufenderEintrag greifen auf denselben Tag zu', () => {
  const zeit = inZone(new Date('2026-08-17T10:00:00Z'), 'Europe/Berlin'); // 12:00 Ortszeit
  const eintraege = eintraegeFuerTag(plan, zeit);
  assert.equal(laufenderEintrag(eintraege, zeit.minutenSeitMitternacht).titel, 'Schule');
  assert.equal(naechsterEintrag(eintraege, zeit.minutenSeitMitternacht).titel, 'Hausaufgaben');
});

test('Briefing listet nur, was noch aussteht', () => {
  const ergebnis = baueBriefing(plan, new Date('2026-08-17T13:05:00Z')); // 15:05 Ortszeit
  assert.match(ergebnis.lang, /Hausaufgaben/);
  assert.match(ergebnis.lang, /Sport/);
  assert.doesNotMatch(ergebnis.lang, /Schule/);
  assert.ok(ergebnis.kurz.length <= 200);
});

test('Briefing meldet auch einen leeren Resttag', () => {
  const ergebnis = baueBriefing(plan, new Date('2026-08-17T20:00:00Z')); // 22:00 Ortszeit
  assert.match(ergebnis.kurz, /nichts mehr an/);
});

test('Erinnerung schweigt außerhalb des Vorlauffensters', () => {
  // 16:35 Ortszeit – Sport beginnt erst in 85 Minuten, also innerhalb von 90.
  assert.ok(baueErinnerung(plan, new Date('2026-08-17T14:35:00Z')));
  // 13:30 Ortszeit – Hausaufgaben erst in 120 Minuten.
  assert.equal(baueErinnerung(plan, new Date('2026-08-17T11:30:00Z')), null);
});

test('die Push-Kurzfassung nennt standardmäßig keinen Ort', () => {
  const mitOrt = {
    ...plan,
    tage: { ...plan.tage, mo: [{ von: '18:00', bis: '19:30', titel: 'Sport', ort: 'Sporthalle Nordstadt' }] },
  };
  const ergebnis = baueErinnerung(mitOrt, new Date('2026-08-17T14:35:00Z')); // 16:35 Ortszeit
  assert.match(ergebnis.kurz, /Sport/);
  assert.doesNotMatch(ergebnis.kurz, /Sporthalle/);
  // Die Langfassung bleibt vollständig – sie erscheint nicht auf dem Sperrbildschirm.
  assert.match(ergebnis.lang, /Sporthalle/);
});

test('diskretePush lässt sich bewusst abschalten', () => {
  const mitOrt = {
    ...plan,
    diskretePush: false,
    tage: { ...plan.tage, mo: [{ von: '18:00', bis: '19:30', titel: 'Sport', ort: 'Sporthalle Nordstadt' }] },
  };
  assert.match(baueErinnerung(mitOrt, new Date('2026-08-17T14:35:00Z')).kurz, /Sporthalle/);
});

test('Erinnerung schweigt an einem leeren Tag', () => {
  assert.equal(baueErinnerung(plan, new Date('2026-08-18T14:00:00Z')), null);
});

test('agentEntscheidung bevorzugt das Briefing in der Briefing-Stunde', () => {
  assert.equal(agentEntscheidung(plan, new Date('2026-08-17T13:05:00Z')).modus, 'briefing');
});

test('agentEntscheidung erinnert außerhalb der Briefing-Stunde', () => {
  assert.equal(agentEntscheidung(plan, new Date('2026-08-17T14:35:00Z')).modus, 'erinnerung');
});

test('agentEntscheidung bleibt ohne Anlass still', () => {
  assert.equal(agentEntscheidung(plan, new Date('2026-08-18T09:00:00Z')).modus, 'still');
});

test('Briefing-Stunde liegt in Sommer- und Winterzeit gleich', () => {
  assert.equal(agentEntscheidung(plan, new Date('2026-08-17T13:05:00Z')).modus, 'briefing'); // CEST
  assert.equal(agentEntscheidung(plan, new Date('2026-01-19T14:05:00Z')).modus, 'briefing'); // CET
});

test('ein als Platzhalter markierter Plan löst keine Meldung aus', () => {
  const beispiel = { ...plan, platzhalter: true };
  // Selbst mitten in der Briefing-Stunde bleibt der Agent stumm.
  const ergebnis = agentEntscheidung(beispiel, new Date('2026-08-17T13:05:00Z'));
  assert.equal(ergebnis.modus, 'platzhalter');
  assert.equal(ergebnis.kurz, '');
});

test('der mitgelieferte Wochenplan ist gültig', () => {
  const echt = ladePlan(STANDARD_PLAN);
  assert.equal(echt.zeitzone, 'Europe/Berlin');
  assert.ok(echt.tage);
});

test('ladePlan meldet fehlerhafte Pläne verständlich', async () => {
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const ordner = mkdtempSync(join(tmpdir(), 'tagesplan-'));

  const kaputt = join(ordner, 'kaputt.json');
  writeFileSync(kaputt, '{ "zeitzone": "Europe/Berlin", "tage": { "xx": [] } }');
  assert.throws(() => ladePlan(kaputt), /Unbekannter Wochentag/);

  const ohneTitel = join(ordner, 'ohne-titel.json');
  writeFileSync(ohneTitel, '{ "zeitzone": "Europe/Berlin", "tage": { "mo": [{ "von": "08:00" }] } }');
  assert.throws(() => ladePlan(ohneTitel), /titel/);

  const falscheZone = join(ordner, 'zone.json');
  writeFileSync(falscheZone, '{ "zeitzone": "Mitteleuropa" }');
  assert.throws(() => ladePlan(falscheZone), /Unbekannte Zeitzone/);
});
