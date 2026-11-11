# Umgesetzte Funktionen (Version 3.3.0)

Legende: ✅ umgesetzt und im Browser getestet · 📱 braucht Android-Code, nicht auf Gerät geprüft · 🟡 mit Einschränkung · ⬜ offen. Was gestrichen oder verschoben wurde, steht in der [Feature-Matrix](FEATURE-MATRIX.md).

## Erster Start: Haushalt anlegen, dann Rucksäcke ✅
Beim ersten Öffnen: **Begrüßung → Erlaubnisse 📱 (Benachrichtigungen, pünktliche Alarme, Standort, Kamera – jeweils mit kurzem Grund, alles freiwillig) → Haushalt (Standort; Adresse und Wohnlage auf Wunsch aus dem Standort 📱) → Anzahl Personen per Schieberegler oder −/+ (bis 30) mit Altersgruppe → jede Person einzeln (Geburtsdatum ergibt das Alter, Personenstand ab 16) → Übersicht „Alle Personen“ mit Bearbeiten → Tiere → Notfallkontakte (auch aus dem Telefonbuch 📱) → Treffpunkte (nah / außerhalb; „Ich bin hier“ speichert die Position; „In der Nähe suchen“ findet z. B. den nächsten Sportplatz 📱) → Notfallpass (nur eingetragene Angaben zum Anhaken, nichts vorausgewählt) → Übersicht „Haushalt angelegt“**. Danach direkt **Rucksäcke & Taschen: Zweck → Dauer → Unterkunft → Wer trägt was → Packliste**. Beides lässt sich unterbrechen und später fortsetzen; unter „Mehr“ jederzeit „Haushalt, Personen & Tiere“ bearbeiten (Packlisten passen sich an) und „Rucksäcke & Taschen neu planen“.
- Haushalt: Name, Adresse/Ort, Standort per GPS 📱 (freiwillig, nur auf Knopfdruck, wird nicht gesendet), Wohnsituation (Wohnung/Haus/Land; „Land“ macht Wasserfilter Pflicht und schlägt Solar-Ladegerät vor).
- Personen: erst Liste (Erwachsene/Kinder), dann je Person ein Schritt mit Foto 📱, Name, Alter oder Geburtsdatum, Geschlecht, Gewicht, Größe, Fitness, Blutgruppe, Allergien, Vorerkrankungen, Medikamenten, Hilfsmitteln, Einschränkung beim Gehen/Tragen. Live berechnet: Kalorien (Mifflin-St Jeor × Aktivität, sonst Richtwert nach Alter), Wasser, Traglast (15–25 % des Körpergewichts, max. 20 kg). Die Packliste nutzt dieselben Werte.
- Tiere: je Tier Art, Name, Anzahl (Hund mit Gewicht für die Wassermenge).
- Rucksäcke: „Wer trägt welchen Rucksack?“ – je Person eine Zeile, passend zum Alter vorausgewählt (Kind unter 6: keinen), mit einem Tipp änderbar; vorhandene Taschen wählbar; optional gemeinsame Familientasche.

## Packen Rucksack für Rucksack ✅
- Packliste: bei mehreren Taschen zuerst „Welchen Rucksack packst du?“, dann dessen Kategorien (Allgemein, Medikamente & Erste Hilfe, Kleidung, Werkzeug, Feuer & Kochen, Wasser, Nahrung, Technik/Akkus/Licht, Hygiene, Schlafen, Dokumente & Geld; Kind/Haustier/Auto nur wenn passend). „Weiter“ führt durch alle Kategorien und dann zum nächsten Rucksack.
- In der Kategorie: Gewicht und Füllstand des Rucksacks oben (Balken, „zu schwer“), Vorschläge abhaken, Menge mit − / + ändern (Gewicht je Zeile), in andere Tasche verschieben, weitere Sachen mit + direkt in diesen Rucksack, Foto je Gegenstand 📱, eigener Gegenstand.
- Lupe: suchen und direkt hinzufügen (in den gewählten Rucksack). „Einzeln abfragen“ je Rucksack. „Fertig“: nicht Abgehaktes nach Rückfrage auf die Einkaufsliste.

