# Umgesetzte Funktionen (Abgleich mit dem Arbeitsauftrag)

Legende: ✅ umgesetzt und getestet (siehe Testergebnisse) · 🟡 umgesetzt mit Einschränkung · 📱 Teil läuft in Android-Code, nicht auf Gerät geprüft · ⬜ nicht umgesetzt

## 1/2 Einrichtungsassistent
| Anforderung | Status |
|---|---|
| Erster Start, überspringbar, zwischenspeichern („Später“), fortsetzen, erneut starten | ✅ |
| Schritt 1: alle Vorsorge-Optionen (Rucksäcke 24/48/72 h, Evakuierung, Familie, Hausvorrat 3/7/10/14/30 Tage, Stromausfall, Hochwasser, Sturm, Brand, Schutzraum, Auto, Haustier, individuell) | ✅ (🟡 „Individuelles Szenario“ ist ein Freitext ohne eigene Planungsregeln) |
| Drei Strategien (zu Hause bleiben / Notunterkunft / Selbstversorgung unterwegs) – beeinflussen den Plan (z. B. Schlafsack, Zelt, Tarp, Filter, Kocher, Vorrat) | ✅ |
| Schritt 2: Erwachsene/Kinder, Alter, Namen, Haushaltstyp, Haustiere (Art, Anzahl, Alter, Gewicht, Bedürfnisse), Unterstützungsbedarf | ✅ (🟡 Haushaltstyp wird nur gespeichert/angezeigt) |
| Schritt 3: Land, Region, PLZ/Ort (freiwillig), Wohnform, Keller, Schutzraum, Kamin, Kochen ohne Strom, Wasser-/Lebensmittelvorrat (mit Menge), Auto, Ausweichunterkunft; keine Pflicht-Adresse | ✅ (🟡 „Keller/Schutzraum möglich/Ausweichunterkunft“ werden erfasst, lösen aber keine eigenen Regeln aus) |
| Schritt 4: Allergien, Unverträglichkeiten, Medikamente (mit Ablaufdatum), Geräte, Hilfsmittel, Ernährung, Pflege, Einschränkungen, Hygiene – pro Person, freiwillig, verschlüsselt gespeichert | ✅ 📱 (Keystore) |
| Schritt 5: vorhandene Ausrüstung (16 Kategorien mit Anzahl) und Rucksäcke/Taschen → direkt ins Inventar, Zuordnung zu Personen/Rucksäcken | ✅ |
| Schritt 6: Zeitraum 24/48/72 h, 7/10/14/30 Tage, individuell | ✅ |
| Schritt 7: automatisch Rucksäcke, Packlisten je Person, Familienausrüstung, Hausvorrat, Einkaufs-/Prüfliste, Gewicht je Rucksack, Wasser- und Kalorienbedarf, Erinnerungen, Hinweise, Notfallkontakte (Notrufnummern + Platzhalter), Dokumenten-Checkliste, offene Aufgaben | ✅ (Einkaufsliste entsteht nach deiner Prüfung „Fehlt“, damit nichts doppelt gekauft wird) |
| Alles editierbar | ✅ |

## 3 Rucksackverwaltung
| Anforderung | Status |
|---|---|
| Beliebig viele Rucksäcke/Taschen/Koffer, 9 Typen | ✅ |
| Hersteller, Modell, Volumen, Eigengewicht, empfohlene Zuladung, Besitzer, Einsatzbereich, Ort, Fotos, Anzahl Fächer, Hüft-/Brustgurt, Trinksystem, Außenbefestigung | ✅ (🟡 Gurte/Trinksystem/Außenbefestigung werden gespeichert, beeinflussen die 3D-Darstellung nicht) |
| Aufteilungsvorschlag nach Typ, Volumen, Tragfähigkeit, Szenario, Personen, Alter | ✅ |
| Interaktive 3D-Ansicht: 7 Grundformen, drehen, zoomen, Vorne/Hinten/Seiten/Oben, Fächer hinzufügen/umbenennen/entfernen, Gegenstände Fächern zuweisen/verschieben, Fach antippen → Inhalt, Gewicht je Fach, Auslastung, Gesamtgewicht, Packstatus farbig | ✅ (🟡 schematisch) |
| Fotos des echten Rucksacks | ✅ 📱 (Kamera) |
| Wichtige Gegenstände werden bei vollem Rucksack nicht gestrichen, sondern deutlich gemeldet | ✅ |

