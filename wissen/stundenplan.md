# Stundenplan — aus den WebUntis-Screenshots gelesen

Quelle: `stundenplan/kw35-2026-08-24_woche-B.png` und
`stundenplan/kw36-2026-08-31_woche-A.png` (Konto „BuchtaTom"), abgelesen am 25.08.2026.

## Stundenraster (aus dem Screenshot, nicht aus dem Wochenplan)

| Std. | Zeit |
| --- | --- |
| 1. | 08:00–08:45 |
| 2. | 08:45–09:30 |
| 3. | 09:50–10:35 |
| 4. | 10:35–11:20 |
| 5. | 11:40–12:25 |
| 6. | 12:25–13:10 |
| 7. | 13:45–14:30 |
| 8. | 14:30–15:15 |
| 9./10. | 15:20–16:50 (nur Mi, Sport) |

Unterrichtet wird in Doppelstunden: 1./2., 3./4., 5./6., 7./8.

## Woche B — KW 35, 24.–28.08.2026

| | 1./2. | 3./4. | 5./6. | 7./8. | 9./10. |
| --- | --- | --- | --- | --- | --- |
| **Mo** | Spanisch (Mo, sn40) | Physik (Ih, PH11) | Mathe (Hg, MA14) | **Musik (Gü, mu160)** | — |
| **Di** | Mathe (Hg, MA14) | *frei* | Englisch (Ve, EN13) | Geschichte (Bc, ge18) | — |
| **Mi** | Chemie (Fm, ch15) | Deutsch (Bc, de19) | PoWi (Dv, pw17) | Physik (Ih, PH11) | Sport (Ar, sp407) |
| **Do** | **Chemie (Fm, ch15)** | Englisch (Ve, EN13) | **Geschichte (Bc, ge18)** | **Spanisch (Mo, sn40)** | — |
| **Fr** | Musik (Gü, mu160) | *frei* | **Mathe (Hg, MA14)** | Seminarfach (Wß, sf11) | — |

Am Mi, 26.08. war Deutsch (3./4.) als **entfallen** markiert.

## Woche A — KW 36, 31.08.–04.09.2026

| | 1./2. | 3./4. | 5./6. | 7./8. | 9./10. |
| --- | --- | --- | --- | --- | --- |
| **Mo** | Spanisch (Mo, sn40) | Physik (Ih, PH11) | Mathe (Hg, MA14) | **frei** | — |
| **Di** | Mathe (Hg, MA14) | *frei* | Englisch (Ve, EN13) | Geschichte (Bc, ge18) | — |
| **Mi** | Chemie (Fm, ch15) | Deutsch (Bc, de19) | PoWi (Dv, pw17) | Physik (Ih, PH11) | Sport (Ar, sp407) |
| **Do** | **Physik (Ih, PH11)** | Englisch (Ve, EN13) | **Deutsch (Bc, de19)** | **PoWi (Dv, pw17)** | — |
| **Fr** | Musik (Gü, mu160) | *frei* | **Englisch (Ve, EN13)** | Seminarfach (Wß, sf11) | — |

Beides deckt sich exakt mit der Tabelle in `MASTER_Wissensbasis.md`, Abschnitt 3.

## Tägliches Schulende

| Tag | Woche A | Woche B |
| --- | --- | --- |
| Mo | 13:10 | 15:15 |
| Di | 15:15 | 15:15 |
| Mi | 16:50 | 16:50 |
| Do | 15:15 | 15:15 |
| Fr | 15:15 | 15:15 |

## Befund: A und B sind in `wochenplan.json` vertauscht benannt

`wochenplan.json` setzt `wochenwechsel.ankerDatum = 2026-08-17`, `ankerWoche = "B"`.
Die Wissensbasis und die Screenshots sagen: **17.–21.08.2026 = Woche A**.

Die *Inhalte* stimmen trotzdem — was die Datei „A" nennt, ist die echte Woche B
(Mo Schule bis 15:15) und umgekehrt. Praktische Folge betrifft nur das, was am
Label hängt: die **Abiklausur-Rotation**. Nach Wissensbasis gehört zu Woche A
Mathe + Physik, zu Woche B Englisch + Chemie — mit der vertauschten Benennung
liegt diese Zuordnung um eine Woche versetzt.

## Weitere Befunde gegen `wochenplan.json`

- **Loch am freien Montag:** In der Variante mit Schulende 13:10 beginnt der
  Heimweg trotzdem erst um 15:15. 13:10–15:15 sind unverplant.
- **Freistunden:** liegen laut Screenshot Di und Fr in der **3./4. Stunde**
  (09:50–11:20), nicht in der 2. Stunde, wie der Hinweistext im Plan sagt.
- **Geschichte (P5)** ist Prüfungsfach, kommt in der Abiklausur-Rotation
  (P1 Mathe, P2 Physik, P3 Englisch, P4 Chemie) aber nicht vor.
- **Side Quests** (Französisch, Gitarre/Keyboard) stehen in der Wissensbasis am
  Wochenende 14:00–15:00, fehlen im aktuellen `wochenplan.json` ganz.
- **Trainingsbeginn:** Wissensbasis ca. 17:20 an Schultagen, `wochenplan.json` 17:45.
