/**
 * Kernlogik für den Tagesplan-Agenten.
 *
 * Liest den Wochenplan (tagesplan/wochenplan.json) und beantwortet zwei Fragen:
 *  - Was steht heute noch an?      → baueBriefing()
 *  - Was kommt als Nächstes?       → baueErinnerung()
 *
 * Alle Zeitrechnungen laufen in der im Plan hinterlegten Zeitzone
 * (Standard: Europe/Berlin). Der Agent selbst läuft in UTC – deshalb wird
 * die lokale Zeit konsequent über Intl aufgelöst und nie aus der Systemzeit
 * abgeleitet. Dadurch bleibt das Verhalten über die Sommer-/Winterzeit-
 * Umstellung hinweg korrekt.
 *
 * Ohne externe Abhängigkeiten (Node-Standardbibliothek).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));

/** Standardpfad des Wochenplans. */
export const STANDARD_PLAN = join(HIER, 'wochenplan.json');

/** Wochentagsschlüssel, indiziert nach Date#getUTCDay() (0 = Sonntag). */
const TAG_SCHLUESSEL = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];

/** Ausgeschriebene Wochentage für die Textausgabe. */
export const TAG_NAMEN = {
  mo: 'Montag',
  di: 'Dienstag',
  mi: 'Mittwoch',
  do: 'Donnerstag',
  fr: 'Freitag',
  sa: 'Samstag',
  so: 'Sonntag',
};

/** "HH:MM" → Minuten seit Mitternacht. */
export function zuMinuten(uhrzeit) {
  const treffer = /^(\d{1,2}):(\d{2})$/.exec(String(uhrzeit).trim());
  if (!treffer) throw new Error(`Ungültige Uhrzeit "${uhrzeit}" – erwartet wird HH:MM.`);
  const stunde = Number(treffer[1]);
  const minute = Number(treffer[2]);
  if (stunde > 23 || minute > 59) throw new Error(`Uhrzeit "${uhrzeit}" liegt außerhalb des gültigen Bereichs.`);
  return stunde * 60 + minute;
}

