# Song raten

Partyspiel für **ein** Handy, das im Kreis weitergegeben wird. Der DJ sucht einen Song, Spotify spielt ihn über die Bluetooth-Box, alle anderen raten den Titel.

Der Ton läuft in der installierten Spotify-App (App Remote), nicht im WebView. GuessTheSongScrapp streamt nichts, nutzt kein `preview_url` und kein Web Playback SDK.

## In OpenScr hinzufügen

1. OpenScr auf dem Android-Gerät öffnen. Es muss ein **SrvOpenScr-** oder **OpenScr-Build** sein, der die Spotify-Bridge schon enthält (`com.openscr.app.dev` bzw. `com.openscr.app`).
2. Auf „App hinzufügen“ tippen.
3. Diese URL einfügen:

```
https://github.com/Krust3nKaese3/GuessTheSongScrapp
```

4. Die Berechtigungen bestätigen:
   - **spotify** — Suche und Wiedergabe über die Spotify-App
   - **vibration** — kurzes haptisches Feedback, wenn der DJ auf den roten Stopp-Buzzer tippt
   - **storage** — den laufenden Spielstand über das vollständige Schließen von OpenScr hinaus behalten
   - **multiplayer** — Raum im selben WLAN oder Hotspot, über die OpenScr-Bridge

5. Die Box (Bluetooth-Lautsprecher) wie gewohnt mit dem Handy koppeln. Song raten verbindet sich nicht selbst mit dem Lautsprecher.

## Spotify vorbereiten

1. Spotify installieren und mit einem **Premium**-Account anmelden. Einen bestimmten Track (`spotify:track:…`) abspielen geht nur mit Premium.
2. Die **Client ID** in OpenScr auf dem Startbildschirm unter **Spotify** eintragen und speichern. Sie steht absichtlich nicht in diesem Repository und wird hier nicht abgefragt.
3. Im Spiel auf „Erneut prüfen“, „Anmelden“ und „Verbinden“ tippen, falls der Status das noch verlangt.

Ohne gespeicherte Client ID meldet die Bridge: „Keine Spotify Client ID hinterlegt. Bitte in den OpenScr-Einstellungen eintragen.“ Song raten zeigt diesen Hinweis und verweist auf die OpenScr-Einstellungen. GuessTheSongScrapp bekommt keinen Access-Token.

