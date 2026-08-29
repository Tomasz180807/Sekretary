# Entscheidungen

## 2026-08-26 — Google Kalender ist die Wahrheit, kein Bot
Warum: 0 laufende Kosten, keine eigene Hardware, Erinnerungen kann der
Kalender selbst. Verworfen: Telegram-Bot (braucht Dauerbetrieb + API-Key).

## 2026-08-26 — Vorschlagsmodus: eine Rückfrage pro Planungslauf
Warum: Tomasz will Kontrolle, aber nicht 40 Rückfragen am Tag. Umstellung auf
eigenständiges Handeln folgt, sobald Vertrauen da ist.

## 2026-08-26 — Wissensbasis korrigiert A/B-Zuordnung
17.08.2026 = Woche A (nicht B, wie die alte `wochenplan.json` annahm).
Bestätigt gegen zwei WebUntis-Screenshots. Betrifft die Abiklausur-Rotation.

## 2026-08-26 — Facharbeit-Budget 6 Std./Woche, täglicher Block bis Abgabe
Ersetzt die alte Annahme von 3–4 Std./Woche. Kein Pausieren anderer Ziele im
Endspurt — Facharbeit bekommt stattdessen jeden Tag Platz.

## 2026-08-26 — Freitags-Tausch: Freistunde ↔ Abendslot
Freistunde (3./4., Fr) = Mathe-Matrizen/Physik-Olympiade.
Abendslot (~22:05) = Facharbeit (ersetzt die alte „Übungen"-Belegung).
Grund: Facharbeit hat an dem Tag sonst keinen zweiten Block nötig.

## 2026-08-26 — Toter Code gelöscht
Alter Bot, `wochenplan.json`, HTML-Wochenpläne, Importer, Tests — alle durch
Kalender+Skill+wissen/ ersetzt. Bleibt in Git-Historie abrufbar.

## 2026-08-26 — Klausurwochenenden bleiben trotz Facharbeit-Druck unverändert
Facharbeit bekommt an Klausur-Wochenenden nur 45–90 Min. statt mehr. Tomasz
hat das explizit akzeptiert, keine Umverteilung nötig.

## 2026-08-26 — Seminarfach entfällt bis zur Abgabe (28.09.)
Der Fr-7./8.-Slot (13:45–15:15) ist bis zur Abgabe kein Unterricht mehr,
sondern Facharbeit-Zeit — auch an Tagen ohne Beratungstermin. Bereits
geschriebener Kalendertermin für Fr 28.08. korrigiert (Seminarfach → Facharbeit).

## 2026-08-28 — Klausur-Rotation ueber zwei Wochenenden verschraenkt statt gebuendelt
Statt Fachpaar A+B komplett an einem Wochenende: Sa=A+B 1.Haelfte, So=C+D
1.Haelfte, Wochenende darauf A+B 2.Haelfte+Korrektur, C+D 2.Haelfte+Korrektur.
Kalender fuer 30.08. und 05.09. entsprechend getauscht (Faecher + Korrektur-
Block verschoben).

## 2026-08-28 — TIB-Fahrt Hannover verdraengt Klausur-Start auf 29.08.
Fahrt 8:00-12:00 (unsicher), danach Englisch+Chemie 1.Haelfte 12:00-17:15
statt 8:00-13:15. Facharbeit-Block und Selbstlernpfad heute gestrichen (TIB
zaehlt als Facharbeit-Recherche, Puffer-Regel deckt den Rest), Abend-Lesen
gestrichen (schon unterwegs gelesen).

## 2026-08-29 — Englisch diese Runde aus der Klausur-Rotation genommen
Lehrer korrigiert bereits echte Ferientexte — Klausur-Redundanz. Beide
Englisch-Haelften (29.08. und 05.09.) geloescht, Chemie laeuft normal weiter.
Ersatz: Selbstlernpfad o.ae., Termin offen, kein Datum vereinbart.

## 2026-08-29 — Klausur-Start um eine Woche verschoben
Ganzes Wochenende 29./30.08. klausurfrei (Fahrt+Training zogen sich, kein
Platz mehr). Neue Woche 1 = 05./06.09. (Chemie bzw. Mathe+Physik, je
1. Haelfte, Korrektur-Bloecke entfernt). Woche 2 (2. Haelfte + Korrektur)
noch nicht angelegt - folgt fuer 12./13.09., sobald gebraucht.

## 2026-08-29 — Klausur-Muster (2 Faecher/Tag, je Haelfte) bleibt fuer kommende Wochen
Heutiger Ausfall war die Ausnahme wegen der Buchausleihe (TIB) vormittags,
keine dauerhafte Reduzierung. 05./06.09. (2 Faecher/Tag, 1. Haelfte) bleibt
wie gebaut. 12./13.09. (2. Haelfte + Korrektur) weiterhin offen.

## 2026-08-29 — Laengere Leseblocks fuer "Heimsuchung" bis 09.09.
4 Bloecke gesetzt (30.08., 03.09., 05.09., 06.09.), je 60-90min, in
Luecken/Freizeit statt feste Tagesstruktur zu verdraengen. 07.-09.09. noch
nicht im Kalender gebaut - folgt mit der naechsten Wochenplanung (So 20:15).

## 2026-08-29 — Heimsuchung- und Facharbeit-Bloecke an zwei hochgeladenen
Plaenen ausgerichtet
Zwei neue Quelldokumente ersetzen die bisherige grobe Planung:
`Heimsuchung_Leseplan_und_Unterrichtsvorbereitung.md` (Leseziel-Fahrplan
25-30% bis 31.08., 60-70% bis 04.09., 100% bis 07.09., 08.09. reiner
Vorbereitungstag ohne neue Lektuere, 09.09. 20-30min Wiederholung vor
Deutsch) und `Facharbeit_Tagesplan_aufgeholt_bis_20092026.docx`
(Aufholplan mit taeglichen KRITISCH/HOCH/MITTEL/PUFFER-Aufgaben 29.08.-
28.09., feste Checkpoints, Zuerst-verschiebbar/Nie-verschieben-Listen).
Beide Inhalte vollstaendig in `wissen/heimsuchung.md` (neu) und
`wissen/facharbeit.md` (Roadmap-Abschnitt ersetzt) uebernommen. Kalender
29.08.-06.09. entsprechend nachgezogen (Zeiten/Beschreibungen der
bestehenden Termine korrigiert), 07.-09.09. neu angelegt: "Heimsuchung
lesen - fertig" (07.09., 100%-Ziel), "Facharbeit"-Block fuer die
Hauptuntersuchung inkl. Datensicherung (07.09., Uhrzeit provisorisch bis
Lehrer-Termin steht), "Heimsuchung Vorbereitungstag" (08.09., 5-Schritte-
Analyse ohne neues Lesen), "Heimsuchung Wiederholung vor Deutsch" (09.09.,
09:20-09:50, direkt vor der Deutschstunde 09:50-11:20).
