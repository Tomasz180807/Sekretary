# Sekretary

Ein kleiner Sekretariats-Agent für den persönlichen Wochenplan:

- **Tagesbriefing** – einmal am Nachmittag eine Zusammenfassung dessen, was heute noch ansteht.
- **Erinnerung kurz vor jedem Block** – der Bot meldet sich 10 Minuten vorher von selbst.

Ausgeführt wird der Agent von einer Routine, die werktags stündlich eine frische
Sitzung startet, dieses Repository auscheckt und `node tagesplan.mjs agent`
aufruft. Steht nichts an, bleibt sie stumm.

Keine Abhängigkeiten – reine Node-Standardbibliothek, kein Build.

## Schnellstart

```bash
node tagesplan.mjs heute       # kompletter Tagesplan
node tagesplan.mjs briefing    # Tagesbriefing
node tagesplan.mjs naechste    # nächste Aufgabe
node tagesplan.mjs agent       # das, was die Routine aufruft
npm run bot                    # Telegram-Bot (siehe unten)
node importieren.mjs plan.html # bestehenden HTML-Plan einlesen
node kalender.mjs              # .ics für den Handykalender
```

Nützliche Optionen:

| Option | Bedeutung |
| --- | --- |
| `--jetzt <ISO>` | Zeitpunkt simulieren, z. B. `--jetzt 2026-08-17T13:05:00Z` |
| `--plan <Pfad>` | anderen Wochenplan verwenden |
| `--kurz` | nur die Kurzfassung (< 200 Zeichen, für die Push-Nachricht) |

Über npm: `npm start`, `npm run heute`, `npm run briefing`, `npm run naechste`, `npm run bot`, `npm test`.

## Exit-Codes

Die Routine wertet den Exit-Code aus, damit sie nicht ohne Anlass benachrichtigt.

| Code | Bedeutung |
| --- | --- |
| `0` | Es gibt etwas zu melden – der Text steht auf stdout. |
| `3` | Bewusst still: gerade steht nichts an. |
| `4` | Der Wochenplan ist noch als Platzhalter markiert. |
| `1` | Fehler, z. B. kaputtes JSON – Meldung auf stderr. |

## Den eigenen Plan eintragen

### Der schnelle Weg: HTML importieren

