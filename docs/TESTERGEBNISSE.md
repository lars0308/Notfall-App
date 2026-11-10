# Testergebnisse

Stand: 2026-11-10 01:50 UTC. Alle Ausgaben unten stammen aus echten Läufen in der Build-Umgebung (Node 22, Chromium/Playwright, Android SDK 35, Gradle 8.14.3). Nichts davon ist nachträglich geschönt. Gesamt: **33 Unit-Prüfungen, 91 End-to-End-Prüfungen, 18 Schnittstellen-Prüfungen – 0 fehlgeschlagen**. Alles wiederholbar mit `tests/run-all.sh`.

## Was wurde wie getestet – und was NICHT

| Ebene | Wie getestet | Ergebnis |
|---|---|---|
| Planungs-/Empfehlungslogik (Bedarf, Packlisten, Rucksack-Statistik, Regeln) | 33 Unit-Tests in Node (`tests/unit.js`) | alle bestanden |
| Oberfläche & Abläufe (Assistent, Rucksäcke, 3D-Auswahl, Inventar, Einkauf, Empfehlungen, Kontakte, Safe, Backup/Restore, PIN, Rechte) | 91 automatisierte End-to-End-Prüfungen in Chromium (`tests/e2e*.js`, Handy-Format 420×860; Tablet-Layout nur per Screenshot gesichtet) | alle bestanden |
| Zufalls-Test (Monkey) | 3 Läufe × ca. 330 Aktionen quer durch die App | keine JS-Fehler |
| JS ↔ Android-Schnittstelle | 18 Prüfungen mit einer **Attrappe** von `window.NotfallAndroid` (`tests/native-sim.js`) | alle bestanden |
| Java-Teil (Keystore-Speicher, Biometrie, Benachrichtigungen, Kamera, Drucken, Download) | **nur kompiliert** (Gradle `assembleDebug`; APK signiert, Manifest/Berechtigungen mit `aapt2` geprüft) | **nicht auf Gerät/Emulator ausgeführt** |
| Offline-Betrieb | Die Web-App lädt nur lokale Dateien (CSP `default-src 'self'`; in Android blockiert der WebView alle fremden Hosts; keine INTERNET-Berechtigung im Manifest). Der Browser-Test brauchte keine externe Anfrage. | strukturell sichergestellt; Flugmodus-Test auf dem Gerät steht aus |

**Wichtig:** In dieser Umgebung gibt es weder ein Android-Gerät noch einen Emulator (kein `/dev/kvm`). Alles, was nur auf einem echten Gerät geprüft werden kann, steht in der [Geräte-Testcheckliste](GERAETETEST-CHECKLISTE.md) und ist **nicht** als getestet zu betrachten.

