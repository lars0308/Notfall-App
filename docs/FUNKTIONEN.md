# Umgesetzte Funktionen (Version 2.5.0)

Legende: ✅ umgesetzt und im Browser getestet · 📱 braucht Android-Code, nicht auf Gerät geprüft · 🟡 mit Einschränkung · ⬜ offen. Was gestrichen oder verschoben wurde, steht in der [Feature-Matrix](FEATURE-MATRIX.md).

## Notfallplan erstellen ✅
Reihenfolge: **Haushalt → Personen → jede Person einzeln → Tiere → Zweck/Dauer/Unterkunft → Rucksäcke**.
- Haushalt: Name, Adresse/Ort, Standort per GPS 📱 (freiwillig, nur auf Knopfdruck, wird nicht gesendet), Wohnsituation (Wohnung/Haus/Land; „Land“ macht Wasserfilter Pflicht und schlägt Solar-Ladegerät vor).
- Personen: erst Liste (Erwachsene/Kinder), dann je Person ein Schritt mit Foto 📱, Name, Alter oder Geburtsdatum, Geschlecht, Gewicht, Größe, Fitness, Blutgruppe, Allergien, Vorerkrankungen, Medikamenten, Hilfsmitteln, Einschränkung beim Gehen/Tragen. Live berechnet: Kalorien (Mifflin-St Jeor × Aktivität, sonst Richtwert nach Alter), Wasser, Traglast (15–25 % des Körpergewichts, max. 20 kg). Die Packliste nutzt dieselben Werte.
- Tiere: je Tier Art, Name, Anzahl (Hund mit Gewicht für die Wassermenge).
- Rucksäcke: „Wer trägt welchen Rucksack?“ – je Person eine Zeile, passend zum Alter vorausgewählt (Kind unter 6: keinen), mit einem Tipp änderbar; vorhandene Taschen wählbar; optional gemeinsame Familientasche.

## Packen Rucksack für Rucksack ✅
- Packliste: bei mehreren Taschen zuerst „Welchen Rucksack packst du?“, dann dessen Kategorien (Allgemein, Medikamente & Erste Hilfe, Kleidung, Werkzeug, Feuer & Kochen, Wasser, Nahrung, Technik/Akkus/Licht, Hygiene, Schlafen, Dokumente & Geld; Kind/Haustier/Auto nur wenn passend). „Weiter“ führt durch alle Kategorien und dann zum nächsten Rucksack.
- In der Kategorie: Vorschläge abhaken, weitere Sachen mit + direkt in diesen Rucksack, Foto je Gegenstand 📱, eigener Gegenstand.
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
