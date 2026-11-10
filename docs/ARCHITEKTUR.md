# Architektur

## Überblick
```
Android-App (Java, minSdk 29)                Web-Oberfläche (HTML/CSS/JS, keine Bibliotheken)
┌───────────────────────────────┐            ┌──────────────────────────────────────────┐
│ MainActivity  (WebView-Host)  │  lädt      │ index.html + css/app.css                 │
│  - blockiert alle fremden URLs│ ─────────▶ │ js/util  store  catalog  planner  recs   │
│  - Dateiauswahl, Kamera, Print│  assets/   │ js/bag3d  vault  ui-core  v-*.js  app.js │
│ NativeBridge (JavascriptIface)│  www/      └──────────────────────────────────────────┘
│  - SecureStore (Keystore GCM) │ ◀────────▶   window.NotfallAndroid.*  (Speicher, Foto, Biometrie, Alarme …)
│  - BiometricPrompt, Reminders │
│  - Alarme + BootReceiver      │
└───────────────────────────────┘
```
Die App lädt ihre Dateien aus `assets/www` über `https://app.notfall.invalid` (abgefangen in `shouldInterceptRequest`, nie über das Netz). Ein WebView-Container wurde beibehalten (wie in der Vorversion), weil er Oberfläche, 3D (Canvas) und WebCrypto in einem Stück testbar macht. Die Projekt-App-ID `de.notfall.familie` ist unverändert.

## Speicher
- `KV` (js/store.js): Schlüssel-Wert-Speicher. In Android → `SecureStore.java`: jede Datei AES-256-GCM-verschlüsselt mit einem Keystore-Schlüssel (`notfall_master_v1`, verlässt das Gerät nicht), Dateiname als AAD, atomares Schreiben (tmp → rename), `db.bak` als Vorversion. Im Browser (nur Tests/Entwicklung) → IndexedDB, **unverschlüsselt** (die App zeigt dann einen Hinweis).
- Schlüssel: `db` (JSON aller Haushalte, Einstellungen, Benutzer), `photo_<id>`/`thumb_<id>` (Fotos), `vault_meta`, `vault_index`, `vault_f_<id>` (Safe; zusätzlich mit Safe-Passwort verschlüsselt).
- Speichern: Änderungen werden 350 ms gesammelt; beim Verlassen der App (`pause`/`visibilitychange`) sofort.

## Datenmodell (Auszug)
```
DB { v, active, households[], settings{theme,scale,contrast,lockMin,secure,notif,plan}, users[] }
Haushalt { id, name, cfg(Antworten), setup{done,skipped,step,draft},
  people[{id,name,age,carryKg?,needs{allergies,intolerances,meds[],devices,aids,diet,care,mobility,hygiene}}],
  pets[], bags[{id,name,type,liters,ownKg,owner,color,comps[{id,name,slot,capL}],photos[] …}],
  items[{id,key,name,category,qty,unit,weightG,volL,kcal,liters,status(planned|owned|missing),packed,
         container(bag|home|car),bagId,compId,personId,petId,prio(must|rec|opt),why,expiry,photos[],…}],
  shop[], contacts[], meeting[], shelters[], rooms[], reminders[], docs[], tasks[], recs{}, plan{}, usage[] }
```
Wichtig: Der **Plan** erzeugt Gegenstände mit Status `planned` („zu prüfen“). „Habe ich“ → `owned`, „Fehlt“ → `missing` + Eintrag in der Einkaufsliste. Rechenwerte (Reichweite, Packgewicht) zählen je nach Zweck nur bestätigte (`owned`) bzw. alle vorgesehenen Positionen.

