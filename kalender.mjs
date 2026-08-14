#!/usr/bin/env node
/**
 * Erzeugt aus dem Wochenplan eine .ics-Datei für den Handykalender.
 *
 *   node kalender.mjs                      # schreibt wochenplan.ics
 *   node kalender.mjs --vorlauf 5          # Erinnerung 5 min vorher
 *   node kalender.mjs --ab 2026-09-01      # ab einem bestimmten Datum
 *
 * Warum das trotz Telegram-Bot sinnvoll ist: Der Kalender braucht keinen
 * laufenden Rechner. Die Erinnerung kommt vom Handy selbst – auch offline,
 * auch wenn der Bot gerade nicht läuft.
 *
 * Jeder Block wird als wiederkehrender Termin geschrieben:
 *  - ein Wochenrhythmus  → FREQ=WEEKLY
 *  - zwei Wochen A/B     → FREQ=WEEKLY;INTERVAL=2, verankert auf dem ersten
 *                          passenden Tag der jeweiligen Wochenvariante
 * Dadurch gilt die Datei dauerhaft und muss nicht nachgeneriert werden.
 *
 * Zeiten stehen mit TZID=Europe/Berlin drin, samt VTIMEZONE-Regeln. Der
 * Kalender rechnet die Sommer-/Winterzeit damit selbst – die Termine
 * verschieben sich bei der Umstellung nicht.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { ladePlan, bestimmeWoche, inZone, zuMinuten, STANDARD_PLAN, TAG_NAMEN } from './plan.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const TAGE = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];

/** Sonderzeichen nach RFC 5545 maskieren. */
export function maskiere(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Zeilen auf 75 Oktette falten (RFC 5545).
 * Gezählt wird in Bytes, umgebrochen aber nur zwischen Zeichen – sonst
 * zerreißt es Umlaute.
 */
export function falte(zeile) {
  const teile = [];
  let aktuell = '';
  let bytes = 0;

  for (const zeichen of zeile) {
    const laenge = Buffer.byteLength(zeichen, 'utf8');
    const grenze = teile.length === 0 ? 75 : 74; // Folgezeilen beginnen mit Leerzeichen
    if (bytes + laenge > grenze) {
      teile.push(aktuell);
      aktuell = '';
      bytes = 0;
    }
    aktuell += zeichen;
    bytes += laenge;
  }
  teile.push(aktuell);
  return teile.join('\r\n ');
}

const zweistellig = (zahl) => String(zahl).padStart(2, '0');

/** Date (UTC-Kalenderfelder) + Minuten → "20260817T170000". */
function alsStempel(datum, minuten) {
  const tag = `${datum.getUTCFullYear()}${zweistellig(datum.getUTCMonth() + 1)}${zweistellig(datum.getUTCDate())}`;
  const uhr = `${zweistellig(Math.floor(minuten / 60))}${zweistellig(minuten % 60)}00`;
  return `${tag}T${uhr}`;
}

/** Kalenderfelder eines Datums so aufbereiten, wie plan.mjs sie erwartet. */
function alsZeitobjekt(datum) {
  return {
    jahr: datum.getUTCFullYear(),
    monat: datum.getUTCMonth() + 1,
    tag: datum.getUTCDate(),
    iso: `${datum.getUTCFullYear()}-${zweistellig(datum.getUTCMonth() + 1)}-${zweistellig(datum.getUTCDate())}`,
    wochentag: TAGE[(datum.getUTCDay() + 6) % 7],
  };
}

/**
 * Erster Tag ab "start", der auf den gewünschten Wochentag fällt – und, bei
 * zwei Wochenvarianten, auch in die richtige Woche.
 */
export function ersterTermin(plan, start, wochentag, wochenName) {
  const datum = new Date(start);
  for (let versuch = 0; versuch < 21; versuch += 1) {
    const zeit = alsZeitobjekt(datum);
    if (zeit.wochentag === wochentag && (!wochenName || bestimmeWoche(plan, zeit) === wochenName)) {
      return datum;
    }
    datum.setUTCDate(datum.getUTCDate() + 1);
  }
  return null;
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** Kompletten Kalender als .ics-Text erzeugen. */
export function baueKalender(plan, optionen = {}) {
  const vorlauf = optionen.vorlaufMinuten ?? plan.vorlaufMinuten ?? 10;
  const ab = optionen.ab ? new Date(`${optionen.ab}T00:00:00Z`) : new Date(`${inZone(new Date(), plan.zeitzone).iso}T00:00:00Z`);
  const stempel = `${alsStempel(new Date(), 0).slice(0, 8)}T000000Z`;

  const zone = plan.zeitzone === 'Europe/Berlin' ? 'Europe/Berlin' : null;
  const quellen = plan.wochen
    ? Object.entries(plan.wochen)
    : [[null, plan.tage ?? {}]];

  const zeilen = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sekretary//Tagesplan//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${maskiere(optionen.name ?? 'Wochenplan')}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    ...(zone ? VTIMEZONE : []),
  ];

  let anzahl = 0;
  const uebersprungen = [];

  for (const [wochenName, tage] of quellen) {
    for (const wochentag of TAGE) {
      const eintraege = tage?.[wochentag] ?? [];
      const start = ersterTermin(plan, ab, wochentag, wochenName);
      if (!start) {
        if (eintraege.length) uebersprungen.push(`${wochenName ?? '-'}/${wochentag}: kein Starttermin gefunden`);
        continue;
      }

      eintraege.forEach((eintrag, index) => {
        const vonMin = zuMinuten(eintrag.von);
        const bisMin = eintrag.bis != null ? zuMinuten(eintrag.bis) : Math.min(vonMin + 30, 1439);
        if (bisMin <= vonMin) {
          uebersprungen.push(`${wochenName ?? '-'}/${wochentag} ${eintrag.von}: Ende nicht nach Beginn`);
          return;
        }

        const marke = zone ? `;TZID=${zone}` : '';
        zeilen.push(
          'BEGIN:VEVENT',
          `UID:${wochenName ?? 'w'}-${wochentag}-${eintrag.von.replace(':', '')}-${index}@sekretary`,
          `DTSTAMP:${stempel}`,
          `DTSTART${marke}:${alsStempel(start, vonMin)}`,
          `DTEND${marke}:${alsStempel(start, bisMin)}`,
          wochenName ? 'RRULE:FREQ=WEEKLY;INTERVAL=2' : 'RRULE:FREQ=WEEKLY',
          `SUMMARY:${maskiere(eintrag.titel)}`,
        );
        if (eintrag.ort) zeilen.push(`LOCATION:${maskiere(eintrag.ort)}`);
        if (eintrag.hinweis) zeilen.push(`DESCRIPTION:${maskiere(eintrag.hinweis)}`);
        zeilen.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${maskiere(`In ${vorlauf} Minuten: ${eintrag.titel}`)}`,
          `TRIGGER:-PT${vorlauf}M`,
          'END:VALARM',
          'END:VEVENT',
        );
        anzahl += 1;
      });
    }
  }

  zeilen.push('END:VCALENDAR');
  return { ics: `${zeilen.map(falte).join('\r\n')}\r\n`, anzahl, uebersprungen };
}

/* ------------------------------ Kommandozeile ----------------------------- */

if (process.argv[1]?.endsWith('kalender.mjs')) {
  const argumente = process.argv.slice(2);
  const wert = (name) => {
    const i = argumente.indexOf(`--${name}`);
    return i >= 0 ? argumente[i + 1] : undefined;
  };

  try {
    const plan = ladePlan(wert('plan') ?? STANDARD_PLAN);
    const { ics, anzahl, uebersprungen } = baueKalender(plan, {
      vorlaufMinuten: wert('vorlauf') ? Number(wert('vorlauf')) : undefined,
      ab: wert('ab'),
      name: wert('name'),
    });

    const ziel = wert('ziel') ?? join(HIER, 'wochenplan.ics');
    writeFileSync(ziel, ics, 'utf8');

    const vorlauf = wert('vorlauf') ?? plan.vorlaufMinuten ?? 10;
    console.log(`Geschrieben: ${ziel}`);
    console.log(`${anzahl} wiederkehrende Termine, Erinnerung jeweils ${vorlauf} Minuten vorher.`);
    if (plan.wochen) {
      console.log(`Wochenwechsel: ${Object.keys(plan.wochen).join('/')} im Zweiwochentakt (FREQ=WEEKLY;INTERVAL=2).`);
    }
    if (uebersprungen.length) {
      console.log(`\n${uebersprungen.length} übersprungen:`);
      uebersprungen.forEach((u) => console.log(`  ! ${u}`));
    }
  } catch (fehler) {
    console.error(`Kalender-Fehler: ${fehler.message}`);
    process.exit(1);
  }
}