/** Minuten seit Mitternacht → "HH:MM". */
export function alsUhrzeit(minuten) {
  const m = ((minuten % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Minutenzahl als "1 h 20 min" / "45 min" ausschreiben. */
export function alsDauer(minuten) {
  const gerundet = Math.max(0, Math.round(minuten));
  const stunden = Math.floor(gerundet / 60);
  const rest = gerundet % 60;
  if (stunden === 0) return `${rest} min`;
  if (rest === 0) return `${stunden} h`;
  return `${stunden} h ${rest} min`;
}

/**
 * Zerlegt einen Zeitpunkt in die Kalenderfelder der Zielzeitzone.
 * Der Wochentag wird aus dem lokalen Kalenderdatum berechnet und nicht aus
 * der Locale gelesen – das ist unabhängig von der ICU-Sprachdatenlage.
 */
export function inZone(zeitpunkt, zone) {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(zeitpunkt)
    .filter((teil) => teil.type !== 'literal');
  const feld = Object.fromEntries(teile.map((teil) => [teil.type, teil.value]));

  const jahr = Number(feld.year);
  const monat = Number(feld.month);
  const tag = Number(feld.day);
  const stunde = Number(feld.hour) % 24;
  const minute = Number(feld.minute);

  return {
    iso: `${feld.year}-${feld.month}-${feld.day}`,
    jahr,
    monat,
    tag,
    stunde,
    minute,
    minutenSeitMitternacht: stunde * 60 + minute,
    wochentag: TAG_SCHLUESSEL[new Date(Date.UTC(jahr, monat - 1, tag)).getUTCDay()],
  };
}

/**
 * Denselben Zeitpunkt um n Kalendertage verschieben.
 * Reine Kalenderrechnung auf dem bereits lokal aufgelösten Datum – dadurch
 * entstehen an Zeitumstellungstagen keine Sprünge. Die Uhrzeit wird auf
 * Mitternacht gesetzt, weil die Funktion nur zum Nachschlagen ganzer Tage dient.
 */
export function tagVerschoben(zeit, tage) {
  const datum = new Date(Date.UTC(zeit.jahr, zeit.monat - 1, zeit.tag));
  datum.setUTCDate(datum.getUTCDate() + tage);

  const jahr = datum.getUTCFullYear();
  const monat = datum.getUTCMonth() + 1;
  const tag = datum.getUTCDate();

  return {
    iso: `${jahr}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`,
    jahr,
    monat,
    tag,
    stunde: 0,
    minute: 0,
    minutenSeitMitternacht: 0,
    wochentag: TAG_SCHLUESSEL[datum.getUTCDay()],
  };
}

/** Datum "2026-08-13" als "Donnerstag, 13.08." ausschreiben. */
export function alsDatum(zeit) {
  return `${TAG_NAMEN[zeit.wochentag]}, ${String(zeit.tag).padStart(2, '0')}.${String(zeit.monat).padStart(2, '0')}.`;
}

/** Wochenplan laden und auf grobe Strukturfehler prüfen. */
export function ladePlan(pfad = STANDARD_PLAN) {
  let roh;
  try {
    roh = readFileSync(pfad, 'utf8');
  } catch (fehler) {
    throw new Error(`Wochenplan "${pfad}" konnte nicht gelesen werden: ${fehler.message}`);
  }

  let plan;
  try {
    plan = JSON.parse(roh);
  } catch (fehler) {
    throw new Error(`Wochenplan "${pfad}" ist kein gültiges JSON: ${fehler.message}`);
  }

  if (!plan || typeof plan !== 'object') throw new Error('Wochenplan muss ein JSON-Objekt sein.');
  if (!plan.zeitzone) throw new Error('Im Wochenplan fehlt das Feld "zeitzone" (z. B. "Europe/Berlin").');
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: plan.zeitzone });
  } catch {
    throw new Error(`Unbekannte Zeitzone "${plan.zeitzone}" im Wochenplan.`);
  }
  zuMinuten(plan.briefingZeit ?? '15:00');

  const pruefeWoche = (tage, wo) => {
    for (const [tag, eintraege] of Object.entries(tage ?? {})) {
      if (!TAG_NAMEN[tag]) throw new Error(`Unbekannter Wochentag "${tag}" in ${wo} – erlaubt sind mo, di, mi, do, fr, sa, so.`);
      if (!Array.isArray(eintraege)) throw new Error(`${wo}.${tag} muss eine Liste von Einträgen enthalten.`);
      eintraege.forEach((eintrag) => pruefeEintrag(eintrag, `${wo}.${tag}`));
    }
  };

  pruefeWoche(plan.tage, 'tage');

  if (plan.wochen != null) {
    if (typeof plan.wochen !== 'object' || Array.isArray(plan.wochen)) {
      throw new Error('"wochen" muss ein Objekt der Form { "A": { ... }, "B": { ... } } sein.');
    }
    const namen = Object.keys(plan.wochen);
    if (namen.length === 0) throw new Error('"wochen" enthält keine einzige Wochenvariante.');
    namen.forEach((name) => pruefeWoche(plan.wochen[name], `wochen.${name}`));

    const wechsel = plan.wochenwechsel;
    if (!wechsel?.ankerDatum) {
      throw new Error('Bei "wochen" fehlt "wochenwechsel.ankerDatum" (JJJJ-MM-TT) – sonst ist unklar, welche Woche gerade gilt.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(wechsel.ankerDatum))
      || Number.isNaN(new Date(`${wechsel.ankerDatum}T00:00:00Z`).getTime())) {
      throw new Error(`"wochenwechsel.ankerDatum" ist kein gültiges Datum: "${wechsel.ankerDatum}".`);
    }
    if (wechsel.ankerWoche != null && !namen.includes(wechsel.ankerWoche)) {
      throw new Error(`"wochenwechsel.ankerWoche" verweist auf die unbekannte Woche "${wechsel.ankerWoche}". Bekannt: ${namen.join(', ')}.`);
    }
  }
  (plan.termine ?? []).forEach((eintrag, i) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(eintrag.datum ?? ''))) {
      throw new Error(`termine[${i}] braucht ein Feld "datum" im Format JJJJ-MM-TT.`);
    }
    pruefeEintrag(eintrag, `termine[${i}]`);
  });

  return plan;
}

function pruefeEintrag(eintrag, wo) {
  if (!eintrag || typeof eintrag !== 'object') throw new Error(`${wo}: Eintrag muss ein Objekt sein.`);
  if (!eintrag.titel) throw new Error(`${wo}: Feld "titel" fehlt.`);
  const von = zuMinuten(eintrag.von);
  if (eintrag.bis != null) {
    const bis = zuMinuten(eintrag.bis);
    if (bis < von) throw new Error(`${wo} ("${eintrag.titel}"): "bis" liegt vor "von".`);
  }
}

/**
 * Alle Einträge eines Kalendertages, zusammengeführt aus Wochenrhythmus und
 * Einzelterminen und nach Startzeit sortiert. An freien Tagen (Ferien,
 * Feiertage) entfällt der Wochenrhythmus, Einzeltermine bleiben bestehen.
 */
/**
 * Welche Wochenvariante gilt an diesem Tag (A oder B)?
 *
 * Gezählt wird in ganzen Kalenderwochen ab dem Montag der Ankerwoche, damit
 * ein Wechsel immer sonntags auf montags stattfindet und nicht mitten in der
 * Woche. Ohne "wochen"/"wochenwechsel" im Plan gilt der einfache
 * Wochenrhythmus aus "tage" – dann liefert die Funktion null.
 */
