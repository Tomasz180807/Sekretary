#!/usr/bin/env node
/**
 * Telegram-Bot für den Tagesplan.
 *
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_ALLOWED_CHAT_IDS=123456 node bot.mjs
 *
 * Bewusst per Long Polling (getUpdates) statt Webhook: Der Prozess baut die
 * Verbindung nach außen auf. Es wird kein Port geöffnet, keine öffentliche
 * Adresse gebraucht und kein TLS-Zertifikat verwaltet – der Rechner, auf dem
 * der Bot läuft, bleibt von außen unerreichbar.
 *
 * Sicherheit:
 *  - Der Token steht in der Umgebung, nie im Repository, nie im Log.
 *  - Ein Bot-Token ist ein offener Endpunkt: Jeder, der den Botnamen kennt,
 *    kann schreiben. Ohne Freigabeliste gäbe es den Tagesplan an Fremde.
 *    Deshalb antwortet der Bot nur Chat-IDs aus TELEGRAM_ALLOWED_CHAT_IDS.
 *  - Ist die Liste leer, startet der Bot im Einrichtungsmodus und gibt
 *    ausschließlich die Chat-ID zurück – niemals Plandaten.
 */
import { ladePlan, STANDARD_PLAN, faelligeErinnerungen } from './plan.mjs';
import { baueAntwort } from './antworten.mjs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const PLAN_PFAD = process.env.SEKRETARY_PLAN?.trim() || STANDARD_PLAN;

/** Telegram kappt Nachrichten bei 4096 Zeichen. */
const MAX_LAENGE = 4000;

const freigegeben = new Set(
  (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? '')
    .split(/[,\s]+/)
    .map((eintrag) => eintrag.trim())
    .filter(Boolean),
);
const einrichtungsmodus = freigegeben.size === 0;

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN fehlt. Token bei @BotFather holen und als Umgebungsvariable setzen.');
  console.error('Beispiel: TELEGRAM_BOT_TOKEN=123:ABC TELEGRAM_ALLOWED_CHAT_IDS=123456 node bot.mjs');
  process.exit(1);
}

/** Der Token darf niemals in einer Fehlermeldung landen. */
const ohneToken = (text) => String(text).split(TOKEN).join('<TOKEN>');