## Startseite ✅
Übersicht ohne Bedienkacheln: vorhanden/gepackt/fehlt (Stückzahlen), wichtige fehlende Sachen, zu schwere Rucksäcke, Termine (Rucksackkontrolle zuerst, Probealarm, Ablaufdaten), Haushalt mit Tagesbedarf (kcal, Wasser, Menge für die Packdauer), Hinweis bei fehlendem Notfallkontakt, Treffpunkte mit Luftlinie vom Zuhause, Notrufnummern zum Antippen. Taschen stehen nur unter „Taschen“.

## 1 Meine Taschen ✅
- Beliebig viele Rucksäcke, Taschen, Koffer; 9 Typen; Name, Foto 📱, Volumen, Gewicht, Besitzer, fester Lagerort, Verwendung, Packstatus.
- Fächer frei anlegen, umbenennen, verschieben, entfernen; jeder Gegenstand hat ein Fach.
- Tasche bearbeiten und löschen direkt oben auf der Taschenseite (Stift- und Papierkorb-Knopf); löschen nur nach Rückfrage, Gegenstände bleiben erhalten und kommen nach „Zuhause“. Tasche kopieren.
- 2D-Fachansicht zum Antippen als Basis, 3D-Ansicht optional.
- Gewichts- und Volumenwarnung; Angaben als „ca.“, wenn Maße fehlen. Nichts wird automatisch gestrichen.

## 2 Packassistent ✅
- Eine Frage pro Schritt mit großen Antwortkarten: Zweck (Notfallrucksack, Reise-Notfall, Auto, eigener Zweck), Dauer, Unterkunft, Personen/Alter, Tiere, Medikamente/Hilfsmittel (freiwillig), vorhandene Ausstattung, Taschen.
- Antworten werden automatisch gespeichert; schließen und später fortsetzen.
- Ergebnis: editierbare Packliste. Je Position Menge, vorhanden/fehlt, dauerhaft eingepackt oder erst bei Abreise, Gewicht, Foto 📱, Ablaufdatum, Notiz, Fach.
- Fehlendes kommt auf eine kleine Einkaufsliste; „Gekauft“ übernimmt es als vorhanden. Doppelkauf-Hinweis.
- Kein Hausinventar nötig.

## 3 Packanleitung ✅
- Schrittweise Reihenfolge: leichte, selten gebrauchte Dinge unten; schwere körpernah im Hauptfach (schwerste zuerst); Schnellzugriff oben und außen; Seiten zum Ausgleich.
- Erste Hilfe, Regen-/Wärmeschutz, Wasser, Papiere landen in gut erreichbaren Fächern; Medikamente und Hilfsmittel stehen unter „Erst bei Abreise“.
- Jeder Schritt zeigt das Zielfach in der Fachansicht; Fach änderbar, „Später“ zum Überspringen, „Neu packen“.
- Hinweis bei seitlich ungleicher Last.
- 🟡 „Nichts außen baumeln lassen“ wird nicht geprüft – die App kennt keine Außenbefestigung einzelner Gegenstände.

## 4 Notfallkontakte & Pässe ✅
- Je Person: Name, Geburtsdatum, Rolle, Foto 📱, Allergien mit Reaktion, Krankheiten, Medikamente (Dosierung, Zweck, Einnahme, Aufbewahrung, Notfallmedikament), Hilfsmittel, Blutgruppe, Arzt/Ärztin, Abholberechtigte/Betreuung, Hinweise, Organspende-Angabe (ersetzt keinen Ausweis), eigene Felder, „bestätigt von“ und Stand.
- Baukasten: nicht benötigte Felder ausblenden; ausgeblendete Felder bleiben auch bei Freigabe verborgen.
- **Jedes Feld ist privat, bis es einzeln freigegeben wird.**
- Bis zu drei priorisierte Kontakte je Person mit Beziehung, Telefon, Foto 📱; Reihenfolge änderbar; Schnellwahl öffnet die Wählansicht 📱.
- Notfallpass-Ansicht zeigt nur Freigegebenes; auch ohne Entsperren erreichbar (abschaltbar).
- QR-Code Variante A: freigegebene Angaben als Text direkt im Code, ohne App und ohne Internet lesbar; Vorschau „das kann jeder lesen“.
- Kartendesigner: Module wählen und ordnen, Vorder-/Rückseite, Scheckkarte oder A6, Deutsch/Englisch, Live-Vorschau, vor dem Druck Liste aller sichtbaren Angaben; Druck/PDF 📱.
- Hinweis auf die Android-Notfallinfos.
- ⬜ QR Variante B (Webseite mit Fotos): braucht Server – siehe [Online-Architektur](ONLINE-ARCHITEKTUR.md).