export function bestimmeWoche(plan, zeit) {
  const wechsel = plan.wochenwechsel;
  if (!plan.wochen || !wechsel?.ankerDatum) return null;

  const namen = Object.keys(plan.wochen);
  if (namen.length === 0) return null;

  const aufMontag = (datum) => {
    const kopie = new Date(datum);
    kopie.setUTCDate(kopie.getUTCDate() - ((kopie.getUTCDay() + 6) % 7));
    return kopie;
  };

  const anker = aufMontag(new Date(`${wechsel.ankerDatum}T00:00:00Z`));
  const ziel = aufMontag(new Date(Date.UTC(zeit.jahr, zeit.monat - 1, zeit.tag)));
  const wochen = Math.round((ziel - anker) / 604800000);

  const start = Math.max(0, namen.indexOf(wechsel.ankerWoche ?? namen[0]));
  return namen[(((start + wochen) % namen.length) + namen.length) % namen.length];
}

export function eintraegeFuerTag(plan, zeit) {
  const istFrei = (plan.freieTage ?? []).includes(zeit.iso);
  const woche = bestimmeWoche(plan, zeit);
  const quelle = woche ? plan.wochen[woche] : plan.tage;
  const wiederkehrend = istFrei ? [] : (quelle?.[zeit.wochentag] ?? []);
  const einmalig = (plan.termine ?? []).filter((eintrag) => eintrag.datum === zeit.iso);

  return [...wiederkehrend, ...einmalig]
    .map((eintrag) => ({
      ...eintrag,
      vonMin: zuMinuten(eintrag.von),
      bisMin: eintrag.bis != null ? zuMinuten(eintrag.bis) : null,
    }))
    .sort((a, b) => a.vonMin - b.vonMin || String(a.titel).localeCompare(String(b.titel), 'de'));
}

/** Einen Eintrag als "15:30–16:30 Hausaufgaben (Zimmer)" darstellen. */
export function alsZeile(eintrag) {
  const spanne = eintrag.bisMin != null
    ? `${alsUhrzeit(eintrag.vonMin)}–${alsUhrzeit(eintrag.bisMin)}`
    : `ab ${alsUhrzeit(eintrag.vonMin)}`;
  const ort = eintrag.ort ? ` (${eintrag.ort})` : '';
  const hinweis = eintrag.hinweis ? ` – ${eintrag.hinweis}` : '';
  return `${spanne}  ${eintrag.titel}${ort}${hinweis}`;
}

/**
 * Wann kommt heute das Tagesbriefing?
 *
 * Ist "briefingNach" gesetzt (z. B. "Schule"), richtet sich das Briefing nach
 * dem Ende dieses Blocks – dadurch stimmt es auch an Tagen, an denen die
 * Schule früher oder später endet, ohne dass Zeiten gepflegt werden müssen.
 * Fehlt der Block an einem Tag (Wochenende), gilt "briefingZeit".
 */
export function briefingMinuten(plan, eintraege) {
  if (plan.briefingNach) {
    const suche = String(plan.briefingNach).toLowerCase();
    const treffer = [...eintraege].reverse()
      .find((e) => String(e.titel).toLowerCase().includes(suche) && e.bisMin != null);
    if (treffer) return treffer.bisMin;
  }
  return zuMinuten(plan.briefingZeit ?? '15:00');
}

/** Der gerade laufende Eintrag, falls es einen gibt. */
export function laufenderEintrag(eintraege, minuten) {
  return eintraege.find((e) => e.bisMin != null && e.vonMin <= minuten && minuten < e.bisMin) ?? null;
}

/** Der nächste Eintrag, der heute noch beginnt. */
export function naechsterEintrag(eintraege, minuten) {
  return eintraege.find((e) => e.vonMin > minuten) ?? null;
}

/**
 * Tagesbriefing: was heute noch ansteht.
 * Liefert eine kurze Fassung (für die Push-Nachricht, < 200 Zeichen) und
 * eine ausführliche Fassung für die Sitzungsantwort.
 */