Dashboard, Redirect-URI und SHA1 stehen in der OpenScr-Doku: [SPOTIFY.md](https://github.com/Krust3nKaese3/OpenScr/blob/main/SPOTIFY.md).

## Regeln

Alle sitzen im Kreis. Ein Handy geht reihum. Gespielt wird, bis jemand auf **Spiel beenden** tippt. Danach kommt der Endstand. Die Punkte dieser Runde gelten bis zum Spielende. Dieselben Personen bleiben auf dem Handy gespeichert, ihre Allzeit-Statistik zählt über die Runden hinweg. Ein laufendes Spiel bleibt im OpenScr-Speicher erhalten, bis es mit **Spiel beenden** endet.

Jede Runde:

1. Wer das Handy hält, ist DJ. Zu Beginn jeder Runde wählt sich die Person aus der Liste und bestätigt das. Nach der Auflösung heißt es, das Handy weiterzugeben und den nächsten DJ ausdrücklich zu wählen. Ein falscher Name lässt sich mit **Zurück** zurücknehmen: auf der DJ-Wahl verschwindet die Markierung, nach **Ich bin der DJ** führt Zurück wieder zur Namensliste. Punkte und schon gestartete Songs bleiben. Dieselbe Taste steht bei **Wer hat geraten?** und bei **Wer hat ihn erraten?** und löscht dort die Markierung. Ist bei „Wer hat ihn erraten?“ noch niemand markiert, führt Zurück zurück zu „Wurde der Song erraten?“.
2. Der DJ sucht einen Track und tippt auf **Los**. Der Song startet von vorne. Jeder Track darf in diesem Spiel nur einmal gestartet werden.
3. Die anderen hören über die Box und rufen „Stopp“, wenn sie den Titel kennen. Der DJ tippt sofort auf den roten Buzzer. Schon beim Auflegen des Fingers (`pointerdown` / `touchstart`, nicht erst beim Loslassen) geht `pause` ohne Ausblendung raus und `buzzer.mp3` startet aus einem vorher dekodierten Puffer. Das Handy vibriert. Die Oberfläche wechselt erst danach.
4. Danach wird zuerst gewählt, **wer** geraten hat (alle außer dem aktuellen DJ), und dann **Ja** oder **Nein**.
5. Richtig: diese Person bekommt **+2**. Zuerst spielt `correct.mp3` bis zum Ende. Danach läuft der Song an der Pausestelle weiter und blendet ein. Titel und Interpret werden aufgelöst. Danach das Handy weitergeben.
6. Falsch: diese Person bekommt **−1**. Zuerst spielt `wrong.mp3` bis zum Ende. Danach läuft der Song an der Pausestelle in der bisherigen Lautstärke weiter, ohne Einblendung. Es darf wieder auf Stopp geraten werden.
7. **Überspringen** (während der Song läuft, auch nach einem Fehlversuch): **−3** für den DJ, der den Song aufgelegt hat. Danach Auflösung und Handy weitergeben.
8. Endet der Track von selbst, ohne richtigen Tipp und ohne Überspringen: „Wurde der Song erraten?“ Bei Ja: wer? (ohne den DJ) und **+2** für diese Person. Bei Nein: **−3** für den DJ. Danach Auflösung und Handy weitergeben.

War der Buzzer ein Versehen, kann der DJ „Versehentlich gedrückt“ tippen. Dann läuft der Song weiter und niemand bekommt Punkte.

Ein Spiel zählt vom ersten gestarteten Song bis **Spiel beenden**. Das Home-Icon auf dem Endstand öffnet danach die Lobby. Die Namen bleiben automatisch in der Liste, das nächste Spiel startet bei null. In einem Spiel darf jeder Track nur einmal über **Los** starten. Tippt der DJ **Los** bei einem Track, der in diesem Spiel schon gestartet wurde, bleibt die Suchseite offen, Spotify spielt nicht, und es erscheint genau „Song war schon an.“ Titel und Interpret dürfen dabei sichtbar bleiben. Andere Schreibweisen derselben Track-URI zählen als derselbe Song. Läuft der Song nach **Los** nie an und der DJ tippt **Zurück zur Suche**, darf derselbe Track erneut versucht werden. Überspringen, ein falscher Tipp mit Weiterlaufen, das natürliche Songende und ein späterer DJ lassen die Sperre bestehen.

## Empfehlungen

Auf der Suchseite des DJ gibt es den Button **Empfehlungen**. Es wird nichts geladen und nichts angezeigt, solange der DJ nicht darauf tippt. Während des Ladens zeigt der Button einen kurzen Ladezustand. Danach erscheinen höchstens drei Vorschläge, weniger wenn der Vorrat dünn ist. Gibt es keinen, steht ein kurzer Hinweis.

Die Vorschläge stammen aus allen Tracks, die in diesem Spiel schon gestartet wurden, vom ersten Song bis **Spiel beenden**. Das Home-Icon auf dem Endstand beginnt ein neues Spiel, die Liste gilt dann nicht mehr. Vor dem ersten gestarteten Song gibt es noch keine Empfehlungen. Der Hinweis erscheint, ohne Spotify zu fragen.

Die Liste gilt nur für den aktuellen DJ. Geht das Handy weiter (der nächste DJ wird bestätigt), ist sie weg. Ein späterer DJ sieht keine Tracks, die einem früheren DJ in diesem Spiel schon als Empfehlung angezeigt wurden. Ein angezeigter, aber nicht gestarteter Vorschlag darf weiter über die Suche und **Los** laufen. Nur ein echtes **Los** sperrt den Track. Tippt derselbe DJ im selben Suchgang noch einmal auf **Empfehlungen**, bleiben dieselben Vorschläge stehen.

## Spotify bricht mitten im Spiel ab

Nach „Spiel starten“ kann die Verbindung zu Spotify weg sein, zum Beispiel auf der DJ-Wahl, der Suche, während der Song läuft, beim Buzzer, beim Tipp, bei der Auflösung oder bei der Frage zum Songende. Dann erscheint auf dem aktuellen Bildschirm **Verbinden**.

Verbinden meldet bei Bedarf an und verbindet danach neu, über die Spotify-Bridge von OpenScr. Die Runde bleibt offen: dieselben Mitspieler, derselbe Punktestand, derselbe DJ, dieselbe Phase, dieselben schon gestarteten Songs, die Empfehlungen und die aktuelle Auswahl. Es startet kein neues Spiel. Lief gerade ein Song, geht die Wiedergabe danach an derselben Stelle weiter. Der Song wird dabei nicht übersprungen und nicht aufgelöst.

Die Lobby davor bleibt wie bisher: Erneut prüfen, Anmelden, Verbinden.

## Wenn die App mitten im Spiel schließt

Punktestand und der laufende Spielstand werden im Speicher von OpenScr festgehalten (`OpenScrBridge.storage`, auf dem Gerät AsyncStorage, getrennt pro OpenScrapp), sobald sich im Spiel etwas ändert. Ältere Builds legen dasselbe Objekt unter `EveryAppBridge` ab. GuessTheSongScrapp liest `window.OpenScrBridge` und fällt auf `window.EveryAppBridge` zurück. Die Speicher-Schlüssel bleiben unverändert. Dieselben Namen werden schon in der Lobby festgehalten, sobald jemand einen Namen hinzufügt, ändert oder entfernt (`songraten.lobby.v1`). Der laufende Spielstand bleibt unter `songraten.game.v1`. Der `localStorage` des WebViews reicht dafür nicht: OpenScr lädt die OpenScrapp mit `source={{ html }}` und ohne `baseUrl`, also ohne stabile Origin. `localStorage` kann in derselben Sitzung noch funktionieren, übersteht aber das vollständige Schließen von OpenScr nicht.

Deshalb steht **storage** in den Berechtigungen. Ist sie erteilt und eine Runde läuft, öffnet der nächste Start nach einem vollständigen Schließen wieder denselben Bildschirm. Namen müssen nicht neu eingetragen werden. Wurden Namen nur eingetragen und das Spiel noch nicht gestartet, öffnet sich die Lobby mit genau diesen Namen. Fehlt die Bridge oder die Berechtigung (zum Beispiel im Browser), läuft das Spiel weiter. Der Stand wird dann nicht über einen vollständigen Neustart hinweg wiederhergestellt.

Ein Spiel, das schon über **Spiel beenden** auf dem Endstand liegt, wird nicht als laufende Runde wieder geöffnet. Das Home-Icon führt ohne weitere Frage zur Lobby: dieselben Namen bleiben stehen, Punkte und Rundenstand sind leer. Ein späteres Öffnen zeigt diese Lobby und nicht den Endstand.

Im Speicher liegen Spieldaten, die Spielerliste und die Statistik. Keine Spotify-Client-ID, kein Secret und kein Token. Die Bridge ist `window.OpenScrBridge`, ersatzweise `window.EveryAppBridge`.

## Gespeicherte Spieler

Die Liste gilt für dieses Handy und ist das gemeinsame Format mit Werwolf. Neu angelegte Personen bekommen Vor- und Nachname, beide Pflicht, getrimmt. Die Id bleibt stabil. In der Runde steht nur der Vorname. Kommt derselbe Vorname in dieser Runde mehrfach vor (Vergleich normalisiert), sehen alle Betroffenen `Vorname N.`. Sind auch die Initialen gleich, steht der volle Nachname.

Normalisieren heißt: trim, Kleinbuchstaben, Diakritika weg (NFD, Combining Marks entfernt). Die Suche trifft Vorname, Nachname oder `Vorname Nachname`. Präfix-Treffer stehen vor Teiltreffern, danach alphabetisch. `ma` und `Bausch` finden Maximilian Bausch. Antippen übernimmt die gespeicherte Person. Wer schon in der Runde ist, erscheint nicht noch einmal.

Die Logik steckt abhängigfrei in `players.js` (`normalize`, `search`, `displayNames`, `createPlayer`), damit Werwolf dieselbe Datei nutzen kann.

Alte Lobby-Einträge, die nur einen Namen hatten, bleiben lesbar. Ein zweiteiliger Name wird in Vor- und Nachname geteilt, ein einteiliger bleibt Vorname. Die bisherige Sitz-Id in `songraten.lobby.v1` und `songraten.game.v1` bleibt eine Zahl, dazu kommt `pid` mit der stabilen Spieler-Id. Ein laufendes Spiel aus einer älteren Fassung lässt sich weiter öffnen. In die Allzeit-Statistik kommt es nur, wenn das Protokoll in dieser Fassung mit dem ersten Song begonnen hat.

## Statistik

Nach **Spiel beenden** schreibt das Handy ein kompaktes Protokoll, sofern mindestens ein Song gestartet wurde. Zielgröße 1 bis 3 KB pro Spiel. Alle angezeigten Werte werden daraus berechnet. Archiv-Summen sind die einzige zweite Form: wird der Schlüssel knapp, wandern die ältesten Spiele in Summen pro Spieler-Id. Die Ansicht addiert Archiv und Protokolle, neue Auswertungen gelten damit auch für ältere Spiele, soweit das Archiv die nötigen Summen hat.

In der Lobby öffnet **Gespeicherte Spieler** die Liste. Ein Tipp zeigt die Allzeit-Statistik dieser Person: Punkte, Spiele, Siege (nur bei alleiniger Führung), als DJ aufgelegte Songs mit Anzahl, erratene Songs mit den noch einzeln vorliegenden Sekunden und dem Durchschnitt.

## Speicher

OpenScr legt Werte als Text ab, höchstens **256 KiB pro Schlüssel** (262144 Bytes). Quelle: [docs/BRIDGE_API.md](https://github.com/Krust3nKaese3/OpenScr/blob/main/docs/BRIDGE_API.md) („Werte: Text, höchstens 256 KiB“) und `src/bridge/allowlist.ts` (`STORAGE_LIMITS.maxValueBytes = 256 * 1024`, Prüfung in `assertStorageValue`).

Eine Summe über alle Schlüssel setzt OpenScr in `StorageService.ts` nicht. Der Speicher läuft über `@react-native-async-storage/async-storage` **2.2.0** (`package.json` von OpenScr). Dessen Android-Standard ist eine SQLite-Datenbank von **6 MB** für die ganze Host-App: `android/config.gradle`, `getDatabaseSize()` („AsyncStorage has default size of 6MB“), und `ReactDatabaseSupplier.mMaximumDatabaseSize = AsyncStorage_db_size * 1024 * 1024`. OpenScr setzt `AsyncStorage_db_size_in_MB` im Repository nicht um. Die 6 MB teilen sich Host und alle OpenScrapps. Song raten hält das Protokoll deshalb unter der Schlüsselgrenze: ab etwa 192 KiB werden die ältesten Spiele ins Archiv gefaltet.

Schlüssel:

| Schlüssel | Inhalt |
| --- | --- |
| `songraten.game.v1` | laufende Runde, unverändert lesbar, zusätzlich `pid`, `first`, `last` und das laufende Protokoll |
| `songraten.lobby.v1` | Namensliste der Lobby, Sitz-Id plus `pid` |
| `songraten.players.v1` | `{"v":1,"players":[{"id":"p_<Zeit base36><4 base36>","first":"Maximilian","last":"Bausch","created":<ms>}]}` |
| `songraten.history.v1` | `{"v":1,"games":[…],"archive":{…}}` |

Ereignisse in einem Spiel, kurz gehalten: `r` Runde (DJ-Id, Spotify-Track-Id, Titel, Interpret), `b` Buzz (Spieler-Id, Sekunden seit Songstart), `v` Wertung (`ok`, Punkte, bei einem Treffer die Sekunden), `k` Überspringen, `d` Song zu Ende ohne Treffer, `z` Spielende. Archiv pro Spieler-Id: `points`, `games`, `wins`, `dj` und `hit` als Summen je Track.

## UX gegenüber der Rohfassung

Diese Abläufe sind gegenüber der eingefrorenen Rohfassung neu. Der Branch `roh` (Commit `6437c5dd`, Screenshots unter `roh-screenshots/`) bleibt unverändert und ist die Vergleichsbasis:

- Bricht Spotify mitten im Spiel ab, gibt es **Verbinden**, ohne die Runde abzubrechen oder den Punktestand zu verwerfen.
- Schließt sich die App mitten im Spiel oder stürzt sie ab, stellt der nächste Start den kompletten Spielstand aus dem OpenScr-Speicher wieder her und landet auf dem Bildschirm, auf dem die Runde stand. Dafür ist die Berechtigung `storage` nötig.
- Auf dem Endstand nach **Spiel beenden** sitzt ein Home-Icon im Kopf, im selben Icon-Stil wie das ✕ an den Namen. Die Beschriftung für Vorleseprogramme ist „Home“. Ein Tipp öffnet ohne weitere Frage die Lobby. Die Namen stehen dort automatisch weiter in der Liste. Punkte und der Stand der beendeten Runde sind gelöscht, ein neues Spiel fängt bei null an. Ein späteres vollständiges Schließen öffnet diese Lobby und nicht die beendete Runde.
- Mitspielernamen werden gespeichert, sobald ein Name hinzugefügt, im Feld geändert oder entfernt wird, auch bevor jemand auf **Spiel starten** tippt. Nach einem vollständigen Schließen steht die Lobby schon mit diesen Namen da. Liegt ein laufendes Spiel im Speicher, landet der Start wie bisher direkt in der Runde.
- Statt des synthetischen Pieptons liegen drei MP3s im Repo. Der Buzzer feuert beim Finger-runter: `pause` und `buzzer.mp3` starten im selben Moment, ohne auf die Bridge zu warten. Ein richtiger Tipp spielt `correct.mp3` zu Ende und blendet den Song danach ein. Ein falscher Tipp spielt `wrong.mp3` zu Ende und lässt den Song danach in normaler Lautstärke weiterlaufen. Spotify startet erst nach `ended`, damit der Effekt den Audio-Fokus behält. Die Warte-Obergrenze ist die Dateilänge plus 150 ms, ersatzweise 1,4 s.
- Solange ein Spiel läuft, bleibt das Display an: Lobby, Namenswahl, Wertung und die Zeit zwischen den Runden. Nach dem Spielende und über Home wird das wieder losgelassen. Zuerst der Screen Wake Lock, sonst ein stummes Mini-Video. Wird die Seite wieder sichtbar oder ein Spielstand wiederhergestellt, wird der Wake Lock neu geholt. Fehlt die API, passiert das ohne Fehlermeldung. Der Spielstand speichert das nicht.

Das sind gewollte Verbesserungen für den späteren Vergleich mit der Rohfassung, nicht das Verhalten von `roh`.

## Spoiler

Nur der DJ schaut während der Suche aufs Handy. In den Suchergebnissen und in den Empfehlungen stehen Titel, Interpret und Album, weil der DJ den Song aussucht.

Ab **Los** bis zur Auflösung (richtig, übersprungen oder nach dem Songende) zeigen Buzzer, Tipp und die Frage nach dem Songende weder Titel, Interpret, Albumname noch Cover. Empfehlungen stehen dort nicht. Der Spielerstatus aus Spotify wird auf diesen Schirmen nicht angezeigt.

## Soundeffekte

Drei kurze Dateien unter `assets/sounds/`. `correct.mp3` und `wrong.mp3` stammen von Pixabay (kostenlose Lizenz). Der Buzzer stammt von Mixkit, Credit und Lizenz stehen in `CREDITS.md`.

| Datei | Wann | Quelle |
| --- | --- | --- |
| `buzzer.mp3` | nach dem harten Stopp | Game show wrong answer buzz von Mixkit (ID 950), siehe `CREDITS.md` |
| `correct.mp3` | richtiger Tipp, danach blendet der Song ein | Correct von DRAGON-STUDIO |
| `wrong.mp3` | falscher Tipp, danach sofort volle Lautstärke | Error/Mistake Sound Effect von Lesiakower |

OpenScr lädt jede Datei des Repository von `raw.githubusercontent.com` (`FileSystem.downloadAsync`, binär). Beim Öffnen ersetzt die Laufzeit relative `src` von Audio-Elementen durch `data:audio/mpeg;base64,…`, derselbe Weg wie bei anderen Medien (`mimeForPath` kennt `mp3`). Die MP3s bleiben deshalb echte Dateien und stecken nicht als Base64 im Quelltext.

Alle drei Effekte laufen mit der einen Lautstärke `SFX_VOLUME` (0.4). Die Spotify-Lautstärke des Songs bleibt davon unberührt. Der Wert steht nicht im gespeicherten Spielstand.

`buzzer.mp3` wird beim Laden dekodiert (`AudioBuffer`), nicht erst beim Druck. Der Buzzer hängt an `pointerdown` und `touchstart` (`touch-action: manipulation`), damit nicht erst der Klick nach dem Loslassen und nicht die alte 300-ms-Wartezeit zählt. `pause()` und der Ton laufen in diesem Handler, bevor die Ansicht wechselt und bevor irgendetwas awaited wird. Fehlt der Puffer noch, spielt das vorhandene Audio-Element. Es wird dabei kein neues `Audio` angelegt und nichts dekodiert.

Der Song bleibt in der Spotify-App. Die Effekte spielt das WebView. Nur ein gültiger Buzzer, ein gültiges Ja und ein gültiges Nein lösen einen Effekt aus. „Versehentlich gedrückt“, Überspringen und das Songende bleiben ohne diese Töne. Lässt sich eine Datei nicht abspielen, läuft Pause und Wertung weiter, ohne Fehlerhinweis.

Einblenden nach einem richtigen Tipp heißt: Spotify-Lautstärke auf 0, Wiedergabe an der Pausestelle, dann in etwa 0,9 Sekunden zurück auf den vorherigen Wert (0…1). Dafür braucht die Bridge `setVolume` und optional `getVolume`. Die aktuelle OpenScr-Bridge hat `pause` und `resume`, aber keine Lautstärke. Dann startet der Song nach `correct.mp3` in der bisherigen Lautstärke. Der Stopp selbst ist immer nur `pause()`, ohne vorherige Rampe. Nach einem falschen Tipp wird die Lautstärke nie geändert. In beiden Fällen wartet der Song auf das Ende des Effekts, nicht länger als die Datei plus 150 ms.

## Bildschirm

Ab der Lobby beziehungsweise ab **Spiel starten** bis zum Spielende soll das Handy nicht von allein dunkel werden: in der Lobby, bei der Namenswahl, auf der Wertung, zwischen den Runden und auf dem Buzzer. Nach dem Spielende und über Home wird das wieder losgelassen. Die OpenScr-Bridge hat dafür keine Funktion. GuessTheSongScrapp macht es selbst.

Zuerst eine Keep-Awake-Funktion der Bridge, falls sie als Methode da ist. `docs/BRIDGE_API.md` nennt dafür noch keinen Namen. Das Spiel ruft sie nur auf, wenn eine dieser Funktionen wirklich existiert: `wake.enable`/`wake.disable`, `wake.acquire`/`wake.release`, `screen.keepAwake`/`screen.release`, `keepAwake.enable`/`keepAwake.disable` oder `keepAwake.acquire`/`keepAwake.release`. Sonst `navigator.wakeLock.request('screen')`. Wird die Seite verdeckt und wieder sichtbar, wird der Lock neu geholt, ebenso nach dem Wiederherstellen eines Spielstands. Fehlt die API oder lehnt sie ab, startet ein Tippen ein winziges, stummes, gelooptes Video ohne Tonspur. Lautstärke 0, `muted`, `playsinline`. Spotify und die drei Effekte bleiben unangetastet. Ein Fehler dabei bleibt unsichtbar.

Auf dem Endstand und nach Home werden Lock und Video losgelassen. Ein Tipp in der Lobby holt beides wieder. Unten steht klein, welcher Weg hält: `Wach: Wake Lock`, `Wach: Video` oder `Wach: wartet`. Das steht nicht in `songraten.game.v1`.

OpenScr setzt das HTML ohne `baseUrl`, also ohne sichere Origin. Die Wake Lock API gibt es nur im Secure Context. Im OpenScr-WebView sollte deshalb das stumme Video greifen. Unter https oder localhost nimmt der Browser den Wake Lock.

## Im Browser

Ohne OpenScr-Bridge erscheint ein kurzer Hinweis. Einzelspiel startet dort nicht und bricht nicht ab. Ton gibt es nur in OpenScr mit Spotify auf dem Host. Den Spielstand nach dem vollständigen Schließen gibt es nur in OpenScr, nachdem die Berechtigung `storage` erteilt wurde.

Gäste können ohne installierte OpenScrapp mitspielen, sobald OpenScr auf dem Host einen lokalen Webserver und ein Browser-Shim ausliefert. Der QR-Code dafür kommt von OpenScr (`multiplayer.showQr`), nicht aus diesem Spiel. Im Browser gibt es dieselbe Multiplayer-API unter `window.OpenScrBridge` (ersatzweise `window.EveryAppBridge`). Spotify, Vibration, Speicher, Statistik und das Spielerverzeichnis laufen dort nicht. Fehlt eine Funktion, passiert nichts weiter: kein Fehlerdialog. Die Suche des DJ geht als Anfrage an den Host. Die lokale Namensreihenfolge liegt in `localStorage`, und wenn der fehlt, nur im Speicher dieser Seite.

## Mehrspieler

Nach der Namensliste gibt es **Multiplayer**. **Spiel starten** bleibt das Einzelspiel. **Spiel anbieten** öffnet den Raum auf dem Host-Handy (Spotify). Andere Geräte sehen ihn in der Nähe, sonst per QR. Handys und Browser gehören keiner Person. Der Host ist die einzige Autorität für Stand, Namen, Punkte, Phase, DJ und den ersten Buzz. Er schreibt `songraten.game.v1`, `songraten.players.v1` und `songraten.history.v1`. Nach jedem Verbinden schickt er den vollen Stand. Wiederbeitritt läuft über `multiplayer.resume`, ohne Extra-Knopf. Ein kleiner Punkt zeigt den Raum, der Host mit Stern.

Nachrichten sind JSON, höchstens 32 KiB. Typen: `hello`, `ping`, `pong`, `state`, `lock`, `tie`, `reject`, `no`, `search`, `results`, `recs`, `los`, `searching`, `buzz`, `dj`, `back`, `back-ended`, `pick`, `judge`, `mistake`, `skip`, `ended-yes`, `ended-no`, `ended-who`, `next`, `start`, `end`, `home`, `add`, `create`, `rename`, `remove`. Der Gast schickt Absichten an den Host. Titel und Empfehlungen gehen nur an das suchende Gerät. In `state` fehlen Titel und Interpret bis zur Auflösung.

Buzz: lokaler Lock sofort, Zeitstempel plus laufende Nummer. Der Gast schätzt den Offset zum Host über Ping/Pong (kleinstes Delay gewinnt). Der Host sammelt 60 ms und wertet bereinigte Zeiten. Abstand unter 15 ms ist Gleichstand: niemand punktet, der Song läuft weiter. Der Host pausiert Spotify nach der Entscheidung, beim eigenen Druck sofort. Nur der Host spielt Buzzer, Richtig und Falsch, weiter mit der bisherigen `playSfx`-`ended`-Logik.

Die Namensliste verweist auf die Spieler-Ids des Hosts. Jedes Gerät darf hinzufügen, umbenennen und entfernen. Ein normalisiert doppelter Name wird abgelehnt. DJ und gerade gewählte ratende Person bleiben. Die Anzeigereihenfolge ist lokal (`songraten.order.v1`): eine hier bestätigte ratende Person rückt unter die festgesetzten Plätze. Versehentlich gedrückt ändert die Reihenfolge nicht.

`node test/logic.test.js` und `node test/multiplayer.test.js` prüfen Suche, Statistik, Buzz-Entscheidung, Reihenfolge und den öffentlichen Spielstand.

## Aufbau

```
GuessTheSongScrapp/
├── assets/sounds/   # buzzer.mp3, correct.mp3, wrong.mp3
├── openscr.json     # Manifest (OpenScr)
├── everyapp.json    # dasselbe Manifest, Fallback für ältere Builds
├── players.js       # Spielerliste, gemeinsam mit Werwolf
├── stats.js         # Protokoll und Allzeit-Statistik
├── multiplayer.js   # Buzz, Uhr, Reihenfolge, öffentlicher Stand
├── test/logic.test.js
├── test/multiplayer.test.js
├── index.html       # App und CSS, Spielablauf inline
└── README.md
```

Benötigte Berechtigungen: `spotify`, `vibration`, `storage`, `multiplayer`.
