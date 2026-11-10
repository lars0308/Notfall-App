# Notfall! – persönlicher Vorsorge-Assistent für Android

Deutschsprachige, vollständig offline arbeitende Android-App für Notfallvorsorge. Sie stellt einige Fragen, erstellt daraus einen persönlichen Plan (Packlisten je Person, Hausvorrat, Aufgaben, Erinnerungen), erkennt fehlende Ausrüstung und führt dich von „Plan bestätigen“ über „Einkaufen“ bis „Packen“ und „regelmäßig prüfen“.

> **Kein amtliches Warnsystem.** Bei Gefahr: 112 und Anweisungen der Behörden. Alle Mengen sind Schätzwerte.

**Test-APK:** [`dist/Notfall-2.0.0-debug.apk`](dist/Notfall-2.0.0-debug.apk) (Android 10+, Debug-signiert) · Prüfsumme in `dist/SHA256.txt`

| Dokument | Inhalt |
|---|---|
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | APK installieren, selbst bauen, Tests ausführen |
| [docs/FUNKTIONEN.md](docs/FUNKTIONEN.md) | Umgesetzte Funktionen im Abgleich mit dem Arbeitsauftrag |
| [docs/EINSCHRAENKUNGEN.md](docs/EINSCHRAENKUNGEN.md) | Bekannte Einschränkungen (bitte lesen) |
| [docs/TESTERGEBNISSE.md](docs/TESTERGEBNISSE.md) | Echte Testausgaben, was getestet wurde und was nicht |
| [docs/GERAETETEST-CHECKLISTE.md](docs/GERAETETEST-CHECKLISTE.md) | Punkte, die nur auf einem Gerät prüfbar sind |
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Aufbau, Datenmodell, Sicherheit |

## Kurzüberblick
- **Einrichtungsassistent** (7 Schritte) → Plan mit Rucksäcken pro Person, Gewicht, Wasser/Kalorien, Aufgaben.
- **Rucksäcke mit interaktiver 3D-Ansicht**, Fächer, Packstatus, Gewichts- und Volumenwarnungen.
- **Empfehlungen** (Notwendig/Empfohlen/Optional) mit Begründung; **Einkauf** mit Budget und Doppelkauf-Schutz.
- **Hausvorrat** mit Reichweite, **Erinnerungen** (lokal), **Notfallmodus**, **Schutzräume** (nur Dokumentation).
- **Verschlüsselter Safe**, **Backup** mit Passwort, **PIN/Biometrie**, mehrere Benutzer und Haushalte.
- Flaches, kontrastreiches Design (Hell/Dunkel), Handy und Tablet.

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
