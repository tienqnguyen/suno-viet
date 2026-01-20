// ==UserScript==
// @name         NhacCuaTui → Suno Injector (v1.8 Clean Link)
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Fetch lyrics, inject into Suno, and provide CLEAN MP3 links / 8a5.com
// @match        https://suno.com/*
// @grant        GM_xmlhttpRequest
// @connect      nhaccuatui.com
// @connect      corsproxy.io
// ==/UserScript==

(function () {
  'use strict';

  const CORS_PROXY = 'https://corsproxy.io/?';

  // ===== RC4 Decrypt =====
  function rc4(key, dataBytes) {
    const S = new Uint8Array(256);
    for (let i = 0; i < 256; i++) S[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + key.charCodeAt(i % key.length)) & 255;
      [S[i], S[j]] = [S[j], S[i]];
    }
    const result = new Uint8Array(dataBytes.length);
    let i = 0;
    j = 0;
    for (let k = 0; k < dataBytes.length; k++) {
      i = (i + 1) & 255;
      j = (j + S[i]) & 255;
      [S[i], S[j]] = [S[j], S[i]];
      const K = S[(S[i] + S[j]) & 255];
      result[k] = dataBytes[k] ^ K;
    }
    return result;
  }

  function decryptNCTLrc(hexString) {
    try {
      if (!hexString) return '';
      const clean = hexString.replace(/[^0-9a-fA-F]/g, '');
      if (clean.length % 2 !== 0) return hexString;
      const len = clean.length / 2;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
      }
      const decrypted = rc4('Lyr1cjust4nct', bytes);
      return new TextDecoder('utf-8').decode(decrypted);
    } catch (e) {
      console.warn('Decrypt failed:', e);
      return hexString;
    }
  }

  function stripTimestamps(text) {
      if (!text) return '';
      return text.replace(/\[\d{1,2}:\d{2}(\.\d{2,3})?\]/g, '').trim();
  }

  // ===== Extract ID =====
  function extractSongKey(url) {
    if (url.includes('stream.nct.vn') || url.includes('.mp3')) return 'DIRECT_MP3_ERROR';
    let match = url.match(/\/song\/([a-zA-Z0-9]+)/);
    if (match) return match[1];
    match = url.match(/\.([a-zA-Z0-9]{12})\.html/);
    if (match) return match[1];
    match = url.match(/[?&]key=([a-zA-Z0-9]+)/);
    if (match) return match[1];
    return null;
  }

  // ===== Fetch =====
  function fetchUrl(url, useProxy = false) {
    return new Promise((resolve) => {
      const finalUrl = useProxy ? CORS_PROXY + encodeURIComponent(url) : url;
      GM_xmlhttpRequest({
        method: 'GET',
        url: finalUrl,
        onload: (res) => resolve(res.responseText),
        onerror: (e) => { console.error(e); resolve(null); }
      });
    });
  }

  // ===== Main Logic =====
  async function getNCTData(url) {
    url = url.split('?')[0];
    const key = extractSongKey(url);

    if (key === 'DIRECT_MP3_ERROR') throw new Error('❌ Direct MP3 link detected.\nPlease paste the SONG PAGE URL.');
    if (!key) throw new Error('Invalid NCT URL (No ID found)');

    // XML via Proxy
    const xmlUrl = `https://www.nhaccuatui.com/flash/xml?key1=${key}`;
    const xmlText = await fetchUrl(xmlUrl, true);

    let title = '', artist = '', lyricUrl = '', mp3Url = '';

    if (xmlText && xmlText.includes('<track>')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const track = doc.querySelector('track');
        if (track) {
            title = track.querySelector('title')?.textContent?.trim();
            artist = track.querySelector('creator')?.textContent?.trim();
            lyricUrl = track.querySelector('lyric')?.textContent?.trim();
            mp3Url = track.querySelector('locationHQ')?.textContent?.trim() || track.querySelector('location')?.textContent?.trim();

            const clean = (s) => s?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') || '';
            title = clean(title);
            artist = clean(artist);
        }
    }

    // HTML Fallback
    let fullLyrics = '';
    if (!lyricUrl || !mp3Url || !title) {
        const html = await fetchUrl(url, true);
        if (html) {
            if (!title) {
                const tMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
                if (tMatch) title = tMatch[1].replace(/<[^>]+>/g, '').trim();
            }
            if (!lyricUrl) {
                const lrcMatch = html.match(/"([^"]+\.lrc[^"]*)"/);
                if (lrcMatch) lyricUrl = lrcMatch[1].replace(/\\\//g, '/');
                else {
                     const lMatch = html.match(/"lyricUrl":"([^"]+)"/) || html.match(/"lyric":"([^"]+)"/);
                     if (lMatch) lyricUrl = lMatch[1].replace(/\\\//g, '/');
                }
            }
            if (!mp3Url) {
                const mMatch = html.match(/"(https?:\/\/[^"]+\.mp3[^"]*)"/);
                if (mMatch) mp3Url = mMatch[1].replace(/\\\//g, '/');
            }
             if (!lyricUrl) {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const div = doc.querySelector('#divLyric') || doc.querySelector('.pd_lyric');
                if (div) {
                   var plain = div.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
                   if (plain) fullLyrics = plain;
                }
            }
        }
    }

    // Lyric Content
    let finalLyrics = fullLyrics || '';
    if (lyricUrl && !finalLyrics) {
        if (lyricUrl.startsWith('http:')) lyricUrl = lyricUrl.replace('http:', 'https:');
        const lrcRaw = await fetchUrl(lyricUrl, true);
        if (lrcRaw) {
             if (/\[\d{2}:\d{2}\]/.test(lrcRaw)) finalLyrics = lrcRaw;
             else finalLyrics = decryptNCTLrc(lrcRaw);
        }
    }

    return { title, artist, lyrics: finalLyrics, mp3Url };
  }

  // ===== UI =====
  async function runInjector() {
    const input = document.getElementById('nct-url-input');
    const status = document.getElementById('nct-status');
    const preview = document.getElementById('nct-preview');
    const mp3Link = document.getElementById('nct-mp3-link');
    const injectBtn = document.getElementById('nct-inject-btn');
    const injectCleanBtn = document.getElementById('nct-inject-clean-btn');

    status.textContent = '⏳ Fetching...';
    status.style.color = '#a1a1aa';
    preview.textContent = '';
    mp3Link.innerHTML = '';
    injectBtn.disabled = true;
    injectCleanBtn.disabled = true;

    try {
        const val = input.value.trim();
        if (!val) throw new Error('Empty URL');

        const data = await getNCTData(val);

        if (!data.lyrics && !data.mp3Url) throw new Error('No data found.');

        window.nctData = data;

        status.textContent = `✅ Found: ${data.title}`;
        preview.textContent = (data.lyrics || '(No lyrics text)').slice(0, 100) + '...';

        if (data.mp3Url) {
            // FORCE CLEAN URL (remove everything after ?)
            const cleanMp3Url = data.mp3Url.split('?')[0];
            const filename = cleanMp3Url.split('/').pop();

            mp3Link.innerHTML = `
                <div style="margin-bottom:4px;word-break:break-all;font-size:10px;color:#a1a1aa;">${filename}</div>
                <div style="display:flex;gap:5px;">
                    <a href="${cleanMp3Url}" target="_blank" style="color:#60a5fa;text-decoration:none;">🎵 Open MP3</a>
                    <button id="copy-mp3-btn" style="font-size:10px;cursor:pointer;">Copy Link (phải copy rồi paste vào new tab)</button>
                </div>
            `;
            document.getElementById('copy-mp3-btn').onclick = () => {
                navigator.clipboard.writeText(cleanMp3Url); // Copy CLEAN url
                status.textContent = '✅ MP3 Link Copied!';
            };
        } else {
            mp3Link.innerHTML = '<span style="color:#71717a">No MP3 found</span>';
        }

        if (data.lyrics) {
            injectBtn.disabled = false;
            injectCleanBtn.disabled = false;
        }

    } catch (e) {
        status.textContent = e.message;
        status.style.color = '#ef4444';
        console.error(e);
    }
  }

  async function doInject(cleanTimestamps = false) {
     if (!window.nctData) return;

     if (!location.pathname.startsWith('/create')) {
         document.querySelector('a[href="/create"]')?.click();
         await new Promise(r => setTimeout(r, 1500));
     }

     const customTab = Array.from(document.querySelectorAll('button, div[role="tab"]'))
        .find(el => el.textContent.trim().toLowerCase() === 'custom');
     if (customTab) customTab.click();

     await new Promise(r => setTimeout(r, 500));

     const titleIn = document.querySelector('input[placeholder*="Title"], input[placeholder*="title"]');
     if (titleIn) {
         const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
         setter.call(titleIn, window.nctData.title);
         titleIn.dispatchEvent(new Event('input', { bubbles: true }));
     }

     const tas = Array.from(document.querySelectorAll('textarea'));
     let lyricBox = tas.find(t => t.placeholder && (t.placeholder.includes('yric') || t.placeholder.includes('verse')));
     if (!lyricBox) lyricBox = tas.sort((a,b) => b.clientHeight - a.clientHeight)[0];

     if (lyricBox) {
         let lyricsToInject = window.nctData.lyrics;
         if (cleanTimestamps) {
             lyricsToInject = stripTimestamps(lyricsToInject);
         }

         lyricBox.focus();
         const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
         setter.call(lyricBox, lyricsToInject);
         lyricBox.dispatchEvent(new Event('input', { bubbles: true }));

         const status = document.getElementById('nct-status');
         status.style.color = '#a1a1aa';
         status.textContent = cleanTimestamps ? '✅ Injected (Clean)!' : '✅ Injected (Timed)!';
     }
  }

  function createPanel() {
      const p = document.createElement('div');
      p.style.cssText = "position:fixed;bottom:20px;right:20px;width:300px;background:#18181b;color:#fff;border:1px solid #3f3f46;border-radius:8px;padding:12px;z-index:99999;font-family:sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.5);";
      p.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <b style="color:#f472b6">NCT → Suno v1.8</b>
            <span style="cursor:pointer" onclick="this.parentElement.parentElement.remove()">✕</span>
        </div>
        <input id="nct-url-input" placeholder="Paste Song URL..." style="width:100%;background:#27272a;border:1px solid #52525b;color:#fff;padding:6px;border-radius:4px;margin-bottom:8px;font-size:11px;">
        <button id="nct-fetch-btn" style="width:100%;background:#3b82f6;border:none;color:#fff;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;margin-bottom:8px;">Fetch Data</button>
        <div style="display:flex;gap:5px;margin-bottom:8px;">
            <button id="nct-inject-btn" disabled style="flex:1;background:#22c55e;border:none;color:#fff;padding:6px;border-radius:4px;cursor:pointer;opacity:0.6;font-size:11px;">Inject (Timed)</button>
            <button id="nct-inject-clean-btn" disabled style="flex:1;background:#10b981;border:none;color:#fff;padding:6px;border-radius:4px;cursor:pointer;opacity:0.6;font-size:11px;">Inject (Clean)</button>
        </div>
        <div id="nct-status" style="font-size:11px;color:#a1a1aa;margin-bottom:4px;">Ready</div>
        <div id="nct-mp3-link" style="font-size:11px;margin-bottom:4px;"></div>
        <pre id="nct-preview" style="background:#000;padding:4px;font-size:10px;height:50px;overflow:auto;color:#d4d4d8;border-radius:4px;"></pre>
      `;
      document.body.appendChild(p);

      document.getElementById('nct-fetch-btn').onclick = runInjector;
      document.getElementById('nct-inject-btn').onclick = () => doInject(false);
      document.getElementById('nct-inject-clean-btn').onclick = () => doInject(true);
  }

  setTimeout(createPanel, 2000);

})();
