#!/usr/bin/env node
/**
 * Importiert einen als HTML vorliegenden Wochenplan nach wochenplan.json.
 *
 *   node importieren.mjs "Wochenplan kompakt.html"            # nur anzeigen
 *   node importieren.mjs "Wochenplan kompakt.html" --schreiben # übernehmen
 *
 * Gedacht für Pläne, die als Tabelle, Liste oder Überschrift-plus-Zeilen
 * aufgebaut sind. Der Importer ist absichtlich tolerant: Er sucht
 * Wochentagsmarken und darunter Uhrzeiten, statt eine bestimmte
 * HTML-Struktur zu erwarten.
 *
 * Nichts wird stillschweigend verschluckt: Zeilen, die er nicht zuordnen
 * kann, listet er als Warnung auf, damit nichts unbemerkt verloren geht.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));

/** Wochentagsmarken → Schlüssel im Plan. Längere Formen zuerst. */
const WOCHENTAGE = [
  [/^(montag|mo\.?|mon)\b/i, 'mo'],
  [/^(dienstag|di\.?|die|tue)\b/i, 'di'],
  [/^(mittwoch|mi\.?|mit|wed)\b/i, 'mi'],
  [/^(donnerstag|do\.?|don|thu)\b/i, 'do'],
  [/^(freitag|fr\.?|fre|fri)\b/i, 'fr'],
  [/^(samstag|sonnabend|sa\.?|sat)\b/i, 'sa'],
  [/^(sonntag|so\.?|son|sun)\b/i, 'so'],
];

const ENTITAETEN = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', shy: '', szlig: 'ß',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü',
  bull: '•', middot: '·', hellip: '…', rsquo: '’', lsquo: '‘',
  bdquo: '„', ldquo: '“', rdquo: '”',
};

function entschluessele(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, zahl) => String.fromCodePoint(Number(zahl)))
    .replace(/&([a-z]+);/gi, (ganz, name) => ENTITAETEN[name] ?? ganz);
}

/**
 * HTML in Textzeilen zerlegen.
 * Blockgrenzen (Zeilen, Zellen, Listenpunkte, Überschriften) werden zu
 * Zeilenumbrüchen, damit Uhrzeit und Titel getrennt erkennbar bleiben.
 */