## Zusätzlich, schlank
- ✅ Erinnerungen: Packkontrolle, Powerbanks, Batterien, Kinderkleidung, Medikamente, Ablaufdaten, eigene Termine; 📱 Benachrichtigung auch bei geschlossener App.
- ✅ Optionale Notfallkiste zu Hause: erst nach „Kiste anlegen“; Mengen, MHD oder Verbrauchsdatum (MHD überschritten = „prüfen“, nicht „verdorben“), älteste Charge „zuerst verbrauchen“.
- ✅ Offline-Karten: Gebiet um einen Ort oder sichtbaren Ausschnitt herunterladen 📱 (eigener Kartenserver mit Offline-Erlaubnis, Bestätigung der Bedingungen, Schätzung vorab, Abbruch), MBTiles-Datei importieren 📱, Anzeige ohne Internet, Treffpunkte und Unterkünfte als Markierungen, Position per Tippen oder Koordinaten. Kein Routing.
- ✅ QR-Etikett für Taschen: Inhalt als Text, mit jeder Kamera lesbar, ohne Gesundheitsdaten.
- ✅ Packliste mit Fachbelegung drucken 📱; verschlüsseltes Backup mit geprüfter Wiederherstellung; CSV-Export.
- ✅ Mehrere Personenprofile; mehrere Haushalte unter Einstellungen. ⬜ Synchronisierung zwischen Handys.
- ✅ App-Sperre mit einer PIN, 📱 optional Biometrie.
- ✅ Probealarm: Datum und Uhrzeit, einmalig oder wiederkehrend, 9 Übungslagen; 📱 Benachrichtigung „TESTALARM – KEINE ECHTE GEFAHR“ mit Alarmton und Vibration auch bei geschlossener App, genaue Uhrzeit wenn erlaubt; Antippen öffnet die Notfallansicht mit der Übung; Auswertung (ausgelöst, geöffnet, gehört, geprüft – sonst „nicht geprüft“).
- ✅ Notfall-Schnellübersicht: ein System für Notfall-Knopf und Probealarm; Lage wählen → kurze eigene Checkliste (klar getrennt von amtlichen Anweisungen, Links zu warnung.bund.de und bbk.bund.de), Taschen mit Lagerort und Hinweis „bereithalten / bei sicherer Evakuierung mitnehmen / nicht danach suchen“, „Bei Abreise mitnehmen“.
- ⬜ Amtliche Warnungen per Push: braucht Server – siehe [Online-Architektur](ONLINE-ARCHITEKTUR.md).

## Design
Mobile First, dunkler Glas-Look, große untereinander angeordnete Karten, Hauptaktionen unten im Daumenbereich, Navigation mit fünf Punkten (Start, Taschen, Packliste, Notfallpass, Mehr). Erklärtexte entfernt; Hinweise nur bei Fehlern, Risiken und Datenschutz.

- Karte: „In der Nähe suchen“ legt einen gefundenen Ort direkt als Treffpunkt an (weiter als 2 km → „außerhalb“) 📱.

## Was fehlt? ✅
Alles Fehlende aus allen Rucksäcken zusammengefasst (z. B. „3 Stück · Lars, Kyara, Adam“), sortiert nach „Zuerst besorgen“, „Sinnvoll“, „Wenn Platz ist“ (eingeklappt). Je Zeile „Habe ich“ oder „Kaufen“ (→ Einkaufsliste), oben „Alles Wichtige kaufen“. Die Startseite zeigt die ersten vier mit Knopf dorthin.

## Notfall-Bildschirm ✅
Aufgeräumt: 112 als großer Knopf, weitere Nummern klein daneben, Lagen als Raster, Kontakte nur einmal (auch wenn sie bei mehreren Personen eingetragen sind), Personen kompakt mit den freigegebenen Angaben, Taschen eine Zeile je Tasche, „Bei Abreise mitnehmen“ einmal für alle, Treffpunkte mit Karte.

