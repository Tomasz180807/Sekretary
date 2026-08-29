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

**Das Gemini Notebook hängt am Repo, nicht umgekehrt.** `notebook.mjs` baut
aus `wissen/` den Export `notebook/wissensstand.md`, den das Notebook als
Website-Quelle liest; den Rest regelt der Skill `notebook`
(`.claude/skills/notebook/SKILL.md`). Der Export ist erzeugt — geändert wird
`wissen/`, nie `notebook/`. Weil das Repo öffentlich ist, gehört nichts
Geheimes hinein.

Frühere HTML-Wochenpläne, `wochenplan.json` und der alte Telegram-Bot-Ansatz
sind aus der Historie entfernt (siehe Commit „Toten Bestand entfernt").
