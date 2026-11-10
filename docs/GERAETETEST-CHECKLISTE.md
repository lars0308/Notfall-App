# Geräte-Testcheckliste (bitte auf einem echten Android-Gerät durchgehen)

Diese Punkte konnten in der Entwicklungsumgebung **nicht** geprüft werden. Bitte einmal abhaken, bevor du dich auf die App verlässt.

## Installation & Start
- [ ] APK installiert, App startet, Einrichtungsassistent erscheint.
- [ ] Android 10, 11, 12, 13 oder 14/15 (mindestens eine Version testen).
- [ ] Flugmodus an → App starten → alles bedienbar (Offline-Test).

## Speicher & Verschlüsselung
- [ ] Daten anlegen, App aus dem Task-Manager wischen, neu öffnen → Daten sind da.
- [ ] Gerät neu starten → Daten sind da.
- [ ] Einstellungen → Backup erstellen → Datei erscheint in „Downloads/Notfall“. Backup auf dem Gerät wiederherstellen.

## Sperre & Biometrie
- [ ] Einstellungen → App-Sperre einrichten (PIN) → App schließen, öffnen → PIN-Abfrage.
- [ ] App-Sperre mit „Fingerabdruck / Gesicht erlauben“ → Entsperren per Biometrie funktioniert.
- [ ] Einstellungen → „Screenshots verhindern“ an → Screenshot nicht möglich, App-Wechsler zeigt kein Bild.

## Kamera, Fotos, Dokumente
- [ ] Gegenstand → Foto hinzufügen → „Mit Kamera aufnehmen“ → Foto erscheint (richtig gedreht).
- [ ] Aus Galerie wählen funktioniert.
- [ ] Personenfoto und Kontaktfoto im Notfallpass aufnehmen.

## Benachrichtigungen
- [ ] Erinnerungen → Einschalten → Android fragt nach Erlaubnis (ab Android 13).
- [ ] „Testmeldung in 1 Minute“ → Meldung erscheint, auch wenn die App geschlossen ist.
- [ ] Gerät neu starten → geplante Termine bleiben (Boot-Receiver).
- [ ] Bei Xiaomi/Huawei/Samsung u. a.: Akku-Optimierung für Notfall! ausschalten, falls Meldungen ausbleiben.

## Notfallpass, Drucken & Anrufen
- [ ] Notfallpass → „Karte drucken / PDF“ → Druckdialog; Fotos und QR-Code sind auf der Karte.
- [ ] QR-Code vom Bildschirm und vom Ausdruck mit der Kamera eines **anderen** Handys scannen (ohne Notfall!-App, im Flugmodus): Text erscheint.
- [ ] Tasche → „Drucken“ → Packliste mit Fächern.
- [ ] Kontakt-Schaltfläche im Notfallpass öffnet die Wählansicht.
- [ ] Notfallmodus → 112-Taste öffnet die Wählansicht (wählt **nicht** automatisch).

## Oberfläche
- [ ] Hoch- und Querformat, Tablet (falls vorhanden).
- [ ] Hell-/Dunkelmodus, große Schrift, Hoher Kontrast.
- [ ] Glas-Effekt flüssig? Sonst Einstellungen → „Hoher Kontrast“.
- [ ] Tasche: Fach in der 2D-Ansicht antippen; 3D umschalten, drehen.
- [ ] Update von 2.0.0: alte Taschen, Gegenstände, Fotos und Kontakte sind noch da.
- [ ] Zurück-Taste schließt zuerst Dialoge, dann geht sie eine Seite zurück.
