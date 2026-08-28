# Sekretary — Planungsregeln

Von Tomasz bestätigt am 25.08.2026. Ergänzt `MASTER_Wissensbasis.md`; bei
Widerspruch gilt die Wissensbasis für Fakten, diese Datei für das Verhalten
des Agenten.

## Kalender

- **Eigener Kalender „Sekretary"**, nicht der Hauptkalender.
- **Schule Fach für Fach**, nicht als ein Block — der Stundenplan liegt vor
  (`stundenplan.md`), und „Vorbereitung Folgetag" braucht die Fächer.
- **Ferien und Feiertage Niedersachsen** setzen den Schulrhythmus aus.
  Klausurtermine der Schule folgen, sobald Tomasz sie hat.
- **Stille Zeiten:** 23:00–06:45, während der Schule, während des Trainings.

## Umplanen

- Die Woche ist **flexibel planbar**. Das Raster ist die Karte, gemessen wird
  am Wochen-Soll je Ziel.
- Sagt Tomasz, dass er etwas nicht schafft, wird der Block **gekürzt oder
  gegen eine andere passende Aufgabe derselben Prioritätsebene getauscht** —
  nicht ersatzlos gestrichen und nicht stillschweigend nachgeholt.
- **Check um 22:45.** Antwort „ok" oder die Ausfälle. Keine Antwort bleibt
  ohne Annahme; er fragt nicht nach.

## Feste Abläufe

- **Training beginnt exakt eine Stunde, nachdem der Reispudding fertig ist.**
  Kein fester Startzeitpunkt — verschiebt sich der Pudding, verschiebt sich
  alles Folgende mit. Richtwert an Schultagen: Beginn gegen 17:20.
- **Trading praktisch:** direkt nach der Schule.
- **Trading Theorie:** eigener Block gegen 16:00 an trainingsfreien Tagen oder
  in zufällig aufkommender Freizeit.
- **Kein Unterarme-/Bauch-Tag**, bis Tomasz ihn ansagt.

## Prioritäten

- **Kurzer Montag (Schule bis 13:10):** die freien Stunden gehören der
  Facharbeit. Nach dem 28.09.2026 rücken KI-Kurse und Gleichrangiges nach.
- **Side Quests** (Französisch, Instrument): letzte Priorität, wenn überhaupt
  am Wochenende.
- **Abiklausur-Rotation nur P1–P4.** Geschichte (P5) ist **mündliches**
  Prüfungsfach und gehört deshalb nicht in das schriftliche Klausurtraining.

## Nicht Teil von Sekretary

Unterrichtsthemen pflegen und die Briefing-Rollen Dozent / Aufgabensteller /
Prüfer. Das ist Lernstoff, nicht Zeitplanung.

## Betriebsmodell (entschieden 25.08.2026)

Keine eigene Hardware, kein Telegram-Bot, kein API-Schlüssel, keine
laufenden Kosten:

- **Der Google Kalender ist die Wahrheit.** Was dort steht, gilt.
  `wochenplan.json` ist damit überflüssig.
- **Erinnern tut der Kalender selbst.** Das Handy meldet sich minutengenau,
  auch offline — dafür braucht es keinen laufenden Prozess.
- **Planen und Umplanen tun geplante Claude-Sitzungen**, die den Kalender
  lesen und schreiben.
- **Geredet wird in Claude**, nicht in einem eigenen Bot.

## Vorschlagsmodus

Der Agent **fragt vor jeder Änderung**, die er nicht ausdrücklich beauftragt
bekommen hat. Aber: **eine Rückfrage pro Planungslauf, nicht eine pro Termin.**
Er legt den ganzen Tag oder die ganze Woche als einen Vorschlag vor, Tomasz
antwortet einmal, dann schreibt er.

Umzustellen auf eigenständiges Handeln, sobald Tomasz sieht, dass er keinen
Mist baut. Bis dahin gilt Fragen.

## Abiklausur-Rotation — über zwei Wochenenden verschränkt

Nicht ein Fachpaar pro Wochenende (1. + 2. Hälfte am selben Wochenende) —
stattdessen abwechselnd, damit an jedem Wochenende neue Klausurluft reinkommt:

- **Wochenende 1, Sa:** Fach A + Fach B, je 1. Hälfte
- **Wochenende 1, So:** Fach C + Fach D, je 1. Hälfte
- **Wochenende 2, Sa:** Fach A + Fach B, je 2. Hälfte — danach Korrektur
- **Wochenende 2, So:** Fach C + Fach D, je 2. Hälfte — danach Korrektur
- danach beginnt der nächste Vierer-Block neu, Jahrgang einen Monat zurück

Start: **Sa 29.08.** Englisch (P3) + Chemie (P4) 1. Hälfte (A+B). **So 30.08.**
Mathe (P1) + Physik (P2) 1. Hälfte (C+D). **Sa 05.09.** Englisch + Chemie
2. Hälfte + Korrektur. **So 06.09.** Mathe + Physik 2. Hälfte + Korrektur.
Korrektur & Fehleranalyse gehört an den Tag der jeweiligen 2. Hälfte, nicht
an den der 1.

## Facharbeit bis zum 28.09.2026

Fahrplan und Inhalt stehen in `facharbeit.md`. Für die Planung gilt:

- **Budget 6 Std./Woche**, nicht die alten 3–4.
- **Fester Block jeden Tag.** Alles andere wird darum herum geplant — es wird
  nichts pauschal pausiert, auch nicht im Endspurt. Selbstlernpfad, Trading
  und Lesen laufen weiter.
- Die „Übungen"-Blöcke (Physik-Olympiade, Mathe-Matrizen) gehen bis zur
  Abgabe an die Facharbeit.
- **Seminarfach entfällt bis zur Abgabe (28.09.).** Der Stundenplan-Slot
  Fr 7./8. (13:45–15:15) ist bis dahin Facharbeit-Zeit, kein regulärer
  Unterricht — bei jeder Planung so eintragen, nicht als „Seminarfach".
- **Beratungstermin Fr 04.09. in genau diesem Slot**, 7./8. Stunde,
  13:45–15:15 — kein zusätzlicher Termin nötig, aber der Tag davor gehört
  der Vorbereitung.
- **Das Experiment findet im Unterricht statt** (Verfügungsstunde der Klasse
  des Lehrers), nicht am Wochenende. Vorbedingung: Tomasz muss den Lehrer
  fragen. Bis das geklärt ist, ist es die wichtigste offene Aufgabe.
- **Ziel: fertig bis 20.09.** Druck und Bindung am **Fr 25.09.**, Samstag
  26.09. als Reserve — sonntags hat kein Copyshop auf.
- **Abgabe Mo 28.09., spätestens 11:20.** Das ist Woche A, Schule ab 8:00.
  Abgabe **vor der ersten Stunde**, nicht in der Pause um 11:20.

### Offene Aufgaben mit Fremdabhängigkeit

Diese haben Vorlaufzeit und werden täglich erinnert, bis sie erledigt sind:
Lehrer wegen Verfügungsstunde fragen · Genehmigung der Untersuchung ·
Einverständniserklärungen/Datenschutz · Bewertungsraster besorgen.
