# Testergebnisse (Version 2.1.0, Fokus-Update)

Stand: 2026-11-10 07:35 UTC. Echte Ausgaben aus der Build-Umgebung (Node 22, Chromium/Playwright, Android SDK 35, Gradle 8.14.3). Wiederholbar mit `tests/run-all.sh`.

| Ebene | Wie getestet | Ergebnis |
|---|---|---|
| Planer, Packreihenfolge, Regeln, Migration | 37 Unit-Tests (`tests/unit.js`) | alle bestanden |
| Abnahme-Ablauf v1: Assistent → Packliste → Fach → Packen → Notfallpass/QR | 47 Prüfungen in Chromium, Handyformat 400×860 (`tests/flow.js`) | alle bestanden |
| Daten: Migration von 2.0, Backup/Restore, PIN, Notfallpass ohne Entsperren | 29 Prüfungen (`tests/data.js`) | alle bestanden |
| Schnittstelle zu Android | 19 Prüfungen gegen eine **Attrappe** (`tests/native-sim.js`) | alle bestanden |
| Zufallstest | 3 Läufe × ca. 330 Aktionen | keine JS-Fehler |
| Java-Teil (Keystore, Biometrie, Benachrichtigungen, Kamera, Drucken) | **nur kompiliert**, APK signiert | **nicht auf einem Gerät ausgeführt** |

**QR-Code:** Der erzeugte Code wurde im Test als Bild aufgenommen und mit einem unabhängigen Standard-Decoder (jsQR) gelesen; der Inhalt stimmt mit der Vorschau überein, Umlaute eingeschlossen. Ein Scan mit einer echten Handykamera und der Ausdruck als PDF stehen noch aus (siehe [Geräte-Checkliste](GERAETETEST-CHECKLISTE.md)). Die Online-Variante (Webseite) gibt es nicht, es gibt also keinen Online-Fall zu testen.

**Tablet-Layout (1100×820)** und **helles Farbschema** wurden per Screenshot gesichtet (`tests/shots.js`); dabei wurde die im hellen Schema unleserliche Fachbeschriftung behoben. Automatische Prüfungen laufen nur im Handyformat, dunkel.

