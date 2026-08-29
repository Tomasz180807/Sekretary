# Sekretary — Arbeitsregeln

**Quelle der Wahrheit ist `wissen/MASTER_Wissensbasis.md`.** Widerspricht etwas
anderes, gilt diese Datei. Ergänzend: `wissen/stundenplan.md` (aus den
WebUntis-Screenshots abgelesen), `wissen/facharbeit.md` (Fahrplan bis
28.09.2026) und `wissen/sekretary-regeln.md` (wie sich der Agent verhält).

**Der Google Kalender „Sekretary" ist die Wahrheit für den Tagesplan**, nicht
eine Datei im Repo. Geplant wird durch den Skill `sekretary`
(`.claude/skills/sekretary/SKILL.md`), ausgelöst durch zwei geplante Routinen
(Wochenplanung sonntags, Tagescheck täglich). `woche.mjs` beantwortet, ob eine
Woche A oder B ist — das nie im Kopf ausrechnen, das war schon einmal falsch.

**Das Gemini Notebook liest die Dateien aus `wissen/` direkt**, je eine als
Website-Quelle über ihre raw-Adresse auf `main`; Näheres im Skill `notebook`
(`.claude/skills/notebook/SKILL.md`). Änderst du eine dieser Dateien, sag im
selben Lauf dazu, dass Tomasz die Quelle im Notebook nachladen muss, sobald die
Änderung in `main` ist — später sagt es ihm niemand mehr. Weil das Repo öffentlich ist,
gehört nichts Geheimes in `wissen/`.

Frühere HTML-Wochenpläne, `wochenplan.json` und der alte Telegram-Bot-Ansatz
sind aus dem Repo entfernt (siehe Commit „Toten Bestand entfernt") — im
Git-Verlauf stehen sie weiter.
