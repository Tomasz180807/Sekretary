/**
 * Antwortlogik des Telegram-Bots.
 *
 * Bewusst frei von Netzwerk und Zustand: rein aus Wochenplan + Eingabetext +
 * Zeitpunkt entsteht der Antworttext. Dadurch ist das gesamte Verhalten ohne
 * laufenden Bot testbar; bot.mjs kümmert sich nur um den Transport.
 *
 * Der Bot beantwortet feste Befehle und ein paar deutsche Stichwörter. Er
 * ruft kein Sprachmodell auf – die Antworten kommen ausschließlich aus dem
 * Wochenplan und sind damit vorhersagbar und offline korrekt.
 */
import {
  inZone,
  tagVerschoben,
  eintraegeFuerTag,
  alsDatum,
  alsZeile,
  alsUhrzeit,
  baueBriefing,
  baueErinnerung,
} from './plan.mjs';

const HILFE = [
  'Ich bin dein Tagesplan-Sekretär. Das verstehe ich:',
  '',
  '/heute – was heute ansteht',
  '/morgen – was morgen ansteht',
  '/briefing – was heute noch aussteht',
  '/naechste – die nächste Aufgabe',
  '/woche – die nächsten sieben Tage',
  '/hilfe – diese Übersicht',
  '',
  'Formlos geht auch: „was steht heute an", „nächste", „morgen".',
].join('\n');

/** Tagesliste als Textblock. */
function tagesListe(plan, zeit, ueberschrift) {
  const eintraege = eintraegeFuerTag(plan, zeit);
  const zeilen = [ueberschrift ?? alsDatum(zeit), ''];
  if (eintraege.length === 0) zeilen.push('  (nichts eingetragen)');
  else eintraege.forEach((e) => zeilen.push(`  • ${alsZeile(e)}`));
  return zeilen.join('\n');
}

/** Eingabe auf eine Absicht abbilden. */
export function erkenneAbsicht(eingabe) {
  const text = String(eingabe ?? '').trim().toLowerCase();
  if (!text) return 'hilfe';

  // Befehle können als "/heute@meinbot" ankommen, wenn der Bot in einer
  // Gruppe steckt – der Teil hinter dem @ wird abgeschnitten.
  const befehl = text.startsWith('/') ? text.slice(1).split(/[\s@]/)[0] : null;
  if (befehl) {
    if (['start', 'hilfe', 'help'].includes(befehl)) return 'hilfe';
    if (['heute', 'today'].includes(befehl)) return 'heute';
    if (befehl === 'morgen') return 'morgen';
    if (befehl === 'briefing') return 'briefing';
    if (['naechste', 'nächste', 'next'].includes(befehl)) return 'naechste';
    if (['woche', 'week'].includes(befehl)) return 'woche';
    return 'unbekannt';
  }

  if (/\bmorgen\b/.test(text)) return 'morgen';
  if (/\bwoche\b/.test(text)) return 'woche';
  if (/n(ä|ae)chste|was kommt|als n(ä|ae)chstes/.test(text)) return 'naechste';
  if (/briefing|noch an|steht noch/.test(text)) return 'briefing';
  if (/heute|tag/.test(text)) return 'heute';
  if (/hilfe|help|was kannst/.test(text)) return 'hilfe';
  return 'unbekannt';
}

/**
 * Antworttext zu einer Eingabe.
 * Ist der Plan noch als Platzhalter markiert, wird das gesagt, statt frei
 * erfundene Beispieltermine als echte Termine auszugeben.
 */
export function baueAntwort(plan, eingabe, zeitpunkt = new Date()) {
  const absicht = erkenneAbsicht(eingabe);
  if (absicht === 'hilfe') return HILFE;
  if (absicht === 'unbekannt') return `Das habe ich nicht verstanden.\n\n${HILFE}`;

  if (plan.platzhalter === true) {
    return 'Der Wochenplan enthält noch Beispieldaten. Trag deinen echten Plan in '
      + 'wochenplan.json ein und entferne das Feld "platzhalter", dann antworte ich richtig.';
  }

  const jetzt = inZone(zeitpunkt, plan.zeitzone);

  switch (absicht) {
    case 'heute':
      return tagesListe(plan, jetzt, `Heute – ${alsDatum(jetzt)}`);

    case 'morgen': {
      const morgen = tagVerschoben(jetzt, 1);
      return tagesListe(plan, morgen, `Morgen – ${alsDatum(morgen)}`);
    }

    case 'briefing':
      return baueBriefing(plan, zeitpunkt).lang;

    case 'naechste': {
      const erinnerung = baueErinnerung(plan, zeitpunkt);
      if (erinnerung) return erinnerung.lang;

      const eintraege = eintraegeFuerTag(plan, jetzt);
      const spaeter = eintraege.find((e) => e.vonMin > jetzt.minutenSeitMitternacht);
      if (spaeter) {
        return `Als Nächstes heute um ${alsUhrzeit(spaeter.vonMin)}:\n  • ${alsZeile(spaeter)}`;
      }
      return 'Heute steht nichts mehr an.';
    }

    case 'woche': {
      const bloecke = [];
      for (let i = 0; i < 7; i += 1) {
        const tag = tagVerschoben(jetzt, i);
        bloecke.push(tagesListe(plan, tag, alsDatum(tag)));
      }
      return `Die nächsten sieben Tage\n\n${bloecke.join('\n\n')}`;
    }

    default:
      return HILFE;
  }
}

export { HILFE };
