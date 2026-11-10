# Installationsanleitung

## A) Fertige Test-APK installieren
1. Datei `dist/Notfall-2.0.0-debug.apk` auf das Android-Handy kopieren (USB, Cloud, E-Mail …).
2. Datei antippen. Android fragt, ob die Installation aus dieser Quelle erlaubt ist → „Einstellungen“ → für diese App „Installation erlauben“ → zurück → „Installieren“.
3. „Notfall!“ öffnen. Der Einrichtungsassistent führt dich in 7 Schritten zu deinem Plan (oder „Überspringen“ / „Später“).
4. Beim Einschalten der Erinnerungen fragt Android nach der Benachrichtigungs-Erlaubnis. Die Kamera-Erlaubnis wird erst beim ersten Foto/Scan abgefragt.

Mindestens Android 10 (API 29). Die Prüfsumme der APK steht in `dist/SHA256.txt`.

> **Hast du schon eine ältere Notfall!-Version?** Siehe „Installation“ in [Einschränkungen](EINSCHRAENKUNGEN.md): Wegen unterschiedlicher Debug-Signatur ist unter Umständen vorher ein Deinstallieren nötig.

## B) Selbst bauen (Android Studio)
1. Ordner dieses Repositories als Projekt öffnen (JDK 17, Android SDK Platform 35).
2. Gradle synchronisieren (benötigt einmalig Internet für Android Gradle Plugin 8.7.3 und AndroidX).
3. Menü **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
4. Ergebnis: `app/build/outputs/apk/debug/app-debug.apk`.

Kommandozeile:
```
./gradlew assembleDebug          # Linux/macOS
gradlew.bat assembleDebug        # Windows
```
`local.properties` mit `sdk.dir=<Pfad zum Android SDK>` anlegen, falls Gradle das SDK nicht findet.

## C) Tests ausführen (optional, Entwickler)
Voraussetzung: Node.js ≥ 20 und `playwright` (mit Chromium).
```
node tests/unit.js        # Planungs- und Empfehlungslogik
node tests/e2e.js         # Assistent bis Persistenz (Chromium)
node tests/e2e2.js        # Formulare, 3D, Einkauf, Safe, Backup/Restore, PIN
node tests/e2e3.js        # Assistent: später/überspringen/neu starten
node tests/e2e4.js        # Benutzer/Rechte/gesperrter Notfallmodus
node tests/native-sim.js  # Android-Schnittstelle (Attrappe)
node tests/monkey.js 1    # Zufallstest
```

## Erste Schritte
1. Assistent beantworten → Plan wird erstellt.
2. **Ausrüstung prüfen**: bei jeder Position „Habe ich“ oder „Fehlt“. Fehlendes landet in der Einkaufsliste.
3. **Empfehlungen** lesen (Notwendig / Empfohlen / Optional).
4. Einkaufen → „Gekauft“ → Gegenstand kommt ins Inventar.
5. Rucksack packen: Rucksack öffnen, Fächer antippen, Gegenstände abhaken.
6. Einstellungen: App-Sperre, Benachrichtigungen, Backup einrichten.
