#!/usr/bin/env node
/**
 * Übernimmt "Wochenplan kompakt" (die HTML-Datei mit den JS-Datenstrukturen)
 * nach wochenplan.json.
 *
 *   node uebernehmen.mjs wochenplan_kompakt.html              # nur anzeigen
 *   node uebernehmen.mjs wochenplan_kompakt.html --schreiben   # übernehmen
 *
 * Anders als importieren.mjs liest dieses Skript kein HTML-Markup: In der
 * Datei steht im <body> praktisch nichts, der Plan lebt in den JS-Objekten
 * (rowsFor, timetable, tags) und wird erst im Browser gerendert. Deshalb
 * werden hier die Datenfunktionen ausgewertet – das liefert exakt die Zeilen,
 * die auch die Seite anzeigt, statt einer HTML-Vermutung.
 *
 * Ausgewertet wird nur der Datenteil des Skripts (bis "let currentWeek");
 * der DOM-Teil wird nicht ausgeführt.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const TAGE = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];

/** "07:00–07:30" bzw. "8:00–9:30" → { von, bis }. */
export function zerlegeZeitspanne(spanne) {
  const teile = String(spanne).split(/\s*[–—-]\s*/);
  const norm = (roh) => {
    const treffer = /^(\d{1,2})[:.](\d{2})$/.exec(String(roh).trim());
    if (!treffer) return null;
    const stunde = Number(treffer[1]);
    const minute = Number(treffer[2]);
    if (stunde > 23 || minute > 59) return null;
    return `${String(stunde).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  return { von: norm(teile[0]), bis: teile[1] ? norm(teile[1]) : null };
}

/** Datenteil des eingebetteten Skripts auswerten. */
export function leseDaten(html) {
  const skript = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!skript) throw new Error('Kein <script>-Block gefunden.');

  const grenze = skript.indexOf('let currentWeek');
  if (grenze < 0) throw new Error('Datenteil nicht erkannt ("let currentWeek" fehlt).');

  const rowsFor = /function rowsFor\([\s\S]*?\n\}/.exec(skript)?.[0];
  if (!rowsFor) throw new Error('Funktion rowsFor nicht gefunden.');

  // Nur der Datenteil wird ausgeführt – die Funktionen darin fassen kein
  // document an. Der DOM-Teil ab "let currentWeek" bleibt außen vor.
  const werkzeug = new Function(
    `${skript.slice(0, grenze)}\n${rowsFor}\nreturn { timetable, days, tags, P, rowsFor };`,
  )();

  const wochen = {};
  for (const name of Object.keys(werkzeug.timetable)) {
    wochen[name] = {};
    for (const tag of TAGE) wochen[name][tag] = werkzeug.rowsFor(name, tag);
  }
  return { wochen, timetable: werkzeug.timetable, stunden: werkzeug.P, tags: werkzeug.tags };
}

/** Rohzeilen ({t,b,c}) in Planeinträge übersetzen. */
export function baueWochen(roh) {
  const wochen = {};
  const warnungen = [];

  for (const [name, tage] of Object.entries(roh.wochen)) {
    wochen[name] = {};
    for (const [tag, zeilen] of Object.entries(tage)) {
      wochen[name][tag] = zeilen.flatMap((zeile) => {
        const { von, bis } = zerlegeZeitspanne(zeile.t);
        if (!von) {
          warnungen.push(`${name}/${tag}: Zeit "${zeile.t}" nicht lesbar (${zeile.b})`);
          return [];
        }
        const eintrag = { von, ...(bis ? { bis } : {}), titel: String(zeile.b).trim() };
        const hinweis = String(zeile.c ?? '').trim();
        if (hinweis) eintrag.hinweis = hinweis;
        return [eintrag];
      });
    }
  }
  return { wochen, warnungen };
}

/* ------------------------------ Kommandozeile ----------------------------- */

if (process.argv[1]?.endsWith('uebernehmen.mjs')) {
  const argumente = process.argv.slice(2);
  const quelle = argumente.find((a) => !a.startsWith('--'));
  const schreiben = argumente.includes('--schreiben');
  const zielIndex = argumente.indexOf('--ziel');
  const ziel = zielIndex >= 0 ? argumente[zielIndex + 1] : join(HIER, 'wochenplan.json');
  const ankerIndex = argumente.indexOf('--anker');
  const wocheIndex = argumente.indexOf('--ankerwoche');

  if (!quelle || !existsSync(quelle)) {
    console.error('Aufruf: node uebernehmen.mjs <wochenplan_kompakt.html> [--schreiben] [--anker JJJJ-MM-TT] [--ankerwoche A|B]');
    process.exit(1);
  }

  const roh = leseDaten(readFileSync(quelle, 'utf8'));
  const { wochen, warnungen } = baueWochen(roh);

  const plan = {
    zeitzone: 'Europe/Berlin',
    briefingNach: 'Schule',
    briefingZeit: '10:15',
    vorlaufMinuten: 20,
    diskretePush: true,
    wochenwechsel: {
      ankerDatum: ankerIndex >= 0 ? argumente[ankerIndex + 1] : '2026-08-17',
      ankerWoche: wocheIndex >= 0 ? argumente[wocheIndex + 1] : 'A',
    },
    wochen,
    termine: [],
    freieTage: [],
  };

  const NAMEN = { mo: 'Mo', di: 'Di', mi: 'Mi', do: 'Do', fr: 'Fr', sa: 'Sa', so: 'So' };
  let gesamt = 0;
  for (const [name, tage] of Object.entries(wochen)) {
    const zeilen = TAGE.map((t) => `${NAMEN[t]} ${String(tage[t].length).padStart(2)}`).join(' · ');
    const summe = TAGE.reduce((s, t) => s + tage[t].length, 0);
    gesamt += summe;
    console.log(`Woche ${name}: ${zeilen}   (${summe} Blöcke)`);
  }
  console.log(`\nGesamt: ${gesamt} Blöcke`);
  console.log(`Wochenwechsel: ${plan.wochenwechsel.ankerDatum} ist Woche ${plan.wochenwechsel.ankerWoche}`);

  if (warnungen.length) {
    console.log(`\n${warnungen.length} Hinweis(e):`);
    warnungen.forEach((w) => console.log(`  ! ${w}`));
  }

  if (schreiben) {
    writeFileSync(ziel, `${JSON.stringify(plan, null, 2)}\n`);
    console.log(`\nGeschrieben: ${ziel}`);
  } else {
    console.log('\nNichts geschrieben. Mit --schreiben übernehmen.');
  }
}