async function api(methode, nutzlast, zeitlimitMs = 65000) {
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), zeitlimitMs);
  try {
    const antwort = await fetch(`https://api.telegram.org/bot${TOKEN}/${methode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(nutzlast),
      signal: abbruch.signal,
    });
    // Nicht jede Antwort ist JSON: Proxys und Gateways liefern im Fehlerfall
    // HTML. Ohne diese Behandlung bliebe davon nur ein Parse-Fehler übrig.
    const roh = await antwort.text();
    let ergebnis;
    try {
      ergebnis = JSON.parse(roh);
    } catch {
      throw new Error(`Telegram ${methode}: HTTP ${antwort.status}, keine JSON-Antwort – ${roh.slice(0, 120).trim()}`);
    }
    if (!ergebnis.ok) throw new Error(`Telegram ${methode}: HTTP ${antwort.status} – ${ergebnis.description ?? 'ohne Begründung'}`);
    return ergebnis.result;
  } finally {
    clearTimeout(uhr);
  }
}

async function sende(chatId, text, { still = true } = {}) {
  // Lange Antworten (etwa /woche) in mehrere Nachrichten aufteilen.
  for (let start = 0; start < text.length; start += MAX_LAENGE) {
    await api('sendMessage', {
      chat_id: chatId,
      text: text.slice(start, start + MAX_LAENGE),
      // Antworten auf eine Frage kommen lautlos – die Erinnerung soll
      // dagegen bemerkt werden, sie ist der eigentliche Zweck.
      disable_notification: still,
    });
  }
}

/* ------------------------------ Erinnerungen ------------------------------ */

const bereitsGesendet = new Set();
let letzterTag = null;

/**
 * Im Minutentakt prüfen, ob ein Block bevorsteht.
 * Nur so lässt sich „kurz vorher" einhalten – die stündliche Routine kann das
 * prinzipbedingt nicht.
 */
async function pruefeErinnerungen() {
  if (einrichtungsmodus || freigegeben.size === 0) return;

  let plan;
  try {
    plan = ladePlan(PLAN_PFAD);
  } catch (fehler) {
    console.error(`Erinnerung übersprungen – Plan nicht lesbar: ${ohneToken(fehler.message)}`);
    return;
  }

  const faellig = faelligeErinnerungen(plan, new Date());

  // Gesendetes nur bis zum Tageswechsel merken, damit die Menge nicht wächst.
  const heute = faellig[0]?.schluessel.split('|')[0] ?? null;
  if (heute && heute !== letzterTag) {
    letzterTag = heute;
    bereitsGesendet.clear();
  }

  for (const erinnerung of faellig) {
    if (bereitsGesendet.has(erinnerung.schluessel)) continue;
    bereitsGesendet.add(erinnerung.schluessel);
    for (const chatId of freigegeben) {
      try {
        await sende(chatId, erinnerung.text, { still: false });
      } catch (fehler) {
        console.error(`Erinnerung an ${chatId} fehlgeschlagen: ${ohneToken(fehler.message)}`);
      }
    }
  }
}

function behandle(nachricht) {
  const chatId = String(nachricht.chat?.id ?? '');
  const text = nachricht.text ?? '';

  if (einrichtungsmodus) {
    console.log(`Einrichtungsmodus – Chat-ID ${chatId}. In TELEGRAM_ALLOWED_CHAT_IDS eintragen und neu starten.`);
    return `Einrichtungsmodus: Ich gebe noch keine Plandaten heraus.\n\nDeine Chat-ID lautet ${chatId}.\n`
      + 'Trag sie in TELEGRAM_ALLOWED_CHAT_IDS ein und starte mich neu.';
  }

  if (!freigegeben.has(chatId)) {
    console.warn(`Abgewiesen: Chat-ID ${chatId} steht nicht auf der Freigabeliste.`);
    return `Ich beantworte nur Anfragen freigegebener Chats. Deine Chat-ID lautet ${chatId}.`;
  }

  // Der Plan wird bei jeder Anfrage frisch gelesen, damit Änderungen an
  // wochenplan.json ohne Neustart wirken.
  const plan = ladePlan(PLAN_PFAD);
  return baueAntwort(plan, text, new Date());
}

let laeuft = true;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('\nBot wird beendet.');
    laeuft = false;
  });
}

async function hauptschleife() {
  let ich;
  try {
    ich = await api('getMe', {}, 20000);
  } catch (fehler) {
    throw new Error(`Anmeldung bei Telegram fehlgeschlagen – Token oder Netzverbindung prüfen. ${fehler.message}`);
  }
  console.log(`Bot @${ich.username} bereit. Plan: ${PLAN_PFAD}`);
  console.log(einrichtungsmodus
    ? 'ACHTUNG: keine Freigabeliste gesetzt – Einrichtungsmodus, es werden keine Plandaten herausgegeben.'
    : `Freigegebene Chats: ${[...freigegeben].join(', ')}`);

  // Alle 30 s nachsehen: feiner als die Minutenauflösung des Plans, damit die
  // Erinnerung zuverlässig im richtigen Vorlauffenster landet.
  const takt = setInterval(() => {
    pruefeErinnerungen().catch((fehler) => console.error(`Erinnerungstakt: ${ohneToken(fehler.message)}`));
  }, 30000);
  takt.unref?.();
  await pruefeErinnerungen();

  let offset = 0;
  let fehlerInFolge = 0;

  while (laeuft) {
    let updates;
    try {
      updates = await api('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
      fehlerInFolge = 0;
    } catch (fehler) {
      if (!laeuft) break;
      // Netzprobleme sind normal – mit wachsender Pause erneut versuchen,
      // statt den Bot sterben zu lassen.
      fehlerInFolge += 1;
      const pause = Math.min(60000, 1000 * 2 ** Math.min(fehlerInFolge, 6));
      console.error(`Abruf fehlgeschlagen (${ohneToken(fehler.message)}). Neuer Versuch in ${pause / 1000} s.`);
      await new Promise((weiter) => setTimeout(weiter, pause));
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;
      const nachricht = update.message;
      if (!nachricht?.chat?.id) continue;

      try {
        await sende(nachricht.chat.id, behandle(nachricht));
      } catch (fehler) {
        // Ein kaputter Wochenplan oder ein Sendefehler darf den Bot nicht beenden.
        console.error(`Fehler bei Chat ${nachricht.chat.id}: ${ohneToken(fehler.message)}`);
        try {
          await sende(nachricht.chat.id, 'Da ist etwas schiefgegangen. Bitte im Log nachsehen.');
        } catch { /* Senden aussichtslos – nächste Nachricht abwarten. */ }
      }
    }
  }
  clearInterval(takt);
}

hauptschleife().catch((fehler) => {
  console.error(`Bot abgebrochen: ${ohneToken(fehler.message)}`);
  process.exit(1);
});
