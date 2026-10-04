# Dropbox Backup — setup (one-time, ~2 min)

The extension uses official OAuth 2.0 + PKCE. It requires a one-time registration
of your own (free) Dropbox app and pasting its **app key** into the backup dialog.
The app key is a public value — with PKCE it is not a secret and does not need to be hidden.

## 1. Register an app in Dropbox

1. Go to **https://www.dropbox.com/developers/apps** and log in to your account.
2. Click **Create app**.
3. Fill in the form:
   - **Choose an API**: `Scoped access`
   - **Choose the type of access**: `App folder` (safer — the extension
     only sees its own `Apps/Speed Dial Sync` folder, not your entire Dropbox)
   - **Name your app**: e.g. `Speed Dial Sync`
4. Click **Create app**.

## 2. Set permissions

1. In the app panel open the **Permissions** tab.
2. Check these scopes:
   - `files.content.read`
   - `files.content.write`
   - `files.metadata.read`
3. Click **Submit** (scope changes require approval).

## 3. Copy the App key

1. Open the **Settings** tab.
2. Find the **App key** field (OAuth 2 section) and copy the value — it's a short
   string of lowercase letters/digits (~15–26 chars). **Do not confuse it with "App secret"**
   (64 chars) — pasting the secret yields the Dropbox error "Invalid client_id: Too long".
3. In the same OAuth 2 section, in the **Redirect URIs** field, click **Add** and paste:
   `https://ldgbieeolhlhaodogakabgdhjadcmedn.chromiumapp.org/`
   (the address contains your installed extension's ID; the trailing `/` is required).
   Without it Dropbox returns "Invalid redirect_uri".

## 4. Connect the extension

1. Open the new-tab page → ⚙ menu → **Backup Dropbox…**
2. In the **"Dropbox app key (one-time)"** field paste the copied key.
3. Click **Connect Dropbox** — the Dropbox page opens → log in
   and approve access (one-time).
4. The status changes to **Connected** and the first backup runs immediately.

From now on the token refreshes automatically — you never enter anything again.
The key is saved in `chrome.storage.sync` and the field disappears. If the key was wrong,
the field reappears after a failed connection attempt (enter the correct one).

## Notes

- The backup lands in `Apps/Speed Dial Sync/` in your Dropbox (a JSON file).
- **Disconnect** in the dialog removes tokens but remembers the app key — reconnecting
  is one click. To delete the key: clear `dbxAppKey` via
  `chrome://extensions` → service worker → console:
  `chrome.storage.sync.remove('dbxAppKey')`.
- Never commit any tokens to the repo — the app key alone is enough and it's public.
