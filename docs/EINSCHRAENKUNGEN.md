# Bekannte Einschränkungen

## Nicht auf einem Gerät geprüft
Der Java-Teil (Keystore-Verschlüsselung, Biometrie, Benachrichtigungen, Kamera-Aufnahme, Drucken, Download-Export) wurde kompiliert und die JavaScript-Seite gegen eine Attrappe getestet, aber **nicht auf einem echten Gerät oder Emulator ausgeführt**. Siehe [Geräte-Testcheckliste](GERAETETEST-CHECKLISTE.md). Fehler in diesem Bereich sind möglich.

## Installation
- Die APK ist eine **Debug-APK** mit dem Android-Debug-Schlüssel dieser Build-Umgebung. Sie ist nicht für den Play Store gedacht.
- Hast du die alte Notfall!-Version aus *deinem* Android Studio installiert, hat sie einen anderen Debug-Schlüssel. Android lässt dann kein Update zu. Entweder deinen Stand selbst aus diesem Quellcode bauen (Update möglich, alte Daten werden zum Import angeboten) oder die alte App deinstallieren – dabei gehen ihre Daten verloren (vorher dort exportieren).
- Der verschlüsselte Safe der alten Version (IndexedDB `notfall_vault`) wird **nicht** übernommen; übernommen werden Personen, Rucksäcke/Fächer, Gegenstände, Kontakte und Notizen.

## Inhalte und Zahlen
- Alle Mengen (Wasser, Kalorien, Gewicht, Tragfähigkeit) sind **Schätzwerte** und in der App so gekennzeichnet.
- Die Regeln orientieren sich an allgemein bekannten Empfehlungen (u. a. BBK: ca. 2 l Flüssigkeit pro Person und Tag, Vorrat für 10 Tage, Verhältnisse der Lebensmittelgruppen). **Ich konnte die aktuellen BBK-Veröffentlichungen in dieser Sitzung nicht online gegenprüfen.** Die Zahlen sind deshalb als Orientierung zu verstehen, nicht als Zitat. Bitte vor dem Verlassen darauf mit den aktuellen amtlichen Unterlagen vergleichen. Alle Werte lassen sich in den Einstellungen ändern.
- Die App ist kein amtliches Warnsystem. Warnungen kommen weiterhin über NINA/WarnWetter, Cell Broadcast, Radio usw.
- Schutzräume werden nur dokumentiert und nie als „sicher“ oder „zertifiziert“ bewertet.
- Das Länder-Wissen (Notrufnummern, Warn-Apps) deckt Deutschland, Österreich und die Schweiz ab; sonst gilt 112.

## Funktionen mit Grenzen
- **3D-Ansicht:** schematisch (Boxen mit abgeschrägten Kanten), keine fotorealistischen Modelle. Dafür vollständig interaktiv: Drehen, Zoomen, Fach antippen, Gewicht und Status je Fach. Sieben Grundformen.
- **Barcode-Scanner:** funktioniert nur, wenn die WebView des Geräts `BarcodeDetector` anbietet. Sonst Nummer eintippen. Es gibt keine Online-Produktdatenbank (Offline-Prinzip): erkannt werden nur Barcodes, die du selbst an Gegenständen hinterlegt hast.
- **Dokumente scannen:** Kameraaufnahme plus Kontrastverbesserung, keine automatische Kantenerkennung/Perspektivkorrektur, nur Einzelseiten.
- **PDF-Vorschau:** nicht integriert; PDFs lassen sich importieren, verschlüsselt speichern und exportieren. Bilder werden angezeigt.
- **Benachrichtigungen:** werden mit dem Android-AlarmManager *ungefähr* (nicht sekundengenau) geplant und bis ca. 130 Tage im Voraus gesetzt. Sie werden neu berechnet, wenn du die App benutzt, und nach einem Neustart des Geräts wiederhergestellt. Energiesparmodi einiger Hersteller können Meldungen verzögern oder unterdrücken. Meldungstexte enthalten bewusst keine Gesundheitsdaten.
- **Benutzerrechte:** Die PIN-Sperre und die Berechtigungen blenden Bereiche in der Oberfläche aus. Alle Benutzer teilen sich denselben, per Android-Keystore verschlüsselten Datenspeicher; es gibt **keine kryptografische Trennung je Benutzer**. Der Safe ist zusätzlich durch ein eigenes Passwort geschützt. Wer das Gerät selbst entsperren und die App mit Entwicklerwerkzeugen untersuchen kann, ist nicht Teil des Schutzmodells.
- **Verschlüsselung:** Gesundheitsdaten sind Teil der Hauptdatenbank und werden wie alles mit einem Keystore-Schlüssel (AES-256-GCM) verschlüsselt auf dem Gerät gespeichert. Backups sind separat passwortverschlüsselt (PBKDF2 + AES-256-GCM). **Exportierte Safe-Dokumente und CSV-Dateien sind unverschlüsselt** – die App warnt davor.
- **Kamera-Fotos** liegen kurz (bis zur Verarbeitung) als temporäre Datei im App-Cache und werden danach gelöscht.
- **Mehrere Geräte/Cloud:** keine Synchronisierung. Familiengeräte können nur per Backup-Datei abgeglichen werden. Die Datenhaltung (Speicher-Abstraktion `KV`) ist so gebaut, dass später eine optionale Synchronisierung ergänzt werden kann.
- **Sprache:** nur Deutsch.
- **Plan aktualisieren** ergänzt Vorschläge, löscht aber nichts. Nicht mehr benötigte Vorschläge musst du selbst entfernen.
- **targetSdk 34** (Android 14), minSdk 29 (Android 10). Auf Android 15 läuft die App im Kompatibilitätsmodus ohne Edge-to-Edge-Zwang.