## 1. Unit-Tests (`node tests/unit.js`)
```
OK   Altersgruppen
OK   Wasserbedarf: Erwachsene 2 l, Kleinkind 1,2 l, Baby 0,8 l
OK   Energiebedarf nach Alter (Schätzwerte)
OK   Tragfähigkeit: Erwachsene 12 kg, Kind (3 J.) 0 kg, Kind (8 J.) 2 kg, Mobilitätseinschränkung halbiert
OK   Hausvorrat: 3 Personen, 10 Tage → Wasserbedarf = Summe × Tage
OK   Lebensmittel nach BBK-Verhältnis: Getreide ~3,5 kg/10 Tage/Person (skaliert)
OK   Rucksack ohne Szenario: nur Hausvorrat, kein Rucksack wenn nur "Stromausfall" gewählt
OK   72-h-Rucksack: je tragfähiger Person ein Rucksack, Kleinkind trägt keinen
OK   Kind-Ausrüstung (Wechselkleidung, Kennzeichnung) wird von Erwachsenem getragen
OK   Baby: Windeln, Säuglingsnahrung, Fläschchen werden geplant
OK   Medikamente, Geräte, Allergien erzeugen notwendige Positionen für die Person
OK   Haustier: Transportbox, Futter, Impfpass werden geplant
OK   Plan ist idempotent (zweiter Lauf erzeugt keine Dubletten)
OK   Vorhandenes Inventar wird übernommen statt doppelt geplant
OK   Rucksack-Statistik: Gewicht, Überlast-Warnung, Volumen
OK   Wichtige Gegenstände werden bei vollem Rucksack nicht gestrichen
OK   Lastverteilung schlägt Verschiebungen vor und verbessert die Balance
OK   Empfehlung: Lampe ohne Batterien
OK   Empfehlung: Wasserfilter ohne Transportbehälter / ohne Aufbereitung
OK   Empfehlung: Kocher ohne Kochgeschirr/Brennstoff
OK   Empfehlung: zwei Schlafsäcke für drei Personen
OK   Empfehlung: Wechselkleidung für Kind fehlt
OK   Empfehlung: Lebensmittel reichen rechnerisch nicht
OK   Empfehlung: Haustier ohne Transportmöglichkeit
OK   Empfehlung: Medikament läuft bald ab
OK   Jede Empfehlung hat Begründung, Stufe und Quelle
OK   Bereits auf Einkaufsliste → keine doppelte Empfehlung
OK   Reichweite: Wasser/Lebensmittel nur aus bestätigten Positionen
OK   Doppelkauf-Erkennung (Ähnlichkeit, Plural)
OK   Beispielhaushalt: 2 Erw. + Kind, 54 l Wasser, zwei Rucksäcke (55 L / 40 L)
OK   Beispieldaten enthalten keine persönlichen Daten
OK   Alte Version: Import in Haushalt
OK   Ablauf-Benachrichtigungen: Zeitpunkte pro Gegenstand (Vorlauf, 7 Tage, Ablauf)

33 bestanden, 0 fehlgeschlagen
```

## 2. End-to-End: kompletter Assistent bis Persistenz (`node tests/e2e.js`)
```
OK   Erststart öffnet Einrichtungsassistent 
OK   Planergebnis-Dialog erscheint 
OK   Weiter zur Prüfung 
OK   Prüfliste hat Positionen n=123
OK   Habe ich/Fehlt wirken, Einkaufsliste wächst {"owned":10,"missing":4,"shop":4,"items":127,"bags":2}
OK   Seite #/home ohne Fehler 
OK   Seite #/bags ohne Fehler 
OK   Seite #/bags ohne Fehler 
OK   Seite #/items ohne Fehler 
OK   Seite #/item ohne Fehler 
OK   Seite #/stock ohne Fehler 
OK   Seite #/shop ohne Fehler 
OK   Seite #/recs ohne Fehler 
OK   Seite #/people ohne Fehler 
OK   Seite #/people ohne Fehler 
OK   Seite #/contacts ohne Fehler 
OK   Seite #/rooms ohne Fehler 
OK   Seite #/remind ohne Fehler 
OK   Seite #/safe ohne Fehler 
OK   Seite #/sos ohne Fehler 
OK   Seite #/settings ohne Fehler 
OK   Seite #/more ohne Fehler 
OK   Seite #/docs ohne Fehler 
OK   Seite #/tasks ohne Fehler 
OK   Seite #/sources ohne Fehler 
OK   Seite #/households ohne Fehler 
OK   Seite #/users ohne Fehler 
OK   Daten bleiben nach Neustart erhalten {"n":127,"owned":10}
Konsolenfehler: keine
```

