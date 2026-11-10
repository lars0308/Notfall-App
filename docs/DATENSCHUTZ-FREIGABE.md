# Datenschutz- und Freigabekonzept

## Grundsätze
- **Lokal zuerst:** Alle Daten liegen auf dem Gerät. Kein Konto, keine Cloud, keine Analyse, keine Werbung.
- **Verschlüsselt gespeichert:** App-Datenbank, Fotos und Notfallpässe sind mit einem Schlüssel aus dem Android-Keystore verschlüsselt (AES-256-GCM). Backups sind zusätzlich mit einem eigenen Passwort verschlüsselt.
- **Netz nur auf Knopfdruck:** Die einzige Netzverbindung ist der Kartendownload, den der Nutzer selbst startet (nur HTTPS, nur an den eingetragenen Kartenserver). Die Oberfläche selbst kann keine fremden Adressen laden.

## Freigabe im Notfallpass
| Stufe | Was | Wer sieht es |
|---|---|---|
| Privat (Standard) | alle Gesundheitsangaben, Geburtsdatum, Foto, Organspende, eigene Felder | nur in der entsperrten App, im Profil |
| Freigegeben (pro Feld, bewusst angehakt) | genau die angehakten Felder | Notfallpass-Ansicht, Notfallmodus (auch ohne Entsperren, abschaltbar), QR-Code, gedruckte Karte |
| Ausgeblendet | Module, die nicht gebraucht werden | niemand; bleiben auch bei Freigabe verborgen |

- **Kontakte im Pass:** höchstens drei, ausdrücklich gewählt. Übrige Kontakte, Adressen, Taschen-Inhalte mit Medikamenten erscheinen nicht.
- **Vor dem Druck** zeigt die App eine Liste mit allem, was auf der Karte stehen wird, inklusive Fotos und QR-Inhalt („Das steht auf der Karte“).
- **QR-Code:** enthält nur freigegebene Angaben als Text; die App zeigt vorher „Jeder, der den Code scannt, kann das lesen“.
- **Notfallmodus:** Unter „Bei Abreise mitnehmen“ werden Medikamente und Hilfsmittel nur allgemein genannt, nie mit Namen.
- **Taschen-Etikett (QR):** listet den Inhalt ohne Medikamente und Gesundheitsangaben.
- **Benachrichtigungen:** Erinnerungstexte enthalten keine Gesundheitsdaten; Probealarm ist immer als „TESTALARM – KEINE ECHTE GEFAHR“ gekennzeichnet.
- **Kinder:** Freigaben setzt die Person, die die App bedient (in der Regel ein Elternteil). Es gibt keine automatische Veröffentlichung und keine Online-Funktion.

## Exporte (bewusst unverschlüsselt)
Gedruckte Karten/PDF, Packlisten, CSV-Exporte und exportierte Safe-Dokumente sind unverschlüsselt. Die App weist beim Export darauf hin.
