# Sekretary — Projektstand

## Was das Projekt ist

Persönlicher Tagesplanungs-Assistent für Tomasz (18, Q2 Niedersachsen, Abitur
Frühjahr 2027). Plant im Google Kalender „Sekretary", nicht in einer Datei.
Kein Bot, kein Server, keine laufenden Kosten.

## Architektur (Stand 26.08.2026)

- `wissen/` — Wahrheit: Profil, Ziele, Stundenplan, Facharbeit-Fahrplan, Regeln
- `.claude/skills/sekretary/SKILL.md` — Betriebsanleitung für jede Sitzung
- `woche.mjs` — A/B-Woche + Schulschluss, rechnet in Europe/Berlin, `--test` prüft gegen Screenshots
- Zwei Routinen: Wochenplanung (So 20:15), Tagescheck (täglich 22:45), beide mit Google-Calendar-Connector
- Alter Bestand (Bot, HTML-Wochenpläne, `wochenplan.json`) gelöscht, in Git-Historie erhalten

## Aktueller Zustand

Kalender „Sekretary" ist ab Do 27.08. bis So 06.09.2026 vollständig befüllt
(130 Termine, erster Vorschlag, von Tomasz durchgesehen und mit vier
Korrekturen bestätigt). Das war ein einmaliger manueller Anstoß, ab jetzt
übernehmen die Routinen.

## Harte Eckdaten

- Facharbeit-Abgabe: **28.09.2026, vor der ersten Stunde** (Schule ab 8:00)
- Beratungstermin: **Fr 04.09., 13:45–15:15**, im Seminarfach
- Abiklausur-Start: **29./30.08. Englisch+Chemie**, dann **05./06.09. Mathe+Physik**
- A/B-Anker: **17.08.2026 = Woche A** (war in der alten `wochenplan.json` vertauscht)

## Offen

- Klausurtraining ab 12.09. voraussichtlich zugunsten der Facharbeit ausgesetzt
  (noch nicht verbindlich entschieden, siehe decisions.md)
- WebUntis-ICS-Abo: nicht verfügbar, nur Untis-Mobile-Kopplungsschlüssel gefunden
- Ferientermine Niedersachsen: noch nicht eingetragen
