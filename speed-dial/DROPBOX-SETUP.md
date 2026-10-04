# Dropbox Backup — konfiguracja (jednorazowa, ~2 min)

Rozszerzenie używa oficjalnego OAuth 2.0 + PKCE. Wymaga jednorazowej rejestracji
własnej (darmowej) aplikacji Dropbox i wklejenia jej **app key** w dialogu backupu.
App key to wartość publiczna — przy PKCE nie stanowi sekretu i nie musi być ukrywana.

## 1. Zarejestruj aplikację w Dropbox

1. Wejdź na **https://www.dropbox.com/developers/apps** i zaloguj się na swoje konto.
2. Kliknij **Create app**.
3. Uzupełnij formularz:
   - **Choose an API**: `Scoped access`
   - **Choose the type of access**: `App folder` (bezpieczniejsze — rozszerzenie
     widzi tylko swój folder `Apps/Speed Dial Sync`, nie cały Dropbox)
   - **Name your app**: np. `Speed Dial Sync`
4. Kliknij **Create app**.

## 2. Ustaw uprawnienia (Permissions)

1. W panelu aplikacji otwórz zakładkę **Permissions**.
2. Zaznacz scope'y:
   - `files.content.read`
   - `files.content.write`
   - `files.metadata.read`
3. Kliknij **Submit** (zmiany scope'ów wymagają zatwierdzenia).

## 3. Skopiuj App key

1. Otwórz zakładkę **Settings**.
2. Znajdź pole **App key** (sekcja OAuth 2) i skopiuj wartość.

## 4. Podłącz rozszerzenie

1. Otwórz stronę nowej karty → menu ⚙ → **Backup Dropbox…**
2. W polu **„Dropbox app key (one-time)"** wklej skopiowany key.
3. Kliknij **Connect Dropbox** → otworzy się strona Dropboxa → zaloguj się
   i zatwierdź dostęp (jednorazowo).
4. Status zmieni się na **Connected** i od razu poleci pierwszy backup.

Od tej pory token odświeża się automatycznie — niczego więcej nie wpisujesz.
Key zapisuje się w `chrome.storage.sync` i pole znika. Jeśli key był błędny,
pole wraca po nieudanej próbie połączenia (wpisz poprawny).

## Uwagi

- Backup ląduje w `Apps/Speed Dial Sync/` na Twoim Dropboxie (plik JSON).
- **Disconnect** w dialogu usuwa tokeny, ale zapamiętuje app key — ponowne
  połączenie to jeden klik. Usunięcie key: wyczyść `dbxAppKey` w
  `chrome://extensions` → service worker → console:
  `chrome.storage.sync.remove('dbxAppKey')`.
- Nie commituj do repo żadnych tokenów — app key wystarcza i jest publiczny.
