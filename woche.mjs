#!/usr/bin/env node
/**
 * Welche Stundenplanwoche gilt an einem Datum — A oder B?
 *
 *   node woche.mjs            heute
 *   node woche.mjs 2026-09-28 ein bestimmtes Datum
 *   node woche.mjs --test     Selbstprüfung
 *
 * Anker: die Woche vom 17.08.2026 ist Woche A (wissen/MASTER_Wissensbasis.md).
 * Gezählt wird in ganzen Kalenderwochen ab diesem Montag, der Wechsel findet
 * also immer von Sonntag auf Montag statt.
 */
const ANKER = Date.UTC(2026, 7, 17); // Mo, 17.08.2026 = Woche A
const TAG = 86400000;

/** Montag der Woche, in der das Datum liegt (UTC-Mitternacht). */
function montagVor(datum) {
  const t = Date.UTC(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate());
  const versatz = (new Date(t).getUTCDay() + 6) % 7; // Mo=0 … So=6
  return t - versatz * TAG;
}

/** "A" oder "B" für ein Datum. */
export function woche(datum) {
  const wochen = Math.round((montagVor(datum) - ANKER) / (7 * TAG));
  return ((wochen % 2) + 2) % 2 === 0 ? 'A' : 'B';
}

/** Schulschluss in Ortszeit; unterscheidet sich nur montags. */
export function schulschluss(datum) {
  const tag = (datum.getUTCDay() + 6) % 7;
  if (tag > 4) return null;                      // Wochenende
  if (tag === 2) return '16:50';                 // Mittwoch, inkl. Sport
  if (tag === 0) return woche(datum) === 'A' ? '13:10' : '15:15';
  return '15:15';
}

if (process.argv.includes('--test')) {
  const { strictEqual } = await import('node:assert');
  const w = (s) => woche(new Date(`${s}T12:00:00Z`));
  const s = (d) => schulschluss(new Date(`${d}T12:00:00Z`));
  strictEqual(w('2026-08-17'), 'A', 'Ankerwoche');
  strictEqual(w('2026-08-21'), 'A', 'Freitag der Ankerwoche');
  strictEqual(w('2026-08-23'), 'A', 'Sonntag gehört noch zur Vorwoche');
  strictEqual(w('2026-08-24'), 'B', 'Wechsel am Montag');
  strictEqual(w('2026-08-31'), 'A', 'Screenshot KW 36');
  strictEqual(w('2026-09-28'), 'A', 'Abgabetag der Facharbeit');
  strictEqual(s('2026-08-31'), '13:10', 'kurzer Montag in Woche A');
  strictEqual(s('2026-08-24'), '15:15', 'Montag mit Musik in Woche B');
  strictEqual(s('2026-08-26'), '16:50', 'Mittwoch mit Sport');
  strictEqual(s('2026-08-29'), null, 'Samstag');
  console.log('woche.mjs: alle Prüfungen bestanden');
} else {
  const arg = process.argv[2];
  const d = arg ? new Date(`${arg}T12:00:00Z`) : new Date();
  if (Number.isNaN(d.getTime())) {
    console.error(`Ungültiges Datum: "${arg}" — erwartet wird JJJJ-MM-TT.`);
    process.exit(1);
  }
  const ende = schulschluss(d);
  console.log(`Woche ${woche(d)}${ende ? ` · Schule bis ${ende}` : ' · Wochenende'}`);
}