## 3. End-to-End: Formulare, 3D, Einkauf, Safe-Verschlüsselung, Backup/Restore, PIN (`node tests/e2e2.js`)
```
OK   Beispielhaushalt geladen (2 Erw., 1 Kind, 2 Rucksäcke) {"items":119,"owned":20,"shop":0,"bags":2,"contacts":8,"rooms":0,"name":"Beispielhaushalt (Test)"}
OK   Beispieldaten enthalten 54 l Wasser 
OK   3D-Ansicht hat anklickbare Fächer {"x":220.7194230733601,"y":263.0352866014731,"slot":"front"}
OK   Tippen auf Fach wählt es aus c3f89b89a6e841c3
OK   Ziehen dreht das Modell 
OK   Rückansicht-Button 
OK   Zoom 
OK   Fach hinzugefügt 
OK   Fach umbenannt 
OK   Gegenstand ins neue Fach verschoben 
OK   Fach gelöscht, Gegenstand bleibt erhalten 
OK   Packstatus per Checkbox 
OK   Inventar-Suche ohne Treffer zeigt Hinweis (kein Fehler) 
OK   Gegenstand angelegt mit Notiz 
OK   Notiz auf Detailseite bearbeitbar 
OK   Duplizieren 
OK   Archivieren 
OK   Löschen 
OK   Doppelkauf-Warnung erscheint 
OK   Artikel auf Einkaufsliste ["Sonnencreme"] modal:none
OK   Kauf übernimmt Gegenstand ins Inventar (mit Preis) 
OK   Empfehlung → Einkaufsliste 
OK   Empfehlung ausblenden 
OK   Kontakt gespeichert 
OK   Treffpunkt gespeichert 
OK   Schutzraum-Risiko markierbar + Hinweis „nicht geprüft“ 
OK   Risiko erzeugt Empfehlung 
OK   Erinnerung erledigt verschiebt Termin 
OK   Notfallmodus: 112 + Hinweis auf Behörden 
OK   Hell-Modus + große Schrift 
OK   Safe angelegt und entsperrt 
OK   PDF importiert und gelistet 
OK   Safe: Dateiinhalt NICHT im Klartext gespeichert 
OK   Safe: Dateiname/Metadaten NICHT im Klartext gespeichert 
OK   Falsches Safe-Passwort bleibt gesperrt 
OK   Richtiges Passwort entsperrt 
OK   Export liefert Originalinhalt (entschlüsselt) 
OK   Backup ist verschlüsselt (kein Klartext) 20066 Bytes
OK   Alle Daten gelöscht 
OK   Restore mit falschem Passwort scheitert ohne Datenänderung 
OK   Restore stellt alle Daten wieder her [{"items":121,"owned":22,"shop":1,"bags":2,"contacts":9,"rooms":1,"name":"Beispielhaushalt (Test)"},{"items":121,"owned":22,"shop":1,"bags":2,"contacts":9,"rooms":1,"name":"Beispielhaushalt (Test)"}]
OK   Safe nach Restore weiterhin entsperrbar 
OK   PIN gespeichert (gehasht, nicht im Klartext) 
OK   Nach Neustart ist die App gesperrt 
OK   Sperrbildschirm zeigt Notruf-Zugang 
OK   Falsche PIN wird abgewiesen 
OK   Richtige PIN entsperrt 
Konsolenfehler: keine
```

## 4. End-to-End: Assistent zwischenspeichern/überspringen/neu starten (`node tests/e2e3.js`)
```
OK   Später: Startseite statt Zwangsweiterleitung, Banner „Einrichtung fortsetzen“ 
OK   Zwischenstand bleibt nach Neustart erhalten (Schritt + Eingaben) 
OK   Überspringen führt zur Startseite 
OK   Erneut starten öffnet den Assistenten wieder 
OK   Leeres Alter blockiert „Weiter“ mit Hinweis 
Konsolenfehler: keine
```

## 5. End-to-End: Benutzer, Berechtigungen, gesperrter Notfallmodus (`node tests/e2e4.js`)
```
OK   Mit zwei Benutzern erscheint die Benutzerauswahl 
OK   PIN eines anderen Benutzers wird abgewiesen 
OK   Mitglied meldet sich mit eigener PIN an 
OK   Mitglied ohne Berechtigung sieht keine Gesundheitsdaten 
OK   Mitglied ohne Berechtigung hat keinen Safe-Zugriff 
OK   Notfallmodus zeigt Mitglied ohne Freigabe keine medizinischen Hinweise 
OK   Eingeschränkter Notfallmodus ohne Entsperren: Notruf sichtbar, keine Gesundheitsdaten 
OK   Eingeschränkter Notfallmodus zeigt keine Navigation zu anderen Bereichen 
OK   Direktaufruf anderer Seiten führt zurück zur Sperre 
OK   Administrator sieht Gesundheitsdaten 
OK   Nach 5 Fehlversuchen wird kurz gesperrt (auch die richtige PIN wird dann abgewiesen) 
Konsolenfehler: keine
```

