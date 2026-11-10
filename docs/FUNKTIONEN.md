# Umgesetzte Funktionen (Version 2.4.0)

Legende: ✅ umgesetzt und im Browser getestet · 📱 braucht Android-Code, nicht auf Gerät geprüft · 🟡 mit Einschränkung · ⬜ offen. Was gestrichen oder verschoben wurde, steht in der [Feature-Matrix](FEATURE-MATRIX.md).

## Notfallplan erstellen und nach Kategorien packen ✅
- Start: „Notfallplan erstellen“ → Name → Personen (Name, Alter) → Wo wohnst du (Wohnung/Haus/Land, Ort freiwillig; „Land“ macht Wasserfilter notwendig und schlägt ein Solar-Ladegerät vor) → Wofür (Notfallrucksack, Reise, Auto, eigener Zweck) → Dauer, Unterkunft, Tiere, Medikamente → Rucksack auswählen (Typ antippen; oder „Vorschlag machen“).
- Danach „Das brauchst du“: Kategorien in dieser Reihenfolge – Allgemein, Medikamente & Erste Hilfe, Kleidung, Werkzeug, Feuer & Kochen, Wasser, Nahrung, Technik/Akkus/Licht, Hygiene, Schlafen, Dokumente & Geld (Kind, Haustier, Auto nur wenn passend). Jede Kachel zeigt „x von y“, roter Punkt = Wichtiges offen.
- In der Kategorie: Vorschläge abhaken („Hast du das?“), darunter weitere Sachen zum Antippen (+) – sie kommen sofort als vorhanden in den gewählten Rucksack, das Fach wird automatisch gewählt. Bei mehreren Taschen: Auswahl „Neues kommt in“. Abgehakte Sachen: Kamera-Knopf für ein Foto 📱. „Weiter“ führt zur nächsten Kategorie.
- Lupe oben: suchen (z. B. „Batterien“), direkt abhaken oder hinzufügen, auch eigene Sachen („… hinzufügen“).
- „Einzeln abfragen“: eine Frage pro Gegenstand (Habe ich / Fehlt / Später). „Fertig“: nicht Abgehaktes nach Rückfrage auf die Einkaufsliste.
- Katalog um 38 Sachen erweitert (u. a. Akkus, Akku- und USB-Ladegerät, Kurbellampe, Funkgeräte, Panzertape, Klappsäge, Feuerstahl, Sturmstreichhölzer, Funktionsunterwäsche, Schmerzmittel, Pflaster, Zeckenzange, Kompass, Landkarte).

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
