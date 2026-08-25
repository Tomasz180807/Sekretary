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

## Abiklausur-Rotation — Start

Noch keine einzige Klausur geschrieben. Start am **Wochenende 29./30.08.2026**
mit **Englisch (P3) + Chemie (P4)**, Abitur Niedersachsen 2022, weil KW 35
Woche B ist. Mathe (P1) + Physik (P2) am Wochenende darauf.