export function alsZeilen(html) {
  return entschluessele(
    String(html)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(tr|li|p|div|h[1-6]|td|th|dt|dd|section|article)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((zeile) => zeile.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** "8.00" und "08:00" → "08:00". Gibt null zurück, wenn es keine Uhrzeit ist. */
function normUhrzeit(stunde, minute) {
  const h = Number(stunde);
  const m = Number(minute);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const TRENNER = '(?:\\s*(?:–|—|-|‒|bis|to)\\s*)';
const UHR = '(\\d{1,2})[:.](\\d{2})';
const NUR_ZEIT = new RegExp(`^${UHR}(?:${TRENNER}${UHR})?\\s*(?:uhr)?[\\s.:–—-]*$`, 'i');
const ZEIT_MIT_TEXT = new RegExp(`^${UHR}(?:${TRENNER}${UHR})?\\s*(?:uhr)?\\s*[–—:|-]?\\s*(.+)$`, 'i');

/** Eine Zeile auf Uhrzeit(en) und Resttext prüfen. */
function lesZeile(zeile) {
  const nurZeit = NUR_ZEIT.exec(zeile);
  if (nurZeit) {
    const von = normUhrzeit(nurZeit[1], nurZeit[2]);
    if (!von) return null;
    return { von, bis: nurZeit[3] ? normUhrzeit(nurZeit[3], nurZeit[4]) : null, titel: null };
  }

  const mitText = ZEIT_MIT_TEXT.exec(zeile);
  if (mitText) {
    const von = normUhrzeit(mitText[1], mitText[2]);
    if (!von) return null;
    const titel = String(mitText[5] ?? '').replace(/^[\s–—:|-]+/, '').trim();
    return { von, bis: mitText[3] ? normUhrzeit(mitText[3], mitText[4]) : null, titel: titel || null };
  }

  return null;
}

/** Ort aus einem Titel lösen: "Sport (Sporthalle)" oder "Sport, Sporthalle". */
function trenneOrt(titel) {
  const klammer = /^(.*?)\s*[（(]\s*([^)）]+)\s*[)）]\s*$/.exec(titel);
  if (klammer) return { titel: klammer[1].trim(), ort: klammer[2].trim() };
  return { titel: titel.trim(), ort: null };
}

/**
 * Wochenplan aus HTML lesen.
 * Liefert den Plan, alles Erkannte und die Zeilen, die nicht zugeordnet
 * werden konnten.
 */
export function parseWochenplan(html, optionen = {}) {
  const zeilen = alsZeilen(html);
  const tage = { mo: [], di: [], mi: [], do: [], fr: [], sa: [], so: [] };
  const warnungen = [];

  let aktuellerTag = null;
  let offeneZeit = null; // Uhrzeit gefunden, Titel steht in einer Folgezeile

  const merke = (tag, eintrag) => {
    const { titel, ort } = trenneOrt(eintrag.titel);
    const fertig = { von: eintrag.von, ...(eintrag.bis ? { bis: eintrag.bis } : {}), titel };
    if (ort) fertig.ort = ort;
    tage[tag].push(fertig);
  };

  for (const zeile of zeilen) {
    // Wochentagsmarke? Kann alleinstehen ("Montag") oder eine Zeile eröffnen
    // ("Montag 08:00 Schule").
    const treffer = WOCHENTAGE.find(([muster]) => muster.test(zeile));
    let rest = zeile;
    if (treffer) {
      if (offeneZeit) {
        warnungen.push(`Uhrzeit ${offeneZeit.von} ohne Titel (vor "${zeile}")`);
        offeneZeit = null;
      }
      aktuellerTag = treffer[1];
      rest = zeile.replace(treffer[0], '').replace(/^[\s,:.–—-]+/, '').trim();
      if (!rest) continue;
    }

    const zeit = lesZeile(rest);

    if (zeit) {
      if (offeneZeit) {
        warnungen.push(`Uhrzeit ${offeneZeit.von} ohne Titel (vor "${rest}")`);
        offeneZeit = null;
      }
      if (!aktuellerTag) {
        warnungen.push(`Uhrzeit ohne vorangehenden Wochentag: "${rest}"`);
        continue;
      }
      if (zeit.titel) merke(aktuellerTag, zeit);
      else offeneZeit = zeit;
      continue;
    }

    if (offeneZeit && aktuellerTag) {
      // Die Zeile nach einer alleinstehenden Uhrzeit ist deren Titel.
      merke(aktuellerTag, { ...offeneZeit, titel: rest });
      offeneZeit = null;
      continue;
    }

    if (aktuellerTag) warnungen.push(`Nicht zugeordnet: "${rest}"`);
  }

  if (offeneZeit) warnungen.push(`Uhrzeit ${offeneZeit.von} ohne Titel (am Ende)`);

  for (const liste of Object.values(tage)) {
    liste.sort((a, b) => a.von.localeCompare(b.von));
  }

  const anzahl = Object.values(tage).reduce((summe, liste) => summe + liste.length, 0);

  return {
    plan: {
      zeitzone: optionen.zeitzone ?? 'Europe/Berlin',
      briefingZeit: optionen.briefingZeit ?? '15:00',
      vorlaufMinuten: optionen.vorlaufMinuten ?? 90,
      diskretePush: true,
      tage,
      termine: [],
      freieTage: [],
    },
    anzahl,
    warnungen,
  };
}

/* ------------------------------ Kommandozeile ----------------------------- */

const istDirektAufruf = process.argv[1] && process.argv[1].endsWith('importieren.mjs');
if (istDirektAufruf) {
  const argumente = process.argv.slice(2);
  const quelle = argumente.find((a) => !a.startsWith('--'));
  const schreiben = argumente.includes('--schreiben');
  const zielIndex = argumente.indexOf('--ziel');
  const ziel = zielIndex >= 0 ? argumente[zielIndex + 1] : join(HIER, 'wochenplan.json');
  const zoneIndex = argumente.indexOf('--zeitzone');

  if (!quelle) {
    console.error('Aufruf: node importieren.mjs <plan.html> [--schreiben] [--ziel pfad] [--zeitzone Europe/Berlin]');
    process.exit(1);
  }
  if (!existsSync(quelle)) {
    console.error(`Datei nicht gefunden: ${quelle}`);
    process.exit(1);
  }

  const { plan, anzahl, warnungen } = parseWochenplan(readFileSync(quelle, 'utf8'), {
    zeitzone: zoneIndex >= 0 ? argumente[zoneIndex + 1] : undefined,
  });

  const NAMEN = { mo: 'Montag', di: 'Dienstag', mi: 'Mittwoch', do: 'Donnerstag', fr: 'Freitag', sa: 'Samstag', so: 'Sonntag' };
  console.log(`Gelesen: ${quelle}`);
  console.log(`Erkannt: ${anzahl} Einträge\n`);
  for (const [tag, name] of Object.entries(NAMEN)) {
    const eintraege = plan.tage[tag];
    console.log(`${name}:${eintraege.length ? '' : ' (nichts)'}`);
    eintraege.forEach((e) => {
      const spanne = e.bis ? `${e.von}–${e.bis}` : `ab ${e.von}`;
      console.log(`  • ${spanne}  ${e.titel}${e.ort ? ` (${e.ort})` : ''}`);
    });
  }

  if (warnungen.length) {
    console.log(`\n${warnungen.length} Hinweis(e) – bitte prüfen:`);
    warnungen.slice(0, 25).forEach((w) => console.log(`  ! ${w}`));
    if (warnungen.length > 25) console.log(`  … und ${warnungen.length - 25} weitere`);
  }

  if (anzahl === 0) {
    console.error('\nKeine Einträge erkannt. Bitte die Datei prüfen – oder den Plan von Hand eintragen.');
    process.exit(1);
  }

  if (schreiben) {
    // "platzhalter" wird bewusst NICHT gesetzt: Ab jetzt sind es echte Daten.
    writeFileSync(ziel, `${JSON.stringify(plan, null, 2)}\n`);
    console.log(`\nGeschrieben: ${ziel}`);
    console.log('Bitte einmal durchsehen, dann "npm test" und "npm run heute".');
  } else {
    console.log('\nNichts geschrieben. Mit --schreiben übernehmen.');
  }
}
