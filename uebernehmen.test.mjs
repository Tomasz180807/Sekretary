/**
 * Tests für die Übernahme aus "Wochenplan kompakt".
 *
 *   node --test uebernehmen.test.mjs
 *
 * Schwerpunkt sind die beiden Fehler, die beim Bearbeiten der HTML-Datei
 * wiederholt auftreten: Code rutscht hinter </html>, oder eine Hilfsfunktion
 * fehlt ganz. Beides muss auffallen und gemeldet werden, statt still einen
 * halben Plan zu erzeugen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { leseDaten, zerlegeSkript, holeFunktion, baueWochen, zerlegeZeitspanne } from './uebernehmen.mjs';

/** Kleinstmögliche Datei im Format der echten Pläne. */
function baueDatei({ streu = '', mitSlp = true } = {}) {
  const slp = mitSlp ? 'function slp(t){ return NOTIZ[t]; }' : '';
  return `<!DOCTYPE html><html><body><div id="week"></div>
<script>
const P = ["8:00–9:30"];
const timetable = { A:{ mo:["Mathe"] }, B:{ mo:["Physik"] } };
const days = [{key:"mo"}];
const tags = { A:{mo:"x"}, B:{mo:"y"} };
${slp}
function trainingSchoolDay(wk){
  return [
    {t:"08:00–15:15", b:"Schule", c:"Unterricht"},
    {t:"17:00–20:00", b:"Training", c:slp("mo") + " · " + wk},
  ];
}
let currentWeek = "A";
const weekEl = document.getElementById("week");
function rowsFor(wk, dayKey){
  return trainingSchoolDay(wk);
}
</script>
</body></html>${streu}`;
}

const NOTIZ = 'const NOTIZ = { mo:"CS50P" };';

test('zerlegeZeitspanne liest Zeitspannen und Einzelzeiten', () => {
  assert.deepEqual(zerlegeZeitspanne('07:00–07:30'), { von: '07:00', bis: '07:30' });
  assert.deepEqual(zerlegeZeitspanne('8:00–9:30'), { von: '08:00', bis: '09:30' });
  assert.deepEqual(zerlegeZeitspanne('22:40'), { von: '22:40', bis: null });
  assert.deepEqual(zerlegeZeitspanne('99:99'), { von: null, bis: null });
});

test('zerlegeSkript trennt Datenteil, rowsFor und Streucode', () => {
  const { daten, rowsFor, streu } = zerlegeSkript(baueDatei({ streu: NOTIZ }));
  assert.match(daten, /const timetable/);
  assert.doesNotMatch(daten, /getElementById/, 'der DOM-Teil darf nicht mitkommen');
  assert.match(rowsFor, /^function rowsFor/);
  assert.equal(streu, NOTIZ);
});

test('Code hinter </html> wird eingelesen und gemeldet', () => {
  const roh = leseDaten(baueDatei({ streu: NOTIZ }));
  const { wochen } = baueWochen(roh);
  assert.equal(wochen.A.mo.length, 2);
  assert.match(wochen.A.mo[1].hinweis, /CS50P/, 'der Streucode muss wirken');
  assert.equal(roh.reparaturen.length, 1);
  assert.match(roh.reparaturen[0], /hinter <\/html>/);
});

test('ohne Streucode gibt es nichts zu reparieren', () => {
  const datei = baueDatei().replace('function slp(t){ return NOTIZ[t]; }', 'function slp(){ return "x"; }');
  assert.deepEqual(leseDaten(datei).reparaturen, []);
});

test('eine fehlende Hilfsfunktion bricht mit klarer Meldung ab', () => {
  assert.throws(
    () => leseDaten(baueDatei({ streu: NOTIZ, mitSlp: false })),
    /"slp" wird im Plan benutzt, ist aber nirgends definiert/,
  );
});

test('mit Ersatzquelle wird die fehlende Funktion nachgezogen', () => {
  const { wochen, reparaturen } = leseDaten(
    baueDatei({ streu: NOTIZ, mitSlp: false }),
    { ersatzQuelle: baueDatei({ streu: NOTIZ }) },
  );
  assert.equal(wochen.A.mo.length, 2);
  assert.equal(reparaturen.filter((r) => /"slp" fehlte/.test(r)).length, 1);
});

test('die nachgezogene Funktion greift auf die Daten der NEUEN Datei zu', () => {
  // Die neue Datei bringt eine andere Notiz mit als die Ersatzdatei.
  const neu = baueDatei({ streu: 'const NOTIZ = { mo:"NEUER KURS" };', mitSlp: false });
  const alt = baueDatei({ streu: 'const NOTIZ = { mo:"ALTER KURS" };' });
  const { wochen } = baueWochen(leseDaten(neu, { ersatzQuelle: alt }));
  assert.match(wochen.A.mo[1].hinweis, /NEUER KURS/);
  assert.doesNotMatch(wochen.A.mo[1].hinweis, /ALTER KURS/);
});

test('holeFunktion schneidet genau eine Deklaration heraus', () => {
  const quelle = 'function a(){\n  return 1;\n}\nfunction b(){\n  return 2;\n}';
  assert.equal(holeFunktion(quelle, 'a'), 'function a(){\n  return 1;\n}');
  assert.equal(holeFunktion(quelle, 'b'), 'function b(){\n  return 2;\n}');
  assert.equal(holeFunktion(quelle, 'c'), null);
});

test('fehlt der <script>-Block, wird das gesagt', () => {
  assert.throws(() => leseDaten('<html><body>nichts</body></html>'), /Kein <script>-Block/);
});

test('baueWochen übersetzt Rohzeilen und meldet unlesbare Zeiten', () => {
  const { wochen, warnungen } = baueWochen({
    wochen: { A: { mo: [
      { t: '08:00–09:00', b: 'Schule', c: 'Unterricht' },
      { t: 'irgendwann', b: 'Kaputt', c: '' },
    ] } },
  });
  assert.deepEqual(wochen.A.mo, [{ von: '08:00', bis: '09:00', titel: 'Schule', hinweis: 'Unterricht' }]);
  assert.equal(warnungen.length, 1);
  assert.match(warnungen[0], /nicht lesbar/);
});

test('der echte Wochenplan im Repo ist ein gültiger Plan', async () => {
  const { ladePlan, STANDARD_PLAN } = await import('./plan.mjs');
  const plan = ladePlan(STANDARD_PLAN);
  assert.ok(plan.wochen.A && plan.wochen.B);
  assert.equal(plan.wochenwechsel.ankerWoche, 'B');

  // Kein Block darf in den vorigen hineinragen – sonst lägen im Kalender
  // zwei Termine übereinander und die Erinnerungen kämen doppelt.
  const min = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  for (const woche of Object.values(plan.wochen)) {
    for (const [tag, eintraege] of Object.entries(woche)) {
      for (let i = 1; i < eintraege.length; i += 1) {
        const vorher = eintraege[i - 1];
        if (vorher.bis) {
          assert.ok(min(eintraege[i].von) >= min(vorher.bis), `Überlappung an ${tag}: ${vorher.titel} / ${eintraege[i].titel}`);
        }
      }
    }
  }
});
