# Sekretary

Persönlicher Tagesplanungs-Assistent. Plant im Google Kalender „Sekretary",
nicht in einer lokalen Datei — kein Bot, kein Server, keine laufenden Kosten.

## Wie es funktioniert

- **`wissen/`** ist die Wahrheit: Profil, Ziele, Stundenplan, Facharbeit-Fahrplan
  und die Regeln, nach denen der Agent plant.
- **`.claude/skills/sekretary/SKILL.md`** ist die Betriebsanleitung, die jede
  geplante Sitzung zuerst liest.
- **`woche.mjs`** beantwortet, ob eine Woche A oder B ist, und den
  Schulschluss an einem Tag — `node woche.mjs 2026-09-28`, `--test` prüft es
  gegen die abgelesenen Stundenplan-Screenshots.
- Zwei **Routinen** lösen den Agenten aus: Wochenplanung sonntags 20:15,
  Tagescheck täglich 22:45. Beide lesen und schreiben über den
  Google-Calendar-Connector.

Näheres steht in `CLAUDE.md` und `wissen/sekretary-regeln.md`.
