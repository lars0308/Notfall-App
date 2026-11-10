# Feature-Matrix (Stand Version 2.2.0)

Entscheidung je Funktion der Version 2.0: **behalten / vereinfacht / verschoben / entfernt**, mit Datenmodell und Migrationsrisiko. Vor jeder Umstellung sichert die App den alten Datenstand unverändert unter `db_vor_v4`; es wird nichts gelöscht.

| Funktion (2.0) | Entscheidung | Jetzt (2.1) | Daten / Migration |
|---|---|---|---|
| Rucksäcke, Fächer, Gegenstände, Fotos, Notizen | behalten | Kernbereich „Meine Taschen“; Tasche kopieren neu | unverändert übernommen (getestet) |
| 3D-Rucksackansicht | vereinfacht | **2D-Fachansicht ist Basis**, 3D per Umschalter optional | keine Änderung |
| Fach-Vorschlag | behalten + erweitert | **Packanleitung Schritt für Schritt** mit Begründung, „Neu packen“ | neues Feld `lastMinute` je Gegenstand (Standard: aus) |
| Einrichtungsassistent (7 Formularseiten) | vereinfacht | **Packassistent: eine Frage pro Schritt**, Antwortkarten, Auto-Speichern | alte Antworten (`cfg`) bleiben; Hausvorrat-Ziele werden nicht mehr abgefragt |
| „Ausrüstung prüfen“ | behalten | „Packliste“ (Offen / Fehlt / Vorhanden) | unverändert |
| Empfehlungen (5 Reiter, 7 Aktionen) | vereinfacht | „Was fehlt?“ je Tasche und gesamt: Auf Liste / Habe ich / ausblenden | Zustände (`recs`) bleiben |
| Einkaufsliste mit Budget | vereinfacht | kleine Einkaufsliste, Summe statt Budgetverwaltung | Einträge bleiben; Budgetwert bleibt gespeichert, wird nicht mehr angezeigt |
| Hausvorrat (Reichweite, Verbrauch, Auffüllen, Barcode) | entfernt als Pflicht → **optionale Notfallkiste** | Kiste nur nach „Kiste anlegen“; Menge, MHD oder Verbrauchsdatum, „zuerst verbrauchen“; keine Verbrauchsbuchung, kein Barcode | vorhandene Vorräte erscheinen automatisch als Kiste; Verbrauchsprotokoll (`usage`) bleibt ungenutzt gespeichert |
| Lagerort-Bewegungen | entfernt | nur fester Lagerort der Tasche und Fach | Feld `place` bleibt |
| Personenprofile + Gesundheit | behalten + erweitert | **Notfallpass**: Geburtsdatum, Rolle, Foto, Krankheiten, Blutgruppe, Hinweise, Organspende, Freigabe je Feld | neue Felder, alle Freigaben anfangs **aus** (getestet) |
| Notfallkontakte | behalten + erweitert | bis zu **3 priorisierte Kontakte je Person**, Foto, Schnellwahl | Kontakte bleiben; Platzhalter-Kontakte werden nicht mehr erzeugt |
| Kontaktkarte drucken | erweitert | **Notfallkarte mit QR-Code** (Text, offline lesbar), PDF/Druck | – |
| Notfallmodus | vereinfacht, mit Lagen | Notruf, Lage-Checkliste, freigegebene Pässe, Treffpunkte, Lagerort/Packstatus | – |
| Treffpunkte | behalten, erweitert | Zusatzmenü „Karte & Treffpunkte“, Position auf der Karte | unverändert; vorhandene Ausweichunterkünfte werden weiter angezeigt |
| Erinnerungen | behalten | Kontrollen, Ablaufdaten, flexible Intervalle | unverändert |
| Backup (verschlüsselt) | behalten | unverändert, inkl. Pässen und Fotos | – |
| Mehrere Haushalte | behalten (nachrangig) | unter Einstellungen | unverändert |
| Benutzer-/Rollenverwaltung | entfernt | **eine App-PIN**, optional Biometrie | vorhandene Benutzer funktionieren weiter; neue Verwaltung entfällt |
| Schutzräume | entfernt | kein Menü mehr | Einträge und Fotos bleiben in den Daten (und im Backup) |
| Dokumenten-Safe, Dokumenten-Checkliste | verschoben (nicht v1) | Safe nur sichtbar, wenn bereits einer angelegt war | verschlüsselte Dateien bleiben nutzbar |
| Bereitschafts-Prozentwerte, Aufgabenliste | entfernt | „X von Y gepackt · N offen · nächste Kontrolle“ | Aufgaben bleiben gespeichert |
| Haustiere (Alter, Gewicht, Bedürfnisse) | vereinfacht | Tierart als Kriterium für die Packliste | vorhandene Angaben bleiben |
| Offline-Karten | **neu in 2.2** | Gebiet herunterladen (eigener Kartenserver), MBTiles-Import, Offline-Anzeige, Treffpunkte auf der Karte | `DB.maps`, Kacheln als Dateien; nicht im Backup |
| Probealarm | **neu in 2.2** | Datum + Uhrzeit, Wiederholung, 9 Übungslagen, TEST-Kennzeichnung, Auswertung | `alarms`, `alarmResults` |
| Notfall-Schnellübersicht mit Lage | **neu in 2.2** | Lage wählen → eigene Checkliste (getrennt von amtlichen Anweisungen), Taschen-Hinweis „bereithalten / mitnehmen / nicht danach suchen“, „Bei Abreise mitnehmen“ | – |
| Kartendesigner Notfallkarte | **neu in 2.2** | Module, Reihenfolge, Vorder-/Rückseite, Scheckkarte/A6, Deutsch/Englisch, Vorschau, Bestätigung vor dem Druck | `card` je Person |
| Pass-Baukasten | **erweitert in 2.2** | eigene Felder, Felder ausblenden, Abholberechtigte, Arzt, „bestätigt von“, Medikamente mit Zweck/Einnahme/Aufbewahrung/Notfallmedikament | neue Felder, Standard privat |
| Vorratsrotation (Kiste) | **erweitert in 2.2** | MHD vs. Verbrauchsdatum, „zuerst verbrauchen“ | `expiryType` |
| QR-Etikett für Taschen | **neu in 2.2** | Inhalt als Text-QR, ohne Gesundheitsdaten | – |
| Amtliche Warn-Pushs, Familien-Sync, QR-Webseite (Variante B) | offen (brauchen Server) | Architektur in [ONLINE-ARCHITEKTUR.md](ONLINE-ARCHITEKTUR.md) | – |
