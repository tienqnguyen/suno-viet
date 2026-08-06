
# Suno Lyrics LRC/SRT Downloader

A browser-console JavaScript snippet and bookmarklet for downloading Suno aligned lyrics as raw LRC, formatted merged LRC, or SRT.

> **Use only on a Suno page where you are signed in.** The script uses the current page session and does not send credentials to a third-party service.

## Features

- Downloads word-level aligned lyrics as `.lrc`.
- Downloads grouped, readable lyrics as `.formatted.lrc`.
- Downloads word-level timestamps as `.srt`.
- Works without Tampermonkey.
- Can run from DevTools Console or as a bookmarklet.

## Console snippet

Open the Suno song page, open DevTools, select **Console**, and paste this script:

```js
(async function () {
  'use strict';

  const RAW_FILE_TYPE = 'lrc'; // Change to 'srt' for raw SRT download.
  const UI_ID = 'suno-lyrics-download-tools';

  function getCookie(name) {
    const cookies = `; ${document.cookie}`.split(`; ${name}=`);
    return cookies.length > 1 ? cookies.pop().split(';')[0] : null;
  }

  function formatSrtTime(seconds) {
    const date = new Date(0);
    date.setMilliseconds(Number(seconds || 0) * 1000);
    return [
      String(date.getUTCHours()).padStart(2, '0'),
      String(date.getUTCMinutes()).padStart(2, '0'),
      String(date.getUTCSeconds()).padStart(2, '0'),
    ].join(':') + `,${String(date.getUTCMilliseconds()).padStart(3, '0')}`;
  }

  function formatLrcTime(seconds) {
    const date = new Date(0);
    date.setMilliseconds(Number(seconds || 0) * 1000);
    return `[${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}.${String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0')}]`;
  }

  function cleanWord(value) {
    return String(value || '').replace(/\[.*?\]/g, '').trim();
  }

  function toRawLrc(words) {
    return words
      .map(word => `${formatLrcTime(word.start_s)}${cleanWord(word.word)}`)
      .join('\n');
  }

  function toSrt(words) {
    return words.map((word, index) => {
      return [
        index + 1,
        `${formatSrtTime(word.start_s)} --> ${formatSrtTime(word.end_s)}`,
        cleanWord(word.word),
        '',
      ].join('\n');
    }).join('\n');
  }

  function toFormattedLrc(words, gapMs = 700, maxWords = 10) {
    const lines = [];
    let text = '';
    let timestamp = null;
    let previousStart = null;
    let count = 0;

    for (const word of words) {
      const startMs = Number(word.start_s || 0) * 1000;
      const value = cleanWord(word.word);

      if (!value) {
        previousStart = startMs;
        continue;
      }

      const gapBreak = previousStart !== null && startMs - previousStart > gapMs;
      const lengthBreak = count >= maxWords;

      if (text && (gapBreak || lengthBreak)) {
        lines.push(`${timestamp} ${text}`);
        text = '';
        count = 0;
      }

      if (!text) {
        timestamp = formatLrcTime(word.start_s);
        text = value;
        count = 1;
      } else {
        text += ` ${value}`;
        count += 1;
      }

      previousStart = startMs;
    }

    if (text) lines.push(`${timestamp} ${text}`);
    return lines.join('\n');
  }

  function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 500);
  }

  async function fetchAlignedWords(songId, token) {
    const endpoint = `https://studio-api.prod.suno.com/api/gen/${songId}/aligned_lyrics/v2/`;
    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      : {};

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) throw new Error(`Aligned lyrics request failed: HTTP ${response.status}`);

    const data = await response.json();
    return data?.aligned_words || [];
  }

  function makeButton(label, color, handler) {
    const button = document.createElement('button');
    button.textContent = label;
    button.type = 'button';
    button.style.cssText = [
      'padding:10px 12px',
      'border:0',
      'border-radius:8px',
      `background:${color}`,
      'color:#fff',
      'font:600 14px system-ui,sans-serif',
      'cursor:pointer',
      'box-shadow:0 4px 12px rgba(0,0,0,.2)',
    ].join(';');
    button.addEventListener('click', handler);
    return button;
  }

  function mountTools(songId, words) {
    document.getElementById(UI_ID)?.remove();

    const panel = document.createElement('div');
    panel.id = UI_ID;
    panel.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:16px',
      'z-index:999999',
      'display:flex',
      'flex-direction:column',
      'gap:8px',
    ].join(';');

    panel.appendChild(makeButton(`Download ${RAW_FILE_TYPE.toUpperCase()}`, '#4b5563', () => {
      const content = RAW_FILE_TYPE === 'srt' ? toSrt(words) : toRawLrc(words);
      downloadText(content, `${songId}.${RAW_FILE_TYPE}`);
    }));

    panel.appendChild(makeButton('Download Formatted LRC', '#2563eb', () => {
      downloadText(toFormattedLrc(words), `${songId}.formatted.lrc`);
    }));

    panel.appendChild(makeButton('Download SRT', '#0f766e', () => {
      downloadText(toSrt(words), `${songId}.srt`);
    }));

    document.body.appendChild(panel);
  }

  try {
    const songId = location.pathname.split('/').filter(Boolean).pop();
    const token = getCookie('__session');

    if (!songId) throw new Error('Could not determine the song ID from the current URL.');

    const words = await fetchAlignedWords(songId, token);
    if (!words.length) throw new Error('No aligned lyrics were returned for this song.');

    mountTools(songId, words);
    console.info('Suno lyrics download tools injected.');
  } catch (error) {
    console.error(error);
    alert(`Suno lyrics downloader failed: ${error.message}`);
  }
})();
```

## Bookmarklet button

A bookmarklet is a bookmark whose URL starts with `javascript:`. The button below is a **bookmarklet builder**: save the HTML as a local file, open it, and click the button to copy the bookmarklet URL.

GitHub Markdown does not reliably execute JavaScript buttons or preserve `javascript:` links for security reasons. Use the local builder below, then create a browser bookmark and paste the copied value into its URL field.

Save this as `bookmarklet-builder.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Suno Lyrics Bookmarklet Builder</title>
  <style>
    body {
      max-width: 760px;
      margin: 40px auto;
      padding: 0 20px;
      font: 16px/1.5 system-ui, sans-serif;
      color: #17202a;
    }
    button {
      padding: 12px 16px;
      border: 0;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    textarea {
      width: 100%;
      min-height: 180px;
      margin-top: 16px;
      padding: 12px;
      box-sizing: border-box;
      font: 12px/1.4 ui-monospace, monospace;
    }
  </style>
</head>
<body>
  <h1>Suno Lyrics Bookmarklet</h1>
  <p>Click the button, then create a browser bookmark and paste the copied text into the bookmark URL field.</p>
  <button id="copy">Copy bookmarklet</button>
  <textarea id="output" readonly></textarea>
  <p id="status" role="status"></p>

  <script>
    // Paste the complete console snippet from this README between the backticks below.
    const source = `(async function () {
      alert('Replace this builder source with the full console snippet from the README.');
    })();`;

    const bookmarklet = 'javascript:' + encodeURIComponent(source);
    const output = document.querySelector('#output');
    const status = document.querySelector('#status');

    output.value = bookmarklet;

    document.querySelector('#copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(bookmarklet);
        status.textContent = 'Copied. Paste it into a bookmark URL field.';
      } catch {
        output.focus();
        output.select();
        document.execCommand('copy');
        status.textContent = 'Copied using fallback mode.';
      }
    });
  </script>