export function baueBriefing(plan, zeitpunkt = new Date()) {
  const zeit = inZone(zeitpunkt, plan.zeitzone);
  const eintraege = eintraegeFuerTag(plan, zeit);
  const offen = eintraege.filter((e) => (e.bisMin ?? e.vonMin) > zeit.minutenSeitMitternacht);
  const kopf = `${alsDatum(zeit)}, ${alsUhrzeit(zeit.minutenSeitMitternacht)}`;

  if (offen.length === 0) {
    return {
      modus: 'briefing',
      kurz: `${kopf}: Für heute steht nichts mehr an. Feierabend.`,
      lang: `Tagesbriefing – ${kopf}\n\nFür heute steht nichts mehr an. Feierabend.`,
    };
  }

  const naechster = offen[0];
  const bisStart = naechster.vonMin - zeit.minutenSeitMitternacht;
  const anriss = bisStart > 0
    ? `zuerst ${naechster.titel} um ${alsUhrzeit(naechster.vonMin)}`
    : `gerade läuft ${naechster.titel}`;

  return {
    modus: 'briefing',
    kurz: kuerze(`${kopf}: noch ${offen.length} ${offen.length === 1 ? 'Termin' : 'Termine'}, ${anriss}.`),
    lang: [
      `Tagesbriefing – ${kopf}`,
      '',
      `Heute stehen noch ${offen.length} ${offen.length === 1 ? 'Punkt' : 'Punkte'} an:`,
      ...offen.map((e) => `  • ${alsZeile(e)}`),
      '',
      bisStart > 0
        ? `Als Nächstes: ${naechster.titel} in ${alsDauer(bisStart)} (${alsUhrzeit(naechster.vonMin)}).`
        : `Gerade läuft: ${naechster.titel}.`,
    ].join('\n'),
  };
}

/**
 * Erinnerung an die nächste Aufgabe – aber nur, wenn sie innerhalb des
 * Vorlauffensters beginnt. Sonst null, damit der Agent schweigt, statt
 * ohne Anlass zu benachrichtigen.
 */
export function baueErinnerung(plan, zeitpunkt = new Date()) {
  const zeit = inZone(zeitpunkt, plan.zeitzone);
  const eintraege = eintraegeFuerTag(plan, zeit);
  const naechster = naechsterEintrag(eintraege, zeit.minutenSeitMitternacht);
  if (!naechster) return null;

  const bisStart = naechster.vonMin - zeit.minutenSeitMitternacht;
  if (bisStart > (plan.vorlaufMinuten ?? 90)) return null;

  const laufend = laufenderEintrag(eintraege, zeit.minutenSeitMitternacht);

  // Push-Nachrichten stehen auf dem gesperrten Bildschirm und sind damit für
  // jeden lesbar, der das Handy sieht. Standardmäßig bleiben Ort und Hinweis
  // deshalb aus der Kurzfassung; die Langfassung in der Sitzung hat sie.
  const diskret = plan.diskretePush !== false;
  const ort = !diskret && naechster.ort ? ` – ${naechster.ort}` : '';

  return {
    modus: 'erinnerung',
    kurz: kuerze(`In ${alsDauer(bisStart)}: ${naechster.titel} um ${alsUhrzeit(naechster.vonMin)}${ort}.`),
    lang: [
      `Nächste Aufgabe – ${alsDatum(zeit)}, ${alsUhrzeit(zeit.minutenSeitMitternacht)}`,
      '',
      laufend ? `Gerade läuft: ${alsZeile(laufend)}` : null,
      `In ${alsDauer(bisStart)}: ${alsZeile(naechster)}`,
    ].filter(Boolean).join('\n'),
  };
}

/**
 * Entscheidet, was der Agent bei einem Lauf tun soll.
 * Innerhalb der Briefing-Stunde gewinnt das Tagesbriefing, sonst wird nur
 * bei einer anstehenden Aufgabe erinnert – ansonsten bleibt es still.
 */
export function agentEntscheidung(plan, zeitpunkt = new Date()) {
  // Solange der Wochenplan nur Beispieldaten enthält, schweigt der Agent.
  // Sonst kämen Erinnerungen an frei erfundene Termine auf dem Handy an.
  if (plan.platzhalter === true) {
    return {
      modus: 'platzhalter',
      kurz: '',
      lang: 'Der Wochenplan enthält noch Beispieldaten (Feld "platzhalter": true).\n'
        + 'Es wird nichts gemeldet, bis der echte Plan eingetragen und das Feld entfernt ist.',
    };
  }

  const zeit = inZone(zeitpunkt, plan.zeitzone);
  const briefingMin = briefingMinuten(plan, eintraegeFuerTag(plan, zeit));
  const istBriefingStunde = zeit.minutenSeitMitternacht >= briefingMin
    && zeit.minutenSeitMitternacht < briefingMin + 60;

  if (istBriefingStunde) return baueBriefing(plan, zeitpunkt);

  const erinnerung = baueErinnerung(plan, zeitpunkt);
  if (erinnerung) return erinnerung;

  return {
    modus: 'still',
    kurz: '',
    lang: `Nichts zu melden – ${alsDatum(zeit)}, ${alsUhrzeit(zeit.minutenSeitMitternacht)}.`,
  };
}

/** Push-Nachrichten werden mobil abgeschnitten – auf 200 Zeichen begrenzen. */
function kuerze(text, grenze = 200) {
  return text.length <= grenze ? text : `${text.slice(0, grenze - 1).trimEnd()}…`;
}
