# Notfall! – Pack-App für Rucksäcke und Taschen mit Notfallpass

Deutschsprachige, offline arbeitende Android-App: Taschen anlegen, per Fragen eine Packliste erhalten, jedes Teil einem Fach zuweisen, Schritt für Schritt packen – dazu Notfallkontakte und ein Notfallpass mit QR-Code je Person, Offline-Karten mit Treffpunkten und ein Probealarm.

> Kein amtliches Warnsystem. Bei Gefahr: 112 und Anweisungen der Behörden. Gewichte und Mengen sind Schätzwerte.

**Test-APK:** [`dist/Notfall-2.9.0-debug.apk`](dist/Notfall-2.9.0-debug.apk) (Android 10+, Debug-signiert)

| Dokument | Inhalt |
|---|---|
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Installation am Handy, selbst bauen, Tests |
| [docs/FEATURE-MATRIX.md](docs/FEATURE-MATRIX.md) | behalten / vereinfacht / verschoben / entfernt, Migration |
| [docs/FUNKTIONEN.md](docs/FUNKTIONEN.md) | Umgesetzte Funktionen |
| [docs/EINSCHRAENKUNGEN.md](docs/EINSCHRAENKUNGEN.md) | Bekannte Einschränkungen |
| [docs/ONLINE-ARCHITEKTUR.md](docs/ONLINE-ARCHITEKTUR.md) | Warn-Push, Familien-Sync, QR-Webseite (nicht umgesetzt) |
| [docs/DATENSCHUTZ-FREIGABE.md](docs/DATENSCHUTZ-FREIGABE.md) | Datenschutz- und Freigabekonzept |
| [docs/TESTERGEBNISSE.md](docs/TESTERGEBNISSE.md) | Echte Testausgaben |
| [docs/GERAETETEST-CHECKLISTE.md](docs/GERAETETEST-CHECKLISTE.md) | Nur auf dem Gerät prüfbar |
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Aufbau, Datenmodell, Sicherheit |

## Projektstruktur
```
app/src/main/java/de/notfall/familie/   Android-Teil (WebView-Host, Keystore-Speicher, Biometrie, Alarme)
app/src/main/assets/www/                Web-Oberfläche (index.html, css/, js/)
tests/                                  Unit-, End-to-End- und Schnittstellentests (Node + Playwright)
docs/                                   Dokumentation, Screenshots
dist/                                   Fertige Debug-APK + Prüfsumme
```

## Bauen
```
./gradlew assembleDebug      # → app/build/outputs/apk/debug/app-debug.apk
```
Voraussetzungen: JDK 17, Android SDK 35 (`local.properties` mit `sdk.dir=…`).
