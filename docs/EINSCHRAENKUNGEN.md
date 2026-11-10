# Bekannte Einschränkungen

## Nicht auf einem Gerät geprüft
Der Java-Teil (Keystore-Verschlüsselung, Biometrie, Benachrichtigungen, Probealarm, Kartendownload, MBTiles-Import, Kamera-Aufnahme, Drucken, Download-Export) wurde kompiliert und die JavaScript-Seite gegen eine Attrappe getestet, aber **nicht auf einem echten Gerät oder Emulator ausgeführt**. Siehe [Geräte-Testcheckliste](GERAETETEST-CHECKLISTE.md). Fehler in diesem Bereich sind möglich.

## Installation
- Die APK ist eine **Debug-APK** mit dem Android-Debug-Schlüssel dieser Build-Umgebung. Sie ist nicht für den Play Store gedacht.
- Hast du eine ältere Notfall!-Version aus *deinem* Android Studio installiert, hat sie einen anderen Debug-Schlüssel. Android lässt dann kein Update zu. Entweder deinen Stand selbst aus diesem Quellcode bauen (Update möglich, alte Daten werden zum Import angeboten) oder die alte App deinstallieren – dabei gehen ihre Daten verloren (vorher dort exportieren).
- Der verschlüsselte Safe der alten Version (IndexedDB `notfall_vault`) wird **nicht** übernommen; übernommen werden Personen, Rucksäcke/Fächer, Gegenstände, Kontakte und Notizen.

## Inhalte und Zahlen
- Alle Mengen (Wasser, Kalorien, Gewicht, Tragfähigkeit) sind **Schätzwerte** und in der App so gekennzeichnet.
- Die Regeln orientieren sich an allgemein bekannten Empfehlungen (u. a. BBK: ca. 2 l Flüssigkeit pro Person und Tag, Vorrat für 10 Tage, Verhältnisse der Lebensmittelgruppen). **Ich konnte die aktuellen BBK-Veröffentlichungen in dieser Sitzung nicht online gegenprüfen.** Die Zahlen sind deshalb als Orientierung zu verstehen, nicht als Zitat. Bitte vor dem Verlassen darauf mit den aktuellen amtlichen Unterlagen vergleichen. Alle Werte lassen sich in den Einstellungen ändern.
- Die App ist kein amtliches Warnsystem. Warnungen kommen weiterhin über NINA/WarnWetter, Cell Broadcast, Radio usw.
- Das Länder-Wissen (Notrufnummern, Warn-Apps) deckt Deutschland, Österreich und die Schweiz ab; sonst gilt 112.

## Funktionen mit Grenzen
- **Offline-Karten:** Die App bringt keine Karten mit. Du brauchst einen Kartenserver, dessen Bedingungen das Speichern für die Offline-Nutzung erlauben (eigener Server oder kommerzieller Anbieter) – die öffentlichen OpenStreetMap-Server erlauben das nicht. Alternativ eine fertige Raster-MBTiles-Datei importieren (Vektorkarten werden nicht unterstützt). Höchstens 15.000 Kacheln pro Download, Zoom bis 17. Kein Routing, keine Navigation, kein eigener Standort. Karten sind **nicht im Backup** und müssen auf einem neuen Gerät neu geladen werden.
- **Standort:** Nur auf Knopfdruck im Haushalt-Schritt, bleibt auf dem Gerät. Es gibt keine Adresssuche (bräuchte einen Online-Dienst) und kein Routing – die Entfernung zu Treffpunkten ist Luftlinie. Auf dem Gerät nicht getestet.
- **Internet-Berechtigung:** Seit 2.2 vorhanden, genutzt nur für den Kartendownload, den du selbst startest. Die Oberfläche selbst lädt keine fremden Adressen.
- **Probealarm:** Ab Android 14 muss „Alarme & Erinnerungen“ für die App erlaubt werden, sonst kann der Test einige Minuten später kommen. Nach „Beenden erzwingen“ in den Android-Einstellungen löscht Android alle geplanten Alarme, bis die App wieder geöffnet wird. Ob Ton und Vibration zu hören waren, kann die App nicht messen – das bestätigst du in der Auswertung. Kein Vollbild-Alarm und kein Alarm im Flugmodus mit lautlosem Gerät versprochen.
- **Amtliche Warnungen, Familien-Sync, QR-Webseite:** nicht umgesetzt, brauchen einen Server – siehe [Online-Architektur](ONLINE-ARCHITEKTUR.md). Die Lage-Checklisten in der Notfallansicht sind eigene, kurze Hinweise und keine amtlichen Meldungen.
- **QR-Notfallpass:** nur Variante A (Text im Code). Jeder, der den Code scannt, kann den Inhalt lesen; die App zeigt ihn vorher an. Fotos passen nicht in den Code. Variante B (Webseite) ist nicht umgesetzt. Der Text ist auf rund 700 Zeichen begrenzt und wird sonst gekürzt.
- **Notfallpass auf gesperrtem Handy:** Die App kann den Android-Sperrbildschirm nicht umgehen. „Ohne Entsperren“ bezieht sich auf die PIN der App. Für das gesperrte Gerät zusätzlich die Android-Notfallinfos einrichten.
- **Freigaben** gelten für Notfallpass-Ansicht, QR-Code und Druckkarte gleichermaßen; getrennte Freigaben je Ausgabe gibt es nicht.
- **Packanleitung:** Reihenfolge und Fachwahl folgen festen Regeln und geschätzten Gewichten. Außen befestigte Teile werden nicht geprüft.
- **Fachansicht:** schematisch, sieben Grundformen; Innenfächer erscheinen als Schaltflächen unter der Zeichnung.
- **Benachrichtigungen:** ungefähre Zeitpunkte, bis ca. 130 Tage im Voraus geplant; Energiesparmodi einiger Hersteller können sie verzögern.
- **App-Sperre:** eine PIN für die App. Die Daten liegen per Android-Keystore verschlüsselt auf dem Gerät. Exportierte CSV- und PDF-Dateien sind unverschlüsselt.
- **Kamera-Fotos** liegen kurz als temporäre Datei im App-Cache und werden danach gelöscht.
- **Gestrichene Bereiche:** Schutzräume, Aufgabenliste, Benutzerverwaltung, Budget und Verbrauchsbuchung haben kein Menü mehr; ihre Daten bleiben gespeichert und im Backup. Ein bereits angelegter Dokumenten-Safe bleibt unter „Mehr“ erreichbar.
- **Tablet-Layout und helles Farbschema** sind nur per Screenshot gesichtet, nicht automatisch getestet. Die neuen Bildschirme (Karte, Kartendesigner, Probealarm) wurden nur im Handyformat dunkel gesichtet.
- **Sprache:** nur Deutsch. **targetSdk 34**, minSdk 29.
