# Sekretary

Ein kleiner Sekretariats-Agent für den persönlichen Wochenplan:

- **Tagesbriefing** – einmal am Nachmittag eine Zusammenfassung dessen, was heute noch ansteht.
- **Erinnerung an die nächste Aufgabe** – stündlich, aber nur dann, wenn wirklich etwas ansteht.

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
```

Nützliche Optionen:

| Option | Bedeutung |
| --- | --- |
| `--jetzt <ISO>` | Zeitpunkt simulieren, z. B. `--jetzt 2026-08-17T13:05:00Z` |
| `--plan <Pfad>` | anderen Wochenplan verwenden |
| `--kurz` | nur die Kurzfassung (< 200 Zeichen, für die Push-Nachricht) |

Über npm: `npm start`, `npm run heute`, `npm run briefing`, `npm run naechste`, `npm test`.

## Exit-Codes

Die Routine wertet den Exit-Code aus, damit sie nicht ohne Anlass benachrichtigt.

| Code | Bedeutung |
| --- | --- |
| `0` | Es gibt etwas zu melden – der Text steht auf stdout. |
| `3` | Bewusst still: gerade steht nichts an. |
| `4` | Der Wochenplan ist noch als Platzhalter markiert. |
| `1` | Fehler, z. B. kaputtes JSON – Meldung auf stderr. |

## Den eigenen Plan eintragen

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

Schwerpunkt der 23 Tests: Zeitzonenumrechnung, Datumswechsel über Mitternacht,
Sortierung von Wochenrhythmus und Einzelterminen, das Vorlauffenster, der
Platzhalter-Schutz und die diskrete Push-Kurzfassung.
