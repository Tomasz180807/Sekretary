#!/usr/bin/env node
/**
 * Konnektor zum Gemini Notebook (NotebookLM).
 *
 *   node notebook.mjs              Export nach stdout
 *   node notebook.mjs --schreiben  Export nach notebook/wissensstand.md
 *   node notebook.mjs --test       Selbstprüfung
 *
 * Gemini Notebook hat für private Google-Konten kein API — eines gibt es nur
 * für die Enterprise-Variante in der Google Cloud. Der Konnektor läuft deshalb
 * über eine Quelle, die das Notebook von sich aus lesen kann: eine Datei im
 * öffentlichen Repo. Sie bündelt alles aus `wissen/` in ein Dokument, das im
 * Notebook einmal als Website-Quelle eingetragen und danach mit einem Klick
 * nachgeladen wird. Der Ablauf steht in `.claude/skills/notebook/SKILL.md`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { woche, tagInZone } from './woche.mjs';

const WURZEL = dirname(fileURLToPath(import.meta.url));
const TAG = 86400000;
const ABGABE = Date.UTC(2026, 8, 28); // Facharbeit, 28.09.2026

/** Was ins Notebook gehört — die Reihenfolge ist die Lesereihenfolge. */
export const QUELLEN = [
  'wissen/MASTER_Wissensbasis.md',
  'wissen/sekretary-regeln.md',
  'wissen/stundenplan.md',
  'wissen/facharbeit.md',
];

export const ZIEL = 'notebook/wissensstand.md';

const zweistellig = (n) => String(n).padStart(2, '0');
const datum = (d) => `${zweistellig(d.getUTCDate())}.${zweistellig(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
const mitternacht = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/**
 * Überschriften eine Ebene tiefer setzen, damit die Dateien unter je einer
 * Abschnittsüberschrift stehen und das Notebook eine Gliederung sieht. Was in
 * einem Codeblock steht, bleibt unangetastet — `#` ist dort ein Kommentar,
 * keine Überschrift.
 */
export function tiefer(text) {
  let imCode = false;
  return text.split('\n').map((zeile) => {
    if (/^\s*(```|~~~)/.test(zeile)) {
      imCode = !imCode;
      return zeile;
    }
    return !imCode && zeile.startsWith('#') ? `#${zeile}` : zeile;
  }).join('\n');
}

/** Das fertige Exportdokument aus [{ pfad, inhalt }]. */
export function bündel(dateien, heute = tagInZone()) {
  const tage = Math.round((ABGABE - mitternacht(heute)) / TAG);
  const frist = tage > 0 ? `noch ${tage} Tag${tage === 1 ? '' : 'e'}`
    : tage === 0 ? 'heute'
    : `seit ${-tage} Tagen vorbei`;

  const kopf = [
    '# Sekretary — Wissensstand',
    '',
    'Erzeugt von `notebook.mjs` aus dem Repo Tomasz180807/Sekretary. Hier nichts',
    'ändern — die Wahrheit steht in den Dateien unter `wissen/`.',
    '',
    `- Stand: ${datum(heute)} · Woche ${woche(heute)}`,
    `- Facharbeit-Abgabe: 28.09.2026 · ${frist}`,
    `- Enthalten: ${dateien.map((d) => d.pfad).join(' · ')}`,
    '',
  ].join('\n');

  const teile = dateien.map(({ pfad, inhalt }) => `---\n\n## ${pfad}\n\n${tiefer(inhalt.trim())}\n`);
  return [kopf, ...teile].join('\n');
}

const alsSkript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (alsSkript && process.argv.includes('--test')) {
  const { strictEqual, ok } = await import('node:assert');
  const heute = new Date('2026-08-29T12:00:00Z');

  strictEqual(tiefer('# A\n## B'), '## A\n### B', 'Überschriften rutschen eine Ebene tiefer');
  strictEqual(tiefer('```\n# kein Titel\n```'), '```\n# kein Titel\n```', 'Codeblöcke bleiben');
  strictEqual(tiefer('Text ohne Raute'), 'Text ohne Raute', 'normaler Text bleibt');

  const probe = bündel([{ pfad: 'wissen/x.md', inhalt: '# Titel\n\nInhalt' }], heute);
  ok(probe.includes('- Stand: 29.08.2026 · Woche B'), 'Kopf nennt Datum und Woche');
  ok(probe.includes('- Facharbeit-Abgabe: 28.09.2026 · noch 30 Tage'), 'Kopf zählt bis zur Abgabe');
  ok(probe.includes('## wissen/x.md'), 'jede Datei bekommt eine Abschnittsüberschrift');
  ok(probe.includes('## Titel'), 'der Titel der Datei steht darunter');
  strictEqual(probe.split('\n').filter((z) => z.startsWith('# ')).length, 1, 'genau eine H1 im Export');

  ok(bündel([], new Date('2026-09-28T12:00:00Z')).includes('28.09.2026 · heute'), 'Abgabetag');
  ok(bündel([], new Date('2026-09-30T12:00:00Z')).includes('seit 2 Tagen vorbei'), 'nach der Abgabe');

  for (const pfad of QUELLEN) readFileSync(resolve(WURZEL, pfad), 'utf8');
  console.log('notebook.mjs: alle Prüfungen bestanden');
} else if (alsSkript) {
  const dateien = QUELLEN.map((pfad) => ({ pfad, inhalt: readFileSync(resolve(WURZEL, pfad), 'utf8') }));
  const text = bündel(dateien);
  if (process.argv.includes('--schreiben')) {
    const ziel = resolve(WURZEL, ZIEL);
    mkdirSync(dirname(ziel), { recursive: true });
    writeFileSync(ziel, text);
    console.log(`${ZIEL}: ${dateien.length} Dateien, ${text.split('\n').length} Zeilen geschrieben.`);
  } else {
    process.stdout.write(text);
  }
}
