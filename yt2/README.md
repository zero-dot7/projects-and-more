# YT Auto Speed

Brave/Chrome extension (Manifest V3). Plays YouTube videos at **1.2×** by default,
keeps **Music** category videos at **1.0×**.

## Install (Brave)

1. Open `brave://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder

## How it works

- A MAIN-world script reads the live player API (`#movie_player.getPlayerResponse()`)
  on every SPA navigation (`yt-navigate-finish`) — `ytInitialPlayerResponse` is
  avoided after first load because it goes stale.
- Music is detected by `videoDetails.musicVideoType` (locale-independent,
  official music content) or `microformat.category` matched against a set of
  "Music" translations.
- If detection gets it wrong (e.g. a DJ set uploaded under "Entertainment"),
  open the popup and check **Always treat channel as music** — that channel is
  then permanently treated as music, overriding YouTube's classification.
- Manual speed changes are respected until the next video (badge turns purple
  and shows the rate you picked).
- Skipped: Shorts and live streams. `music.youtube.com` is not covered at all
  (the manifest only matches `www.youtube.com`), which is intentional — it's
  all music anyway.

## Badge states

| Badge | Meaning |
|-------|---------|
| `1.2` (blue) | Normal video, speed applied |
| `♪`   | Music detected, music speed (default 1×) |
| `?`   | Detection failed — treated as music (fail-safe); re-detected once a few seconds later |
| `1.5` (purple) | Manual override — you changed the speed, auto-speed pauses until the next video |
| `LIVE` | Live stream — speed not touched |
| `off` | Extension disabled |
| (empty) | Not a watch page |

## Settings

Toolbar popup: on/off toggle, default speed, music speed (or **Off**
to leave music playback entirely alone), and — on a watch page — an
**Always treat channel as music** checkbox for the current channel.
Synced via `chrome.storage.sync`; values are validated on read, so a
corrupt sync value falls back to defaults.

## Known limitations

- YouTube's own speed menu won't show `1.2×` as selected (the rate is set on the
  `<video>` element directly, which YouTube's preset menu doesn't reflect).
- Unofficial music uploads in a non-Music category (e.g. a DJ set uploaded under
  "Entertainment") get 1.2× by default — detection follows YouTube's own
  classification. Use the per-channel **Always treat channel as music** checkbox
  to correct this.