## Wichtige Module
- `planner.js`: Bedarf (Wasser/kcal/Tragfähigkeit nach Alter), `generateDesired` (≈ 100 Vorlagen aus `catalog.js` → Regeln), `applyPlan` (idempotent, mischt Vorhandenes), `assignToBags`/`autoPack` (Rucksack/Fach), `bagStats`, `suggestBalance`, `calcSupplies`, Aufgaben/Erinnerungen/Kontakte/Dokumentenliste, Beispielhaushalt.
- `recs.js`: reine Funktion `computeRecs(H, S)` → Liste mit `id`, Stufe, Begründung, Quelle, Aktion. Zustand (ausgeblendet/erledigt/Notiz) liegt in `H.recs`.
- `bag3d.js`: eigener kleiner 3D-Renderer (Perspektive, Rückseitenentfernung, Flächensortierung, Treffertest per Polygon). Sieben Modelle aus abgeschrägten Boxen, Fach ↔ „Slot“.
- `vault.js`: Safe-Kryptografie; `store.js`: Backup (`buildBackup`/`readBackup`/`restoreEntries` mit Rollback).
- `ui-core.js`: Router (`#/…`), Shell, Dialoge, Formularbausteine, Sperrbildschirm; `h`-Template-Funktion escaped alle Variablen automatisch.

## Sicherheit
- INTERNET-Berechtigung nur für den vom Nutzer gestarteten Kartendownload (nativer HTTPS-Abruf); die WebView lädt weiterhin nur die eigene Herkunft, fremde Adressen werden blockiert. `allowBackup=false`; CSP; `JavascriptInterface` nur für die eigene Herkunft erreichbar.
- PIN: PBKDF2 (150.000 Iterationen, Salt), 5 Fehlversuche → wachsende Wartezeit.
- Safe-Passwort/Backup-Passwort: PBKDF2-SHA256 310.000 Iterationen, AES-256-GCM.
- Benachrichtigungstexte enthalten keine Gesundheitsdaten; Sperrbildschirm-Sichtbarkeit „privat“.

## Änderungen in 2.1 (Fokus-Update)
- Datenmodell Version 4: Person erhält `birth`, `role`, `photo`, `organ`, `share{…}` (Freigabe je Feld, Standard aus), `passContacts[≤3]`; Gegenstand erhält `lastMinute` und `role`; Haushalt erhält `box{enabled,days}`. Vor der Umstellung wird der alte Stand als `db_vor_v4` gesichert.
- Neue Module: `v-pass.js` (Notfallpass, Kontakte, QR, Druckkarte), Packanleitung (`packSteps` in `planner.js`), 2D-Fachansicht (`bag2d` in `v-bags.js`).
- QR-Code: mitgelieferte Bibliothek `js/vendor/qrcode.js` (qrcode-generator 1.4.4, MIT, Kazuhiko Arase), keine Netzabfrage.
- Entfallen: `v-people.js`, `v-rooms.js`; Navigation auf Start, Taschen, Packliste, Notfallpass, Mehr reduziert.

## Änderungen in 2.2 (Gesamtauftrag)
- **Offline-Karten:** `map.js` (Web-Mercator-Kachelmathematik, eigener Canvas-Kartenrenderer ohne Fremdbibliothek, Download-Manager mit 4 parallelen Abrufen, Grenze 15.000 Kacheln/Zoom 17). Android: `MapStore.java` speichert Kacheln als Dateien unter `files/maps/<paket>/` (öffentliche Daten, unverschlüsselt), `httpGet` nur HTTPS, `importMbtiles` liest Raster-MBTiles (TMS-Zeilen werden umgerechnet). Paket-Metadaten in `DB.maps`. Kacheln sind **nicht** im Backup; Pakete ohne Kacheln werden beim Start entfernt.
- **Probealarm:** Daten `H.alarms[]` und `H.alarmResults[]`. Termine werden als Ereignis `kind:'test'`, `exact:true`, `route:'#/sos?test=…'` an `Reminders.java` übergeben; eigener Kanal „Probealarm“ (hohe Priorität, Alarmton, Vibration); `setExactAndAllowWhileIdle`, wenn erlaubt, sonst ungefähr. `ReminderReceiver` protokolliert die Auslösung (`alarmLog`), das Antippen öffnet über `onNewIntent` die Route in der WebView.
- **Notfall-Schnellübersicht:** eine Seite für manuellen Aufruf und Probealarm, mit Lage-Auswahl (eigene Checkliste, klar getrennt von amtlichen Anweisungen) und Taschen-Hinweisen.
- **Notfallpass:** neue Felder `pickup`, `doctor`, `confirmedBy`, `custom[]`, `hide{}`, `card{size,lang,twoSided,mods[]}`; Medikamente mit Zweck, Einnahme, Aufbewahrung, Notfallmedikament.
- **Gegenstände:** `expiryType` (`mhd` / `use`).
