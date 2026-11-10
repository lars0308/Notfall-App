# Installationsanleitung

## A) Test-APK direkt am Handy installieren
1. `dist/Notfall-2.2.1-debug.apk` aufs Handy laden: über die Dateikarte im Claude-Chat oder im Browser bei GitHub (Branch wählen → Datei öffnen → „Download raw file“).
2. Datei in der Download-Benachrichtigung oder in der App „Dateien“ antippen.
3. Android fragt, ob diese App installieren darf → „Einstellungen“ → „Dieser Quelle vertrauen“ → zurück → „Installieren“.
4. Meldet Play Protect eine unbekannte App: „Trotzdem installieren“.
5. Erscheint „App nicht installiert“, ist eine Version mit anderer Signatur vorhanden – siehe [Einschränkungen](EINSCHRAENKUNGEN.md), Abschnitt Installation.

Ein Update von 2.0.0 oder 2.1.0 (gleiche Signatur) auf 2.2.0 behält die Daten; der alte Stand wird vor der Umstellung zusätzlich gesichert.
Mindestens Android 10. Prüfsumme in `dist/SHA256.txt`.

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

## C) Tests ausführen (optional)
Node.js ≥ 20 und `playwright` mit Chromium; für die QR-Prüfung zusätzlich `jsqr` und `pngjs` (Pfad in `tests/flow.js`).
```
tests/run-all.sh          # alles
node tests/unit.js        # Planer, Packreihenfolge, Migration
node tests/flow.js        # Abnahme-Ablauf v1
node tests/data.js        # Migration, Backup, Sperre
node tests/extra.js       # Karten, Probealarm, Kartendesigner, Lagen, Kiste
node tests/native-sim.js  # Android-Schnittstelle (Attrappe)
```

## Erste Schritte
1. Fragen des Packassistenten beantworten.
2. Packliste: „Habe ich“ oder „Fehlt“.
3. Tasche öffnen → „Packen starten“.
4. Notfallpass: Kontakte wählen, Angaben freigeben, Karte drucken.