## 4 Empfehlungen und Fehlteilanalyse
✅ 40+ Regeln in drei Stufen (Notwendig/Empfohlen/Optional), jede mit Begründung und Quellenangabe: Lampe ohne Batterien, Filter ohne Transport/Aufbereitung, Kocher ohne Kochgeschirr/Brennstoff/Zünder, Schlafsack-/Isomatten-/Zeltzahl, Kind ohne Wechselkleidung/Windeln/Babynahrung, Rucksack zu schwer/zu voll, Wasser-/Lebensmittel-Reichweite, Medikamente fehlen/laufen ab, Haustier ohne Transportbox/Futter/Impfpass, Rauch-/CO-Melder, Radio, Powerbank, Auto-Pflichtausrüstung, Kontakte, Treffpunkte, Ausweichunterkunft, Bargeld, Dokumente, Schutzraum-Risiken, überfällige Kontrollen, Budget u. a.
Aktionen: akzeptieren, Gegenstand hinzufügen, auf Einkaufsliste, als vorhanden markieren, Alternative wählen, ausblenden (wieder einblendbar), eigene Notiz ✅

## 5 Einkaufsliste und Budget ✅
Alle geforderten Felder, Gesamtkosten, Budget mit Warnung, „Gekauft“ übernimmt den Gegenstand ins Inventar (mit Preis, Datum, Ablaufdatum), Doppelkauf-Erkennung gegen Inventar und Plan.

## 6 Gegenstände ✅
Detailseite mit allen geforderten Feldern (Name, Beschreibung, Kategorie, Anzahl, Gewicht, Volumen, Fotos, Notizen, Kaufdatum, Ablaufdatum, Zustand, Ort, Rucksack/Fach, Preis, Anleitung (Link + Fotos), Kaufbeleg (Fotos), Erinnerungsintervall, Packstatus). Hinzufügen, ändern, duplizieren, verschieben, archivieren, löschen. 📱 Kamera.

## 7 Hausvorrat ✅
Mengen, Lagerorte, Mindestbestand, Ablaufdaten, Verbrauch erfassen, Auffüllen, Reichweite (Wasser/Lebensmittel, Schätzwert, nur aus bestätigten Positionen), Fehlübersicht, Fotos/Notizen, Verbrauchsprotokoll. 🟡 Barcode: nur wenn die WebView `BarcodeDetector` bietet, sonst Nummer eintippen; kein Online-Produktkatalog.

## 8 Verschlüsselter Dokumenten-Safe
✅ Eigenes Passwort (PBKDF2 310.000 Iterationen + AES-256-GCM), Dateien **und** Metadaten verschlüsselt (Test prüft Speicher auf Klartext), PDF-/Foto-Import, Scannen (Kamera + Kontrast), Ordner, Kategorien, Suche, Passwort ändern, Export einzelner/ausgewählter Dokumente (mit Warnung), Backups verschlüsselt. 📱 Biometrische Entsperrung (Keystore-Schlüssel mit Biometrie-Pflicht). 🟡 keine PDF-Vorschau, keine Kantenerkennung beim Scannen.

## 9 Familie, Benutzer, Kontakte
✅ Personenprofile, mehrere Haushalte, mehrere Benutzer mit PIN, Rollen/Berechtigungen (Gesundheit, Safe, Notfall-Medizin, Bearbeiten, Einstellungen), Brute-Force-Bremse, Auto-Sperre, Notfallkontakte (alle geforderten Felder inkl. Priorität und alternativer Kontaktweg), ICE, Treffpunkte, Ausweichunterkünfte, Kontaktkarte zum Drucken 📱, offline. ⬜ Synchronisierung mehrerer Geräte (nicht gefordert als Voraussetzung; nur Backup-Abgleich). 🟡 Rechte sind Oberflächen-Rechte (siehe Einschränkungen).

