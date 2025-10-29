### Download
Grab the latest release (with a ready-to-load ZIP) here:  
👉 [Releases](https://github.com/warehousebob/bob-eats-cookies/releases/latest)

# bob-eats-cookies

Chrome extension to see, explain, and control site cookies.

## Bob Eats Cookies (v0.7.4)

See every cookie a site tries to use, get plain-English explanations, and toggle specific ones **On / Off**.

## Features
- **Per-cookie toggles** — allow or block each cookie in one tap.
- **Master On / Off** — flip all visible cookies at once.
- **Plain language** — short 8th-grade descriptions (no jargon).
- **Still visible when blocked** — we keep the names so you can see what the site tries to use.
- **Badge count** — toolbar icon shows how many cookies are present.

**On** = cookie allowed · **Off** = cookie blocked and greyed out

## Install (Developer Mode)
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this folder
4. (When you update files) click **Reload** on the extension card

## Privacy
No data leaves your device. Explanations run locally when available.

## Permissions
- `cookies`, `activeTab`, `scripting` — used to read, explain, and toggle cookies on the current page.
- No analytics, no tracking.

## Troubleshooting
- **Popup list empty but badge shows a number:** refresh the tab; some sites set cookies after load.
- **Logged out after turning cookies off:** session cookies were blocked. Turn those back **On**.

## Learn more
[Project page](https://www.warehousebob.com/bob-eats-cookies)

## License
MIT
