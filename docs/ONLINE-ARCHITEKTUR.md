# Online-Erweiterungen: Architektur (nicht umgesetzt)

Diese drei Funktionen aus dem Gesamtauftrag brauchen einen Server, Hosting und Betriebsentscheidungen. Sie sind **nicht** in der App enthalten und werden nirgends als fertig angezeigt. Hier steht, wie sie sauber gebaut werden könnten.

## 1. Amtliche Warnungen mit Push (auch bei geschlossener App)
**Warum ein Server nötig ist:** Eine App kann nicht zuverlässig im Hintergrund regelmäßig Warnquellen abfragen (Android-Energiesparen, Doze, App-Standby). Zuverlässig zugestellt wird nur per Push.

```
Amtliche Quellen ──► Warn-Server ──► Firebase Cloud Messaging ──► App (Benachrichtigung)
 (NINA/MoWaS-Daten,    - regelmäßige Abfrage                         - öffnet die vorhandene
  DWD, Länder-HWZ)     - Abgleich mit Regionen                          Notfall-Schnellübersicht
                       - Duplikate, Aufhebungen                         mit amtlichem Text
```
- **Quellen:** nur dokumentierte, frei nutzbare Schnittstellen (z. B. die öffentliche Warn-API des Bundes zu NINA, DWD-Open-Data). Nutzungsbedingungen vor dem Start prüfen und im Projekt ablegen.
- **Regionen statt Standort:** Die App meldet nur Amtliche Regionalschlüssel (Kreisebene) der gespeicherten Orte, keinen Live-Standort. Kein Konto; Gerät wird über ein zufälliges Push-Token adressiert, das der Nutzer jederzeit löschen kann.
- **Darstellung:** amtliche Stufe, Quelle, Zeit, Region, vollständiger Behördentext und Original-Link – getrennt von der eigenen Checkliste der App (die es schon gibt: Lage-Auswahl in der Notfallansicht). Stadien *angekündigt / akut / aufgehoben* aus den Quelldaten, **keine eigene Skala**, keine Herabstufung.
- **Ehrlichkeit:** Letzter erfolgreicher Abruf sichtbar; ohne Netz „keine aktuellen Daten“ statt alter Warnungen. Kein Ersatz für NINA, Cell Broadcast und Sirenen.
- **Aufwand:** Server (z. B. kleiner Dienst mit Cron), FCM-Projekt, Datenschutzerklärung, Betrieb/Monitoring.

## 2. Familien-Synchronisierung (zwei oder mehr Handys)
- **Verschlüsselt Ende-zu-Ende:** Haushalts-Schlüssel wird beim Einladen per QR-Code von Gerät zu Gerät übergeben; der Server sieht nur verschlüsselte Datenpakete.
- **Datenmodell:** Jede Änderung als Ereignis (Objekt-ID, Feld, Wert, Zeitstempel, Gerät). Gleichzeitige Änderungen am selben Feld werden **angezeigt** und vom Nutzer entschieden – keine stillen Überschreibungen.
- **Standard:** Taschen, Packlisten, Einkaufsliste, Treffpunkte teilen; **Gesundheitsdaten und Notfallpässe nur auf ausdrückliche Freigabe je Person**.
- **Offline zuerst:** lokal ändern, später abgleichen; Geräte entfernen widerruft den Schlüssel (neuer Haushalts-Schlüssel).
- Bis dahin: Abgleich über die verschlüsselte Backup-Datei.

## 3. QR-Notfallpass Variante B (Webseite mit Fotos)
Variante A (Text im QR, offline) ist umgesetzt. Variante B:
- Pro Pass eine zufällige, nicht erratbare HTTPS-Adresse (≥ 128 Bit Zufall), keine fortlaufenden IDs.
- Server speichert nur die **ausdrücklich freigegebenen** Felder und Fotos, verschlüsselt; Schlüssel steckt im Fragment der URL (`#…`), damit der Server die Inhalte nicht lesen kann.
- Widerruf und Neuvergabe in der App („Code ungültig machen, neu drucken“); Ablaufdatum optional.
- Schutz gegen massenhaftes Auslesen: Rate-Limit, keine Verzeichnis- oder Suchfunktion, `noindex`.
- Kinder: standardmäßig nur Name, Kontakte, wichtigste Allergie; nie Adresse, Akten oder Dokumente.
- Klarer Hinweis auf der Karte: „Webansicht braucht Internet“. Die gedruckte Karte trägt die wichtigsten Angaben weiterhin als Klartext.