## 1. Unit-Tests
```
OK   Altersgruppen
OK   Wasserbedarf: Erwachsene 2 l, Kleinkind 1,2 l, Baby 0,8 l
OK   Energiebedarf nach Alter (Schätzwerte)
OK   Tragfähigkeit: Erwachsene 12 kg, Kind (3 J.) 0 kg, Kind (8 J.) 2 kg, Mobilitätseinschränkung halbiert
OK   Hausvorrat: 3 Personen, 10 Tage → Wasserbedarf = Summe × Tage
OK   Lebensmittel nach BBK-Verhältnis: Getreide ~3,5 kg/10 Tage/Person (skaliert)
OK   Ohne angelegte Zuhause-Kiste wird kein Hausvorrat geplant
OK   Auto-Notfalltasche: eigene Tasche, Pflichtteile darin, kein Personen-Rucksack
OK   Packanleitung: unten → Hauptfach (schwer zuerst) → oben/außen; Medikamente erst bei Abreise
OK   72-h-Rucksack: je tragfähiger Person ein Rucksack, Kleinkind trägt keinen
OK   Kind-Ausrüstung (Wechselkleidung, Kennzeichnung) wird von Erwachsenem getragen
OK   Baby: Windeln, Säuglingsnahrung, Fläschchen werden geplant
OK   Medikamente, Geräte, Allergien erzeugen notwendige Positionen für die Person
OK   Haustier: Transportbox, Futter, Impfpass werden geplant
OK   Plan ist idempotent (zweiter Lauf erzeugt keine Dubletten)
OK   Vorhandenes Inventar wird übernommen statt doppelt geplant
OK   Rucksack-Statistik: Gewicht, Überlast-Warnung, Volumen
OK   Wichtige Gegenstände werden bei vollem Rucksack nicht gestrichen
OK   Lastverteilung schlägt Verschiebungen vor und verbessert die Balance
OK   Empfehlung: Lampe ohne Batterien
OK   Empfehlung: Wasserfilter ohne Transportbehälter / ohne Aufbereitung
OK   Empfehlung: Kocher ohne Kochgeschirr/Brennstoff
OK   Empfehlung: zwei Schlafsäcke für drei Personen
OK   Empfehlung: Wechselkleidung für Kind fehlt
OK   Empfehlung: Lebensmittel reichen rechnerisch nicht
OK   Empfehlung: Haustier ohne Transportmöglichkeit
OK   Empfehlung: Medikament läuft bald ab
OK   Jede Empfehlung hat Begründung, Stufe und Quelle
OK   Bereits auf Einkaufsliste → keine doppelte Empfehlung
OK   Reichweite: Wasser/Lebensmittel nur aus bestätigten Positionen
OK   Doppelkauf-Erkennung (Ähnlichkeit, Plural)
OK   Beispielhaushalt: 2 Erw. + Kind, 54 l Wasser, zwei Rucksäcke (55 L / 40 L)
OK   Beispieldaten enthalten keine persönlichen Daten
OK   Alte Version: Import in Haushalt
OK   Ablauf-Benachrichtigungen: Zeitpunkte pro Gegenstand (Vorlauf, 7 Tage, Ablauf)
OK   Migration v3 → v4: Daten bleiben, Personen bekommen Pass-Felder (alles privat), Kiste nur bei vorhandenem Vorrat
OK   Alter aus Geburtsdatum

37 bestanden, 0 fehlgeschlagen
```
## 2. Abnahme-Ablauf (`tests/flow.js`)
```
OK   Erster Start: Packassistent mit einer Frage 
OK   Antwortkarte springt direkt zur nächsten Frage 
OK   Tasche im Assistenten angelegt, Assistent bleibt offen 
OK   Packliste erzeugt (ohne Hausvorrat), Medikament „erst bei Abreise“, Tier berücksichtigt, eigene Tasche zugeordnet {"items":67,"bags":1,"home":0,"med":true,"pet":true,"bagOwner":true}
OK   Packliste: kein Fehler/Markup im Text 
OK   Vorhanden/Fehlt markiert, Einkaufsliste gefüllt 
OK   Start: kein Fehler/Markup im Text 
OK   Start zeigt Tasche mit „X von Y gepackt“, Neue Tasche, Packliste, Notfallpass, Kontrolle 
OK   Kein Bereitschafts-Score auf dem Start 
OK   Tasche: kein Fehler/Markup im Text 
OK   2D-Fachansicht: Fach antippen wählt aus 
OK   Gegenstand einem eigenen Fach zugewiesen 
OK   3D ist optional zuschaltbar 
OK   Packen: kein Fehler/Markup im Text 
OK   Packreihenfolge: unten → Hauptfach (schwer zuerst) → oben/außen main>main>main>main>main>main>main>innen>top>front>sideL>sideR
OK   „Eingepackt“ hakt ab, „Später“ überspringt 
OK   Am Ende: „Fertig gepackt“, Liste „Erst bei Abreise“, Hinweis auf Fehlendes 
OK   Was fehlt: kein Fehler/Markup im Text 
OK   „Was fehlt?“ listet offene Teile 
OK   Packliste druckbar mit Fachbelegung 
OK   Pass-Übersicht: kein Fehler/Markup im Text 
OK   Profil speichert automatisch (Geburtsdatum → Alter, Rolle, Krankheit) 
OK   Bis zu drei priorisierte Kontakte; danach kein weiterer wählbar 
OK   Reihenfolge änderbar 
OK   Standard: Gesundheitsdaten privat – QR enthält nur Name und Kontakte NOTFALLPASS | Mia (Kind) | Kontakt 1: Anna (Mama) 0170 1111111 | Kontakt 2: Oma Erna (Oma) 030 333333 | Kontakt 3: Ben (Papa) 0170 2222222
OK   Nach ausdrücklicher Freigabe erscheint nur das freigegebene Feld 
OK   Notfallpass: kein Fehler/Markup im Text 
OK   Warnhinweis „jeder kann das lesen“ + Hinweis Android-Notfallinfos 
OK   QR-Code ist mit Standard-Decoder lesbar und enthält genau den Vorschautext (Umlaute korrekt) Mia (Kind)
OK   Druckkarte: Name, 3 Kontakte, QR, freigegebene Angabe – keine privaten Daten 
OK   Notfall: kein Fehler/Markup im Text 
OK   Notfallmodus: 112, Pässe mit Kontakten, Lagerort der Tasche, keine privaten Daten 
OK   #/bags: kein Fehler/Markup im Text 
OK   #/review: kein Fehler/Markup im Text 
OK   #/more: kein Fehler/Markup im Text 
OK   #/shop: kein Fehler/Markup im Text 
OK   #/remind: kein Fehler/Markup im Text 
OK   #/places: kein Fehler/Markup im Text 
OK   #/items: kein Fehler/Markup im Text 
OK   #/stock: kein Fehler/Markup im Text 
OK   #/recs: kein Fehler/Markup im Text 
OK   #/settings: kein Fehler/Markup im Text 
OK   #/sources: kein Fehler/Markup im Text 
OK   #/households: kein Fehler/Markup im Text 
OK   Gestrichene Bereiche nicht mehr in der Navigation (Schutzräume, Benutzerverwaltung, Safe, Aufgaben) 
OK   Notfallkiste ist optional und erzeugt erst nach Anlegen Vorratsvorschläge 
OK   Nach Neustart alles da (Tasche, Pass, Kontakte) 
Konsolenfehler: keine
```
## 3. Daten, Migration, Backup, Sperre (`tests/data.js`)
```
OK   Migration: alter Stand wird vorher unverändert gesichert (db_vor_v4) 
OK   Migration: Tasche, Fächer, Gegenstand samt Notiz/Fach/Packstatus bleiben {"v":4,"backup":true,"backupIsOld":3,"name":"Altbestand","bag":"Alter Rucksack","comps":2,"note":"Batterien im Deckel","packed":true,"comp":"c2","water":54,"box":true,"rooms":1,"tasks":1,"contact":"Oma Erna","meet":"Spielplatz","allergy":"Pollen","med":"Ramipril","shared":false,"hash":"#/home"}
OK   Migration: Personen/Gesundheit/Kontakte/Treffpunkte bleiben; nichts automatisch freigegeben 
OK   Migration: vorhandener Hausvorrat erscheint als Notfallkiste; gestrichene Bereiche bleiben als Daten erhalten 
OK   Migration: Start ohne erzwungenen Assistenten 
OK   Startseite zeigt die alte Tasche 
OK   Notfallkiste zeigt alten Wasservorrat 
OK   Assistent schließen führt zum Start (kein Zwang) 
OK   Zwischenstand bleibt nach Neustart (Antworten und Schritt) 
OK   Fehlendes Alter: kurzer Hinweis statt Weiter 
OK   Ohne eigene Tasche wird ein Rucksack vorgeschlagen; „draußen unterwegs“ plant Tarp; 48 h → 2 Tagesrationen {"bags":1,"sug":true,"tarp":true,"days":2,"home":0}
OK   Zweiter Durchlauf „Auto“ ergänzt eine Auto-Notfalltasche, die erste Packliste bleibt {"bags":2,"car":true,"tri":true,"keep":true}
OK   Eigener Gegenstand: Tasche vorbelegt, Fach automatisch, Notiz, „erst bei Abreise“ 
OK   Notiz auf der Detailseite änderbar 
OK   „Fehlt“ → Einkaufsliste → „Gekauft“ übernimmt als vorhanden 
OK   Tasche kopieren: eigene Fächer und Inhalte, Original unverändert {"bags":3,"name":"Notfallrucksack Erwachsene/r 1 (Kopie)","items":43,"src":43,"compsDistinct":true,"newId":"94440776c8904d96"}
OK   Tasche löschen behält die Gegenstände (kein Datenverlust) 
OK   Backup ist verschlüsselt (kein Klartext von Namen/Gesundheit/Kontakten) 16830 Bytes
OK   „Alle Daten löschen“ leert alles 
OK   Falsches Backup-Passwort ändert nichts 
OK   Wiederherstellung bringt alles zurück (Taschen, Gegenstände, Pass, Freigaben, Kontakte) {"i":97,"b":2,"s":1} / {"i":97,"b":2,"s":1}
OK   Zu einfache PIN wird abgelehnt 
OK   PIN gesetzt (nur als Hash gespeichert) 
OK   Falsche PIN bleibt gesperrt 
OK   Ohne Entsperren: Notruf, Kontakt und NUR freigegebene Angaben (Allergie ja, Krankheit nein) 
OK   Ohne Entsperren keine Navigation in andere Bereiche 
OK   Direktaufruf des Profils führt zurück zur Sperre 
OK   Richtige PIN entsperrt 
OK   Sperre lässt sich wieder ausschalten 
Konsolenfehler: keine
```
## 4. Schnittstelle mit Attrappe (`tests/native-sim.js`)
```
OK   Native erkannt (kein Browser-Hinweis) 
OK   setBars beim Start (ARGB Int32, Icons) 
OK   Datenbank liegt im nativen (Keystore-)Speicher unter „db“ 
OK   Keine Daten im WebView-localStorage/IndexedDB 
OK   Benachrichtigungen: Berechtigung angefragt + Termine geplant 
OK   Termine haben id/at/title/text, at in Millisekunden 6 Termine
OK   Benachrichtigungstexte enthalten keine Gesundheitsdaten 
OK   Ausschalten leert alle geplanten Alarme 
OK   FLAG_SECURE-Schalter ruft setSecure(true) 
OK   Kamera-Foto landet als Foto am Gegenstand (verschlüsselter Speicher) 
OK   Biometrie: bioEnroll(alias=vault) 
OK   Safe lässt sich per Biometrie entsperren 
OK   Safe-Datenbestand im nativen Speicher nur verschlüsselt (vault_*) 
OK   Safe bleibt entsperrt, während Kamera/Dateiauswahl geöffnet ist 
OK   Safe sperrt beim Verlassen der App 
OK   Backup nutzt saveDownload(.nfbak) Notfall-Backup-20261110-0732.nfbak
OK   Notfallkarte nutzt printHtml (mit QR als SVG) 
OK   Kontakt-Schnellwahl öffnet Wählansicht 
OK   Notruf-Button öffnet nur die Wählansicht (dial("112")) 
Konsolenfehler: keine
```
## 5. Zufallstest
```
Seed 31: 327 Aktionen, Konsolenfehler: 0, Fehlerseite: false
Seed 32: 328 Aktionen, Konsolenfehler: 0, Fehlerseite: false
Seed 33: 334 Aktionen, Konsolenfehler: 0, Fehlerseite: false
```