## 10 Erinnerungen und Benachrichtigungen
✅ Planung/Intervalle (einmalig, monatlich, vierteljährlich, halbjährlich, jährlich, frei), automatische Kontrollen (Rucksack, Powerbank, Batterien, Wasser, Vorrat, Kinderkleidung, Medikamente, fehlende Gegenstände, Backup), Ablaufwarnungen (Vorlauf einstellbar, 7 Tage, am Tag), Kontrollintervall je Gegenstand, eigene Termine. 📱 Lokale Android-Benachrichtigungen auch bei geschlossener App (AlarmManager, Boot-Neuplanung) – Energiesparmodi der Hersteller können abweichen.

## 11 Notfallmodus ✅
Immer erreichbare „Notfall“-Taste. 112 & Landesnummern (nur Wählansicht), Notfallkontakte, Treffpunkte, Unterkünfte, medizinische Hinweise (mit Berechtigung bzw. Einstellung), persönlicher Plan + Notizen, Packstatus je Rucksack mit fehlenden Pflichtteilen, Link zum Safe, Hinweise auf offizielle Warnungen (NINA, DWD, Alertswiss …), Evakuierungs-Checkliste ohne pauschale Handlungsanweisungen; Vorrang der Behörden. Auch ohne Entsperren nutzbar (eingeschränkt, einstellbar).

## 12 Schutzräume ✅
Name, Lage, Größe, Fotos, Zu-/Ausgänge, Lüftung, Beleuchtung, Wasser, Sanitär, Lagerorte, Notizen, Checkliste, 10 Risikomarkierungen. Jeder Raum trägt dauerhaft „Nicht fachlich geprüft“; es gibt keine Einstufung als sicher.

## 13 Design ✅
Deutsch, Hell/Dunkel/System, Schriftgröße (3 Stufen), Hoher Kontrast, flache Flächen ohne Verläufe, klare Signalfarben (Notwendig rot, Empfohlen gelb, Optional grau, OK grün, Aktion blau), sichtbare Schaltflächen mit 48-px-Zielen, Bottom-Navigation (Handy) / Seitenleiste (Tablet), Fortschrittsanzeigen, Karten, Suche, Filter, keine Werbung, keine Registrierung. Dashboard mit allen geforderten Kennzahlen; der „Vorbereitungsstand“ ist ausdrücklich als Planungsstand und nicht als Sicherheitsgarantie beschriftet.

## 14 Beispielhaushalt ✅
Optional ladbar/löschbar (2 Erwachsene, Kind 3 J., Trekking 55 L, Tactical 40 L, 54 l Wasser, 2 Filter, 2 Powerbanks (1 solar), Batterieradio, Fenix-Lampe, 2 Stirnlampen, Esbit- und Campingkocher, Bushcraft-Ausrüstung, Erste-Hilfe, Schlafsäcke, Isomatten, Tarps, Zelte). Standardmäßig sind **keine** persönlichen Daten eingebaut.

## 15 Technik ✅
Android 10+, Offline (keine INTERNET-Berechtigung), persistente Speicherung mit Sicherungskopie der Datenbank, Keystore-Verschlüsselung 📱, optionale Biometrie 📱, Fotoverwaltung mit Vorschaubildern, Backup/Restore mit Rollback, CSV-Export (Inventar, Einkaufsliste), Übernahme von Daten der Vorversion, sparsame Hintergrundaktivität (keine Dienste, nur geplante Alarme).
Weitere Einstellungen: Farbschema, Schriftgröße, Kontrast, Auto-Sperre-Zeit, Screenshot-Schutz, Notfallinfos auf Sperrbildschirm, Uhrzeit & Vorlauf der Erinnerungen, Planungswerte (Wasser, kcal, Reserve, Tragfähigkeit, Budget), Backup, Haushalte, Benutzer, Daten löschen.
