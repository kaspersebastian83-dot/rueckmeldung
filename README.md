# Rückmeldung (Spektron)

Formular, in dem Mitarbeiter Fehler, Auffälligkeiten, Verbesserungswünsche und Fragen zu den Büro-Apps der Suite **Spektron** (Projektzentrale, LabelKit, FotoKit, PlanKit, BelegKit, SpesenKit) aufschreiben – und eine Auswertung für den Betreuer, die sich leicht mit einer KI weiterverarbeiten lässt.

**App öffnen:** https://kaspersebastian83-dot.github.io/rueckmeldung/ · aktuelle Version **1.0.0**
(Direkt zur Auswertung: `…/rueckmeldung/#auswertung`)

Übersicht der Suite: [README der Projektzentrale](https://github.com/kaspersebastian83-dot/Projektzentrale#readme).

## Datenschutz in einem Satz

Die App läuft vollständig im Browser. **Rückmeldungen und Bilder werden nicht hochgeladen** – GitHub liefert nur den Programmcode (Content Security Policy mit `connect-src 'self'`). Gespeichert wird in einem Ordner auf dem Büro-Laufwerk.

## Für Mitarbeiter („Rückmeldung schreiben“)

1. Programm wählen, dann „Was ist es?“ (Fehler / Auffälligkeit / Verbesserungswunsch / Unklar / Hat gut geklappt).
2. Ein Satz, worum es geht, und was passiert ist oder stört. Optional: was man tun wollte, was man erwartet hat, wie sehr es stört, wie oft, Projekt, Version.
3. Optional ein Screenshot (Strg+V, hineinziehen oder Datei wählen; höchstens 3, werden auf 1800 px Breite verkleinert).
4. Pflicht: Programm, Art, Titel, „Was ist passiert“, Kürzel. Der Entwurf bleibt erhalten, wenn der Tab geschlossen wird; das Kürzel wird gemerkt.

Gespeichert wird ein Eintrag als `R-<JJJJMMTT>-<HHMMSS>-<Kürzel>.json` (plus `…_bild1.png`). Jeder Eintrag ist eine eigene Datei – so überschreibt niemand einen anderen. Ist kein Ordner erreichbar, wird der Eintrag als Datei heruntergeladen, damit nichts verloren geht.

## Speicherort

1. Ein in der App gewählter Ordner („Ordner wählen …“), sonst
2. der Archivordner der Projektzentrale (gemeinsamer Browser-Speicher `mosaik-suite`, Schlüssel `archiv`) → Unterordner **`_Rückmeldungen`**. Das funktioniert ohne Einrichtung, weil alle Apps unter `kaspersebastian83-dot.github.io` denselben Speicher teilen. Die Projektzentrale erkennt Projektordner nur nach dem Muster `JJ.Nummer …` und ignoriert `_Rückmeldungen`.

Nach einem Browserneustart fragt der Browser einmal nach „Zugriff erlauben“.

## Auswertung (Betreuer)

Reiter „Auswertung (Betreuer)“ → „Rückmeldungen laden“. Filter nach Status, Programm, Art und Stichwort; ein Klick auf eine Zeile zeigt alle Angaben samt Bildern. Status, Priorität, Gruppe und Notiz werden direkt an der Datei gespeichert (frisch lesen → nur `bearbeitung` ändern → schreiben; die Angaben der Mitarbeiter bleiben unberührt).

Status: `neu`, `rueckfrage` (Rückfrage an den Mitarbeiter), `in-arbeit`, `erledigt`, `abgelehnt`.

### Zusammenarbeit mit einer KI

1. **Für KI exportieren (.md)** (oder „In Zwischenablage“): Datei mit Hintergrund zur Suite, Repository-Tabelle, Randbedingungen, Aufgabe, Antwortformat und allen offenen Einträgen (auf Wunsch auch erledigte).
2. Die KI antwortet mit einer kurzen Übersicht und **einem JSON-Block**:
   ```json
   [{"id":"R-20261020-212700-SK","status":"in-arbeit","prioritaet":"hoch","gruppe":"Speichern","hinweis":"Vermutlich …"}]
   ```
   Erlaubte Felder: `id` (Pflicht), `status`, `prioritaet` (`hoch`/`mittel`/`niedrig`), `gruppe`, `hinweis`.
3. „Antwort der KI übernehmen“ → einfügen → **Prüfen** (zeigt unbekannte IDs und ungültige Werte) → **Übernehmen**. Der Hinweis der KI landet in `bearbeitung.ki_hinweis`, die eigene Notiz bleibt unberührt.
4. **Als CSV (Excel)** exportiert die gefilterte Liste (Semikolon, UTF-8 mit BOM).

## Dateiformat

`format: "spektron-rueckmeldung"`, `version: 1`. Felder: `id`, `erstellt`, `von`, `app`, `art`, `dringlichkeit`, `haeufigkeit`, `titel`, `was_getan`, `was_passiert`, `erwartet_oder_wunsch`, `projekt`, `app_version`, `bilder`, `umgebung` (`browser`, `fenster`, `formular`), `bearbeitung` (`status`, `prioritaet`, `gruppe`, `notiz`, `ki_hinweis`, `geaendert`). Unbekannte Dateien im Ordner werden übersprungen und gemeldet.

## Voraussetzungen

Google Chrome oder Microsoft Edge (Ordnerzugriff). Die App ist eine einzelne Datei `index.html` ohne externe Bibliotheken; sie läuft auch lokal, dann mit eigenem Ordner statt Archivordner.

## Neue Version veröffentlichen

1. In `index.html` `APP_VERSION` erhöhen (und hier die Versionsnummer anpassen).
2. Pull Request mergen; GitHub Pages veröffentlicht `main` (Settings → Pages → Branch `main`, Ordner `/`).

## Tests

```sh
npm install --no-save playwright && npx playwright install chromium
node tests/rueckmeldung-browser.cjs chromium
```

Der Browsertest bildet den Ordner im Origin Private File System nach und prüft Pflichtfelder, Entwurf, Download-Ersatz ohne Ordner, Speichern mit Bild, Auswertung, Filter, Statusänderung, KI-Export, KI-Antwort-Übernahme und CSV. GitHub führt ihn bei jedem Pull Request und Push auf `main` aus (`.github/workflows/tests.yml`, Chromium). Echte Ordnerdialoge und die Rechteabfrage nach einem Browserneustart müssen zusätzlich am Büro-Terminal einmal praktisch geprüft werden.

## Dateien

- `index.html` – die komplette App
- `tests/rueckmeldung-browser.cjs` – Browsertest
