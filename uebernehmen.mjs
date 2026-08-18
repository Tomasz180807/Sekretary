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

/** Quelltext einer Funktionsdeklaration aus einer Datei holen. */
export function holeFunktion(quelle, name) {
  return new RegExp(`function\\s+${name}\\s*\\([\\s\\S]*?\\n\\}`).exec(quelle)?.[0] ?? null;
}

/**
 * Die HTML-Datei in ihre auswertbaren Teile zerlegen.
 *
 * Beim Bearbeiten rutscht gelegentlich ein Stück Code hinter </html>. Dort
 * führt es kein Browser mehr aus – die Seite stürzt dann an der Stelle ab,
 * die es gebraucht hätte. Für den Plan gehört es trotzdem dazu, also wird es
 * hier eingesammelt und gemeldet.
 */
export function zerlegeSkript(html) {
  const skript = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!skript) throw new Error('Kein <script>-Block gefunden.');

  const grenze = skript.indexOf('let currentWeek');
  if (grenze < 0) throw new Error('Datenteil nicht erkannt ("let currentWeek" fehlt).');

  const rowsFor = /function rowsFor\([\s\S]*?\n\}/.exec(skript)?.[0];
  if (!rowsFor) throw new Error('Funktion rowsFor nicht gefunden.');

  const ende = html.lastIndexOf('</html>');
  const streu = ende >= 0 ? html.slice(ende + '</html>'.length).trim() : '';

  return { daten: skript.slice(0, grenze), rowsFor, streu };
}

/**
 * Datenteil des eingebetteten Skripts auswerten.
 *
 * "ersatzQuelle" ist der Inhalt einer älteren Fassung: Fehlt in der neuen
 * Datei eine Hilfsfunktion, wird sie von dort übernommen. Übernommen wird
 * nur der Quelltext – die Funktion greift also auf die Daten der NEUEN
 * Datei zu, nicht auf die der alten.
 */
export function leseDaten(html, { ersatzQuelle = '' } = {}) {
  const { daten, rowsFor, streu } = zerlegeSkript(html);
  const reparaturen = [];
  if (streu) {
    reparaturen.push(`${streu.length} Zeichen Code standen hinter </html> – im Browser wirkungslos, hier eingelesen.`);
  }

  let ergaenzt = '';
  let werkzeug;
  let wochen;

  // Fehlt eine Hilfsfunktion, aus der Ersatzquelle nachziehen und erneut
  // versuchen. Der Aufruf von rowsFor gehört mit in den Versuch: Eine
  // fehlende Funktion fällt erst beim Auswerten auf, nicht beim Definieren.
  for (let runde = 0; ; runde += 1) {
    try {
      werkzeug = new Function(
        `${daten}\n${streu}\n${ergaenzt}\n${rowsFor}\nreturn { timetable, days, tags, P, rowsFor };`,
      )();

      wochen = {};
      for (const name of Object.keys(werkzeug.timetable)) {
        wochen[name] = {};
        for (const tag of TAGE) wochen[name][tag] = werkzeug.rowsFor(name, tag);
      }
      break;
    } catch (fehler) {
      const fehlt = /(\w+) is not defined/.exec(fehler.message)?.[1];
      const quelltext = fehlt && ersatzQuelle ? holeFunktion(ersatzQuelle, fehlt) : null;
      if (!quelltext || runde >= 5) {
        throw new Error(fehlt
          ? `"${fehlt}" wird im Plan benutzt, ist aber nirgends definiert. `
            + 'In der HTML-Datei ergänzen – oder mit --ersatz <ältere-Datei> von dort übernehmen.'
          : `Datenteil ließ sich nicht auswerten: ${fehler.message}`);
      }
      ergaenzt += `\n${quelltext}`;
      reparaturen.push(`"${fehlt}" fehlte und wurde aus der Ersatzdatei übernommen.`);
    }
  }

  return { wochen, timetable: werkzeug.timetable, stunden: werkzeug.P, tags: werkzeug.tags, reparaturen };
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

  const ersatzIndex = argumente.indexOf('--ersatz');
  const ersatzQuelle = ersatzIndex >= 0 ? readFileSync(argumente[ersatzIndex + 1], 'utf8') : '';

  let roh;
  try {
    roh = leseDaten(readFileSync(quelle, 'utf8'), { ersatzQuelle });
  } catch (fehler) {
    // Verständliche Meldung statt Stacktrace – der Fehler liegt in aller
    // Regel in der Quelldatei, nicht hier.
    console.error(`Konnte "${quelle}" nicht auswerten:\n  ${fehler.message}`);
    process.exit(1);
  }

  const { wochen, warnungen } = baueWochen(roh);

  if (roh.reparaturen.length) {
    console.log(`${roh.reparaturen.length} Reparatur(en) an der Quelldatei – bitte dort beheben:`);
    roh.reparaturen.forEach((r) => console.log(`  ! ${r}`));
    console.log('');
  }

  const plan = {
    zeitzone: 'Europe/Berlin',
    briefingNach: 'Schule',
    briefingZeit: '10:15',
    vorlaufMinuten: 10,
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