## 6. Schnittstellen-Vertragstest mit Attrappe (`node tests/native-sim.js`)
Prüft Aufrufnamen, Argumente und Rückgabeformate der Brücke zu Android (nicht den Java-Code selbst).
```
OK   Native erkannt (kein Browser-Hinweis) 
OK   setBars beim Start (ARGB Int32, Icons) 
OK   Datenbank liegt im nativen (Keystore-)Speicher unter „db“ 
OK   Keine Daten im WebView-localStorage/IndexedDB 
OK   Benachrichtigungen: Berechtigung angefragt + Termine geplant 
OK   Termine haben id/at/title/text, at in Millisekunden 7 Termine
OK   Benachrichtigungstexte enthalten keine Gesundheitsdaten 
OK   Ausschalten leert alle geplanten Alarme 
OK   FLAG_SECURE-Schalter ruft setSecure(true) 
OK   Kamera-Foto landet als Foto am Gegenstand (verschlüsselter Speicher) 
OK   Biometrie: bioEnroll(alias=vault) 
OK   Safe lässt sich per Biometrie entsperren 
OK   Safe-Datenbestand im nativen Speicher nur verschlüsselt (vault_*) 
OK   Safe bleibt entsperrt, während Kamera/Dateiauswahl geöffnet ist 
OK   Safe sperrt beim Verlassen der App 
OK   Backup nutzt saveDownload(.nfbak) Notfall-Backup-20261110-0148.nfbak
OK   Kontaktkarte nutzt printHtml 
OK   Notruf-Button öffnet nur die Wählansicht (dial("112")) 
Konsolenfehler: keine
```

## 7. Zufalls-Test (`node tests/monkey.js <Seed>`)
```
Seed 21: 322 Aktionen, Konsolenfehler: 0, Fehlerseite: false
Seed 22: 327 Aktionen, Konsolenfehler: 0, Fehlerseite: false
Seed 23: 325 Aktionen, Konsolenfehler: 0, Fehlerseite: false
```

## Gefundene und behobene Fehler während der Tests
- Safe-Liste zeigte HTML als Text an (fehlendes Escaping-Gegenstück) – behoben; seither prüft jeder Seitentest, dass kein Markup als Text erscheint.
- Einrichtungsassistent „Später“ führte sofort zurück in den Assistenten – behoben (Test).
- Der Planer zählte bereits vorhandene Gegenstände doppelt bzw. zerstückelte Mengen – behoben; ein zweiter Planlauf erzeugt keine Dubletten (Test).
- Safe sperrte sich beim Wechsel zur Kamera/Dateiauswahl und hätte das Scannen abgebrochen – behoben (Test).
- Inventar-Suche ohne Treffer löste einen JS-Fehler aus – behoben (Test).
- 3D-Modell war zu klein dargestellt, Fach-Beschriftungen überlappten – behoben.
- Notfallmodus im hellen Farbschema hatte unleserliche Farben – behoben.
- Im gesperrten Zustand konnte man über den Notfallmodus zu anderen Seiten navigieren – behoben (nur Notfall-Inhalt; Direktaufruf führt zurück zur Sperre; Test).
- Beispielpersonen hatten unvollständige Gesundheitsfelder – behoben.
- Mit Gradle 8.9 (zunächst im Wrapper) scheiterte der Build in dieser Umgebung an einer Rate-Limit-Antwort (HTTP 429) von Maven Central; der Wrapper nutzt jetzt Gradle 8.14.3, mit dem der Build verifiziert wurde. Auf deinem Rechner ist das normalerweise kein Thema.