</body>
</html>
```

### Generating the final bookmarklet

1. Copy the complete console snippet above.
2. In `bookmarklet-builder.html`, replace the placeholder `source` string with the snippet using a JavaScript template literal.
3. If the snippet contains backticks, escape them as `\\`` inside the template literal.
4. Open the builder locally and click **Copy bookmarklet**.
5. Create a new browser bookmark.
6. Paste the copied `javascript:...` value into the bookmark URL field.
7. Open a Suno song page, confirm you are signed in, and click the bookmark.

## Troubleshooting

### `__session` is not visible

Run this in the Suno page console:

```js
document.cookie.includes('__session')
```

If it returns `false`, the session cookie may be `HttpOnly`, blocked by browser policy, or stored under a different scope. A normal bookmarklet cannot read an `HttpOnly` cookie.

### HTTP 401 or 403

Refresh the Suno page, sign in again, and run the bookmarklet from the actual song page. The endpoint or authentication method may also have changed.

### No aligned lyrics found

The selected song may not have word-level alignment data available. Try another generated song or inspect the request in DevTools Network while the song page loads.

### Download does not start

Allow downloads for the Suno site in the browser, and make sure the bookmark URL still begins with `javascript:`. Some browsers remove that prefix when pasted into a bookmark name field instead of the URL field.

## Security notes

The script runs in the current browser tab, reads the visible page session cookie when available, requests aligned lyric data from Suno, and creates local text downloads in the browser. It does not transmit the token to a separate server.

Do not share exported session cookies, bearer tokens, or DevTools request headers in GitHub issues, screenshots, or chat.
