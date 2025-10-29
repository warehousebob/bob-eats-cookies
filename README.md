### Download
Grab the latest release (with a ready-to-load ZIP) here:  
👉 [Releases](https://github.com/warehousebob/bob-eats-cookies/releases/latest)

# bob-eats-cookies

**Uses Chrome’s on-device Gemini Nano via the Prompt API for local explanations.** <!-- updated: 2025-10-29 -->
Chrome extension to see, explain, and control site cookies.

## Bob Eats Cookies (v0.7.5)

See every cookie a site tries to use, get plain-English explanations, and toggle specific ones **On / Off**.

## Features
- **Per-cookie toggles** — allow or block each cookie in one tap.
- **Master On / Off** — flip all visible cookies at once.
- **Plain language** — short 8th-grade descriptions (no jargon).
- **Still visible when blocked** — we keep the names so you can see what the site tries to use.
- **Badge count** — toolbar icon shows how many cookies are present.

**On** = cookie allowed · **Off** = cookie blocked and greyed out

## Screenshots
![Auto-Detect Tracking Cookies](assets/Bob%20Eats%20Cookies%20-%20Auto%20Detect%20Cookies.jpg)
![See & Control Cookies](assets/Bob%20Eats%20Cookies%20-%20See%20and%20Control%20Cookies.jpg)
![Turn Off With One Click](assets/Bob%20Eats%20Cookies%20-%20Single%20Click.jpg)
![Easy Sign Out](assets/Bob%20Eats%20Cookies%20-%20Easy%20Sign%20Out.jpg)

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

---

## Built-in AI: Gemini Nano (On-Device)
This extension can use Chrome’s **Prompt API** to run **Gemini Nano locally** for plain-English cookie explanations (no network calls for inference). We detect readiness at runtime and only create a model session after a user gesture.

**How we detect & use Gemini Nano**
```js
// availability: 'available' | 'downloadable' | 'downloading' | 'unavailable'
export async function isGeminiNanoReady(options = {}) {
  const availability = await LanguageModel.availability(options);
  return availability;
}

export async function getGeminiSession(options = {}) {
  const availability = await isGeminiNanoReady(options);
  if (availability === 'available') {
    return await LanguageModel.create({
      ...options,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          // For reviewer visibility during testing
          console.log(`Gemini Nano download: ${Math.round(e.loaded * 100)}%`);
        });
      }
    });
  }
  throw new Error(`Gemini Nano not ready: ${availability}`);
}

// Minimal smoke test (call after a user gesture)
export async function nanoReadyTest() {
  try {
    const session = await getGeminiSession();
    const out = await session.prompt("Reply with the word: READY");
    console.log("[Gemini Nano] test response:", out);
    return out;
  } catch (e) {
    console.warn(e.message);
    return null;
  }
}