## Einkaufsliste, Teilen, Haltbarkeit ✅
- Einkaufsliste nach Geschäften: Supermarkt, Drogerie/Apotheke, Outdoor-/Sportgeschäft, Baumarkt, Elektronik, Kleidung, Tierbedarf, Autozubehör (eigener Händler-Eintrag hat Vorrang); umschaltbar auf „Nach Wichtigkeit“.
- Teilen 📱: Packliste eines Rucksacks (nach Kategorien, ✅/⬜) und Einkaufsliste (nach Geschäften) über das Android-Teilen-Menü, z. B. WhatsApp. Medikamente und Hilfsmittel erscheinen nur als „Persönliche Medikamente/Hilfsmittel“. Drucken/PDF bleibt.
- Beim Abhaken von Sachen, die ablaufen (Wasser, Essen, Medikamente, Erste Hilfe, Batterien, Brennstoff, Tierfutter …), fragt die App einmal „Haltbar bis?“; „Kein Datum“ fragt nicht wieder. Daraus entstehen die Ablauf-Erinnerungen.
- Darstellung: immer dunkel (Schriftgröße und hoher Kontrast bleiben einstellbar).

## Vereinfacht in 3.2 ✅
- Startseite beginnt mit genau einem nächsten Schritt („Als Nächstes: Weiter packen: Rucksack Lars · Kleidung“ oder „Einkaufen“). Notrufnummern und Gewicht stehen nicht mehr doppelt auf der Startseite (Notfall-Knopf bzw. Rucksack).
- Packliste: Kategorien als kompakte Liste; eine Zeile je Sache (Haken, Name, Menge); gleiche Sachen im Rucksack zusammengefasst; keine Etiketten „Notwendig/Empfohlen“ mehr – Wichtiges hat einen kleinen roten Punkt. Menge, Foto, anderer Rucksack und Details hinter dem Pfeil.
- Nach dem Anlegen geht es geführt Kategorie für Kategorie, unten nur ein „Weiter“.
- Hinzufügen: ein Fenster je Rucksack (Suche + Kategorien, Plus, ✓, bleibt offen) – über „Hinzufügen“ auf der Taschenseite, die Lupe oder „Noch etwas dazu“.
- Einkaufsliste: Geschäfte zugeklappt, gleiche Sachen in einer Zeile, Kästchen antippen = gekauft (ohne Formular), kein „Warum?“, keine Etiketten.
- Haltbarkeit nur bei Sachen, die wirklich ablaufen (feste Liste: Wasser, Lebensmittel, Medikamente, Erste Hilfe, Masken, Batterien, Brennstoff …); nie bei Brille, Hörgerät, Thermometer, Akkus, Werkzeug.

## Notfallpass für Rettungskräfte auf dem Sperrbildschirm (3.3) ✅ 📱
Seite „Für Rettungskräfte“ (Notfallpass → oberste Karte). Vorschau, was Rettungskräfte sehen – nur Name, freigegebene Angaben und Notfallkontakte. Drei Wege:
1. **Hinweis auf dem Sperrbildschirm**: dauerhafte, öffentliche Benachrichtigung mit den Angaben; Antippen öffnet eine eigene Notfallpass-Ansicht über dem Sperrbildschirm (große 112-Taste, Kontakte zum Anrufen) – ohne Entsperren und ohne Zugang zur restlichen App. Aktualisiert sich automatisch, startet nach Neustart wieder.
2. **Sperrbildschirm-Bild** mit dem Notfallpass (Vorschau vor dem Setzen) – funktioniert auf jedem Handy.
3. **Android-Notfallinformationen**: Angaben werden kopiert, die Einstellung wird geöffnet (Rettungskräfte: Sperrbildschirm → „Notruf“ → „Notfallinformationen“).

## Überarbeitet in 3.3 ✅
- Markierungen (Punkte, Status) immer rechts am Pfeil; „Notfall“ oben als rotes Symbol (mehr Platz für Seitentitel).
- Nur noch „da“ und „fehlt“ statt zusätzlich „gepackt“ (Packanleitung bleibt unter „Weitere Aktionen“).
- Taschenseite: Inhalt als Fach-Übersicht, Fach antippen zeigt den Inhalt.
- „Was fehlt?“ (gesamt und je Tasche): eine Zeile je Sache, ✓ und 🛒 rechts; Hinweise zur Ausrüstung als eigene Seite.
- Alle Gegenstände: nur Suche, Filter auf Knopfdruck. Mehr: gruppiert (Haushalt & Planung, Einkaufen & Vorrat, Üben & Erinnern, App).
- Karte ohne gespeichertes Gebiet: kurzer Hinweis statt leerer Fläche. Doppelte Quelle entfernt.