Liegt der Plan schon als HTML vor (etwa „Wochenplan kompakt"), liest ihn der
Importer direkt ein – kein Abtippen:

```bash
node importieren.mjs "Wochenplan kompakt.html"              # nur anzeigen
node importieren.mjs "Wochenplan kompakt.html" --schreiben  # übernehmen
```

Ohne `--schreiben` wird nichts verändert; der Importer zeigt nur, was er
erkannt hat. Erst danach übernehmen.

Er kommt mit Tabellen, Listen mit Überschriften und Einzeilern zurecht, ebenso
mit Abkürzungen (`Mo.`), deutscher Punktschreibweise (`8.00 Uhr`), Orten in
Klammern und HTML-Entities. **Nichts wird stillschweigend verschluckt:** Zeilen,
die er nicht zuordnen kann, meldet er einzeln.

```
Erkannt: 5 Einträge

Montag:
  • 08:00–13:15  Schule (Gymnasium)
  • 15:30–16:30  Hausaufgaben
…
1 Hinweis(e) – bitte prüfen:
  ! Nicht zugeordnet: "Bitte Sportzeug nicht vergessen!"
```

Der Import setzt `platzhalter` **nicht** – ab dann sind es echte Daten und der
Agent meldet sich. Danach einmal `npm test` und `npm run heute` zur Kontrolle.

Nicht unterstützt: Pläne, bei denen die Wochentage die *Spalten* einer Tabelle
sind und die Zeiten die Zeilen. Die brauchen Handarbeit.

### „Wochenplan kompakt" übernehmen

Diese Datei ist ein Sonderfall: Ihr `<body>` ist praktisch leer, der Plan lebt
in JavaScript-Objekten und wird erst im Browser gerendert. `importieren.mjs`
findet dort nichts. Dafür gibt es `uebernehmen.mjs` – es wertet den Datenteil
des Skripts aus und bekommt damit **exakt** die Zeilen, die auch die Seite
anzeigt:

```bash
node uebernehmen.mjs wochenplan_kompakt.html --schreiben \
  --anker 2026-08-17 --ankerwoche A
```

Ausgeführt wird nur der Datenteil (bis `let currentWeek`), nicht der DOM-Teil.

### Zwei Wochen im Wechsel (A/B)

Wechseln sich zwei Wochen ab, stehen sie unter `wochen` statt unter `tage`:

```jsonc
{
  "wochen": { "A": { "mo": [ … ] }, "B": { "mo": [ … ] } },
  "wochenwechsel": { "ankerDatum": "2026-08-17", "ankerWoche": "A" }
}
```

Der Anker sagt, welche Variante in der Woche dieses Datums gilt; gezählt wird
in ganzen Kalenderwochen ab dem **Montag** der Ankerwoche. Ein Wechsel findet
damit immer sonntags auf montags statt, nie mitten in der Woche.

**Stimmt der Anker nicht, ist der Plan systematisch um eine Woche verschoben.**
Prüfen mit `npm run heute` und `node tagesplan.mjs heute --jetzt <ISO>`.

### Briefing nach dem Schulende statt zur festen Uhrzeit

Endet die Schule an verschiedenen Tagen verschieden, wäre eine feste
`briefingZeit` an den meisten Tagen falsch. Mit `briefingNach` richtet sich das
Briefing nach dem Ende des genannten Blocks:

```jsonc
{ "briefingNach": "Schule", "briefingZeit": "10:15" }
```

`briefingZeit` gilt dann nur noch als Rückfallwert an Tagen ohne diesen Block
(Wochenende).

### Der genaue Weg: von Hand

`wochenplan.json` bearbeiten und anschließend **`"platzhalter": true` entfernen**.
Solange das Feld gesetzt ist, meldet der Agent nichts – so kommen keine
Erinnerungen an frei erfundene Beispieltermine auf dem Handy an.

```jsonc
{
  "zeitzone": "Europe/Berlin",   // Pflicht, IANA-Name
  "briefingZeit": "15:00",       // wann das Tagesbriefing kommt (Ortszeit)
  "vorlaufMinuten": 90,          // wie früh vor einer Aufgabe erinnert wird
  "diskretePush": true,          // Ort/Hinweis nicht auf den Sperrbildschirm

  "tage": {                      // wiederkehrender Wochenrhythmus
    "mo": [
      { "von": "08:00", "bis": "13:15", "titel": "Schule", "ort": "Gymnasium" },
      { "von": "15:30", "bis": "16:30", "titel": "Hausaufgaben" }
    ],
    "di": [], "mi": [], "do": [], "fr": [], "sa": [], "so": []
  },

  "termine": [                   // einmalige Termine an einem festen Datum
    { "datum": "2026-08-20", "von": "16:00", "bis": "16:30", "titel": "Zahnarzt" }
  ],

  "freieTage": ["2026-08-24"]    // Ferien/Feiertage: Wochenrhythmus entfällt,
}                                // Einzeltermine bleiben bestehen
```

Felder eines Eintrags:

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `von` | ja | Startzeit `HH:MM` |
| `bis` | nein | Endzeit `HH:MM`; ohne sie gilt „ab HH:MM“ |
| `titel` | ja | Bezeichnung der Aufgabe |
| `ort` | nein | wird in Klammern angehängt |
| `hinweis` | nein | kurzer Zusatz, mit `–` angehängt |

Der Plan wird beim Laden geprüft: unbekannte Wochentage, fehlende Titel,
ungültige Uhrzeiten, `bis` vor `von` und unbekannte Zeitzonen führen zu einer
verständlichen Fehlermeldung statt zu stillen Fehlbenachrichtigungen.

## Telegram-Bot

Damit lässt sich der Plan jederzeit im Chat abfragen. Der Bot arbeitet per
**Long Polling**: Er baut die Verbindung nach außen auf, es wird kein Port
geöffnet und keine öffentliche Adresse gebraucht. Der Rechner, auf dem er
läuft, bleibt von außen unerreichbar.

### Einrichten

1. In Telegram **@BotFather** anschreiben, `/newbot`, Namen vergeben, Token notieren.
2. `.env.example` nach `.env` kopieren und den Token eintragen.
3. Bot starten – noch ohne Freigabeliste:

   ```bash
   npm run bot
   ```

4. Dem Bot in Telegram irgendetwas schreiben. Er antwortet mit **deiner Chat-ID**
   und gibt bewusst noch keine Plandaten heraus.
5. Diese ID in `.env` bei `TELEGRAM_ALLOWED_CHAT_IDS` eintragen, Bot neu starten.

Ab jetzt antwortet er nur noch dir.

### Befehle

| Befehl | Antwort |
| --- | --- |
| `/heute` | alles, was heute ansteht |
| `/morgen` | alles, was morgen ansteht |
| `/briefing` | was heute noch aussteht |
| `/naechste` | die nächste Aufgabe |
| `/woche` | die nächsten sieben Tage |
| `/hilfe` | Übersicht |

Formlos geht auch: „was steht heute an", „nächste", „und morgen?".

Die Antworten kommen ausschließlich aus `wochenplan.json` – der Bot ruft kein
Sprachmodell auf. Er ist damit vorhersagbar, schnell und funktioniert ohne
weitere Zugänge. Dafür versteht er nur die oben genannten Muster.

`wochenplan.json` wird bei **jeder** Anfrage frisch gelesen: Änderungen wirken
ohne Neustart.

### Erinnerung kurz vor jedem Block

Läuft der Bot, meldet er sich **`vorlaufMinuten` vor jedem Block** von selbst –
ohne dass du fragen musst:

```
In 10 min: Training (17:00–19:45)
```

Nachgesehen wird alle 30 Sekunden, also feiner als die Minutenauflösung des
Plans. Jeder Block wird über einen Tagesschlüssel genau einmal gemeldet, auch
wenn der Takt mehrfach in dasselbe Fenster fällt.

Anders als die Antworten auf Fragen kommen diese Nachrichten **mit** Ton – sie
sind der eigentliche Zweck. Vorlauf ändern über `vorlaufMinuten` in
`wochenplan.json` (Vorgabe: 10).

Auch Telegram-Vorschauen stehen auf dem Sperrbildschirm, deshalb gilt hier
dieselbe Zurückhaltung wie bei der Push-Nachricht: Bei `diskretePush` bleibt
der `hinweis` aus der Nachricht.

### Arbeitsteilung: Routine und Bot

Beides ergänzt sich, weil beides andere Grenzen hat:

| | Routine (Cloud) | Bot (eigener Rechner) |
| --- | --- | --- |
| Braucht laufenden Prozess | nein | **ja** |
| Feinste Auflösung | 1 Stunde | 30 Sekunden |
| Tagesbriefing | ✓ | ✓ (`/briefing`) |
| Erinnerung kurz vor dem Block | **nein** | ✓ |
| Nachfragen | nein | ✓ |

Die Routine feuert stündlich und kann „10 Minuten vorher" prinzipbedingt nicht
treffen. Sie liefert deshalb das Tagesbriefing, das minutengenaue Erinnern
übernimmt der Bot.

### Wo der Bot läuft

Er braucht einen dauerhaft laufenden Prozess – eigener Rechner, Raspberry Pi,
kleiner Server. Läuft er nicht, kommt schlicht keine Antwort; verloren geht
nichts, Telegram hält die Nachrichten vor.

### Sicherheit

- **Der Token ist der Generalschlüssel.** Wer ihn hat, steuert den Bot komplett.
  Er gehört in `.env` (per `.gitignore` ausgeschlossen), nie ins Repository.
  Der Bot filtert ihn zusätzlich aus allen Fehlermeldungen.
- **Die Freigabeliste ist Pflicht.** Ein Bot-Token ist ein offener Endpunkt:
  Jeder, der den Botnamen kennt, kann schreiben. Ohne `TELEGRAM_ALLOWED_CHAT_IDS`
  bekäme ein Fremder auf „was steht heute an" den vollständigen Tagesplan.
  Deshalb läuft der Bot ohne Liste im Einrichtungsmodus und gibt nichts heraus.
- **Telegram sieht die Nachrichten.** Reguläre Chats sind zum Server hin
  verschlüsselt, aber nicht Ende-zu-Ende. Für Termindaten ist das vertretbar –
  Passwörter oder Ähnliches gehören nicht in diesen Chat.
- Bei kompromittiertem Token: `/revoke` bei @BotFather, neuen Token in `.env`.

## Kalenderdatei (.ics) — Erinnerungen ohne laufenden Rechner

```bash
node kalender.mjs                 # schreibt wochenplan.ics
node kalender.mjs --vorlauf 5     # Erinnerung 5 statt 10 Minuten vorher
```

Das Handy erinnert dann selbst — auch offline, auch wenn der Bot nicht läuft.

Jeder Block wird als **wiederkehrender** Termin geschrieben, bei zwei Wochen
mit `FREQ=WEEKLY;INTERVAL=2`, verankert auf dem ersten passenden Tag der
jeweiligen Variante. Die Datei gilt damit dauerhaft und muss nicht
nachgeneriert werden — nur wenn sich der Plan ändert.

Die Zeitzonenregeln stehen mit in der Datei (`VTIMEZONE`), der Kalender rechnet
Sommer- und Winterzeit also selbst. Bei der Umstellung verschiebt sich nichts.

### Importieren

**Lege dafür einen eigenen Kalender an**, z. B. „Wochenplan". Dann lässt sich
alles auf einen Schlag löschen und neu importieren, wenn sich der Plan ändert —
ohne deine übrigen Termine anzufassen.

*Android / Google Kalender* — am Rechner, die App kann keine Dateien importieren:

1. [calendar.google.com](https://calendar.google.com) öffnen
2. Links bei „Weitere Kalender" → **+** → *Neuen Kalender erstellen* → „Wochenplan"
3. Zahnrad → *Einstellungen* → **Importieren und Exportieren**
4. `wochenplan.ics` wählen, als Zielkalender „Wochenplan" — *Importieren*
5. Auf dem Handy in der Kalender-App den neuen Kalender einblenden

*iPhone / iOS:*

1. Datei aufs Handy bringen (E-Mail an dich selbst, AirDrop oder iCloud Drive)
2. Antippen → iOS fragt, in welchen Kalender
3. *Alle hinzufügen*

### Wenn keine Erinnerung kommt

Google Kalender überschreibt die mitgelieferte Erinnerung gerne mit der eigenen
Standardeinstellung. Falls nichts kommt: in den Einstellungen des Kalenders
„Wochenplan" die Standardbenachrichtigung auf **10 Minuten vorher** setzen.

### Was auf dem Sperrbildschirm steht

Die Kalenderbenachrichtigung zeigt den **Titel** des Blocks, je nach Gerät auch
den Ort. Der `hinweis` landet in `DESCRIPTION` und erscheint dort in aller Regel
nicht. Wer auch die Titel nicht auf dem Sperrbildschirm haben will, blendet
Benachrichtigungsinhalte am Gerät aus (siehe nächster Abschnitt).

## Was auf dem Sperrbildschirm landet

Push-Nachrichten zeigt das Handy standardmäßig an, **ohne** dass es entsperrt
werden muss. Der Text ist damit für jeden lesbar, der das Gerät sieht — und ein
Tagesplan verrät, wo jemand ist und wann er nicht zu Hause ist.

Deshalb gilt `"diskretePush": true` als Voreinstellung (auch, wenn das Feld
ganz fehlt): Die Kurzfassung nennt nur Uhrzeit und Titel, **nicht** `ort` und
`hinweis`.

```
Kurzfassung (Push):    In 1 h 25 min: Sport um 18:00.
Langfassung (Sitzung): 18:00–19:30  Sport (Sporthalle Nordstadt)
```

Mit `"diskretePush": false` stehen Orte wieder in der Push-Nachricht. Zusätzlich
lohnt sich am Gerät selbst die Einstellung, Benachrichtigungsinhalte erst nach
dem Entsperren anzuzeigen (iOS: *Mitteilungen → Vorschauen zeigen → Wenn
entsperrt*; Android: *Benachrichtigungen auf dem Sperrbildschirm → Sensible
Inhalte ausblenden*).

Dieses Repository ist **privat** und enthält persönliche Termindaten. Es sollte
privat bleiben und keine Mitarbeitenden bekommen, die den Plan nicht sehen
sollen.

## Zeitzonen und Sommerzeit

Der Agent läuft in einem UTC-Container, der Plan gilt in `Europe/Berlin`. Alle
Zeiten werden deshalb über `Intl` in die Planzeitzone aufgelöst und nie aus der
Systemzeit abgeleitet.

Praktische Folge: Die Routine feuert stündlich nach UTC-Zeitplan, aber
*entscheiden* tut die Ortszeit. Die Briefing-Stunde liegt dadurch im Sommer wie
im Winter auf `briefingZeit` – die Zeitumstellung muss nicht nachgepflegt
werden. Zwei Tests sichern das ab (`CEST` und `CET`).

## Tests

```bash
npm test
```

Schwerpunkt der 84 Tests: Zeitzonenumrechnung, Datumswechsel über Mitternacht,
Sortierung von Wochenrhythmus und Einzelterminen, das Vorlauffenster, der
Platzhalter-Schutz und die diskrete Push-Kurzfassung.
