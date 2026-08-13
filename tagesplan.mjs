#!/usr/bin/env node
/**
 * Kommandozeile für den Tagesplan-Agenten.
 *
 *   node tagesplan/tagesplan.mjs briefing     Tagesbriefing ausgeben
 *   node tagesplan/tagesplan.mjs naechste     nächste Aufgabe ausgeben
 *   node tagesplan/tagesplan.mjs agent        entscheidet selbst (für die Routine)
 *   node tagesplan/tagesplan.mjs heute        vollständiger Tagesplan
 *
 * Optionen:
 *   --jetzt <ISO>    Zeitpunkt simulieren, z. B. --jetzt 2026-08-17T13:05:00Z
 *   --plan <Pfad>    anderen Wochenplan verwenden
 *   --kurz           nur die Push-taugliche Kurzfassung ausgeben
 *
 * Exit-Codes: 0 = etwas zu melden, 3 = bewusst still, 4 = Plan noch Platzhalter,
 * 1 = Fehler. Die Routine wertet den Code aus, um nicht ohne Anlass zu
 * benachrichtigen.
 */
import {
  ladePlan,
  agentEntscheidung,
  baueBriefing,
  baueErinnerung,
  eintraegeFuerTag,
  inZone,
  alsDatum,
  alsZeile,
  alsUhrzeit,
  STANDARD_PLAN,
} from './plan.mjs';

const argumente = process.argv.slice(2);
const befehl = argumente.find((a) => !a.startsWith('--')) ?? 'agent';

function option(name) {
  const index = argumente.indexOf(`--${name}`);
  return index >= 0 ? argumente[index + 1] : undefined;
}

const nurKurz = argumente.includes('--kurz');
const planPfad = option('plan') ?? STANDARD_PLAN;

const rohZeit = option('jetzt');
let jetzt = new Date();
if (rohZeit !== undefined) {
  jetzt = new Date(rohZeit);
  if (Number.isNaN(jetzt.getTime())) {
    console.error(`Ungültiger Zeitpunkt für --jetzt: "${rohZeit}"`);
    process.exit(1);
  }
}

function ausgeben(ergebnis) {
  if (ergebnis?.modus === 'platzhalter') {
    if (!nurKurz) console.log(ergebnis.lang);
    process.exit(4);
  }
  if (!ergebnis || ergebnis.modus === 'still') {
    if (!nurKurz) console.log(ergebnis?.lang ?? 'Nichts zu melden.');
    process.exit(3);
  }
  console.log(nurKurz ? ergebnis.kurz : ergebnis.lang);
  process.exit(0);
}

try {
  const plan = ladePlan(planPfad);

  switch (befehl) {
    case 'agent':
      ausgeben(agentEntscheidung(plan, jetzt));
      break;

    case 'briefing':
      ausgeben(baueBriefing(plan, jetzt));
      break;

    case 'naechste':
      ausgeben(baueErinnerung(plan, jetzt) ?? {
        modus: 'still',
        lang: 'In nächster Zeit steht nichts an.',
      });
      break;

    case 'heute': {
      const zeit = inZone(jetzt, plan.zeitzone);
      const eintraege = eintraegeFuerTag(plan, zeit);
      console.log(`Tagesplan – ${alsDatum(zeit)} (Stand ${alsUhrzeit(zeit.minutenSeitMitternacht)}, ${plan.zeitzone})`);
      console.log('');
      if (eintraege.length === 0) console.log('  (nichts eingetragen)');
      else eintraege.forEach((e) => console.log(`  • ${alsZeile(e)}`));
      process.exit(0);
      break;
    }

    default:
      console.error(`Unbekannter Befehl "${befehl}". Erlaubt: agent, briefing, naechste, heute.`);
      process.exit(1);
  }
} catch (fehler) {
  console.error(`Tagesplan-Fehler: ${fehler.message}`);
  process.exit(1);
}
