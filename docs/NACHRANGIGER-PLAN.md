# Nachrangiger Plan (nicht Teil von v1)

## Offline-Karten – offen, braucht eine Entscheidung
In Version 2.0 gab es keine Karten; das Fokus-Update führt sie als „beibehalten“. Sie sind **noch nicht gebaut**. Treffpunkte lassen sich bereits speichern (Name, Adresse, Notiz).
Was dafür nötig ist:
- **Internet-Berechtigung** für den Karten-Download (bisher hat die App bewusst keine).
- **Kartenquelle:** Die öffentlichen OpenStreetMap-Kachelserver erlauben keinen Massen-Download. Nötig ist ein Anbieter mit Offline-Lizenz oder selbst erzeugte Kartenpakete (z. B. Vektor-Kacheln je Region).
- Darstellung mit einer mitgelieferten Kartenbibliothek, Treffpunkte als Markierungen, kein Routing.

## QR-Notfallpass Variante B (Webseite mit Fotos)
Umgesetzt ist Variante A (Text direkt im QR-Code, offline lesbar, für jeden lesbar). Variante B braucht einen Server: HTTPS-Seite je Pass, zufällige nicht erratbare Adresse, Widerruf/Neuvergabe, Schutz gegen massenhaftes Auslesen, keine Kinder-Gesundheitsdaten ohne Zugriffsschutz. Ohne Hosting-Entscheidung nicht sinnvoll umsetzbar.

## Warnmodul und Probealarm
Amtliche Warnungen mit Quelle und amtlicher Stufe, keine eigene Skala; zeitgesteuerter Testalarm, klar als TEST erkennbar. Ersetzt NINA/Cell Broadcast nicht. Braucht Internet-Berechtigung und eine amtliche Datenquelle.

## Familien-Synchronisierung
Gemeinsame Bearbeitung auf zwei Handys. Bis dahin: Abgleich über die verschlüsselte Backup-Datei.

## 3D-Ansicht
Bleibt optional. Keine weitere Arbeit, solange die 2D-Fachansicht reicht.

## Kartendesigner
Die Notfallkarte hat ein festes Layout (Foto, Kontakte, freigegebene Angaben, QR). Frei wählbare Reihenfolge, Vorder-/Rückseite und Sprachen sind nicht umgesetzt.
