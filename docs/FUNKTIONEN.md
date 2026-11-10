# Umgesetzte Funktionen (Version 2.1.0, Fokus-Update)

Legende: ✅ umgesetzt und im Browser getestet · 📱 braucht Android-Code, nicht auf Gerät geprüft · 🟡 mit Einschränkung · ⬜ offen. Was gestrichen oder verschoben wurde, steht in der [Feature-Matrix](FEATURE-MATRIX.md).

## 1 Meine Taschen ✅
- Beliebig viele Rucksäcke, Taschen, Koffer; 9 Typen; Name, Foto 📱, Volumen, Gewicht, Besitzer, fester Lagerort, Verwendung, Packstatus.
- Fächer frei anlegen, umbenennen, verschieben, entfernen; jeder Gegenstand hat ein Fach.
- Tasche kopieren, bearbeiten, löschen (Gegenstände bleiben erhalten).
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
- Je Person: Name, Geburtsdatum, Rolle, Foto 📱, Allergien, Krankheiten, Medikamente, Hilfsmittel, Blutgruppe, Hinweise, Organspende-Angabe mit Hinweis, dass sie keinen Ausweis ersetzt.
- **Jedes Feld ist privat, bis es einzeln freigegeben wird.**
- Bis zu drei priorisierte Kontakte je Person mit Beziehung, Telefon, Foto 📱; Reihenfolge änderbar; Schnellwahl öffnet die Wählansicht 📱.
- Notfallpass-Ansicht zeigt nur Freigegebenes; auch ohne Entsperren erreichbar (abschaltbar).
- QR-Code Variante A: freigegebene Angaben als Text direkt im Code, ohne App und ohne Internet lesbar; Vorschau „das kann jeder lesen“.
- Notfallkarte als PDF/Druck 📱 mit Fotos, Kontakten, QR.
- Hinweis auf die Android-Notfallinfos.
- ⬜ QR Variante B (Webseite mit Fotos) und freier Kartendesigner: nicht umgesetzt.

## Zusätzlich, schlank
- ✅ Erinnerungen: Packkontrolle, Powerbanks, Batterien, Kinderkleidung, Medikamente, Ablaufdaten, eigene Termine; 📱 Benachrichtigung auch bei geschlossener App.
- ✅ Optionale Notfallkiste zu Hause: erst nach „Kiste anlegen“; Mengen und Ablaufdaten.
- ✅ Treffpunkte speichern. ⬜ **Offline-Karten: noch nicht gebaut.**
- ✅ Packliste mit Fachbelegung drucken 📱; verschlüsseltes Backup mit geprüfter Wiederherstellung; CSV-Export.
- ✅ Mehrere Personenprofile; mehrere Haushalte unter Einstellungen. ⬜ Synchronisierung zwischen Handys.
- ✅ App-Sperre mit einer PIN, 📱 optional Biometrie.
- ⬜ Warnmodul und Probealarm: späteres Modul.

## Design
Mobile First, dunkler Glas-Look, große untereinander angeordnete Karten, Hauptaktionen unten im Daumenbereich, Navigation mit fünf Punkten (Start, Taschen, Packliste, Notfallpass, Mehr). Erklärtexte entfernt; Hinweise nur bei Fehlern, Risiken und Datenschutz.
