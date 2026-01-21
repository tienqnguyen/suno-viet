// ==UserScript==
// @name         Suno Style-Aware Lyric Generator (Left Panel)
// @namespace    https://github.com/yourname/suno-style-lyric-generator
// @version      1.3.0
// @description  Generate lyrics using EXISTING Suno style input. Draggable left panel. Inject or copy per song.
// @match        https://suno.com/*
// @grant        GM_addStyle
// ==/UserScript==
// Xài bản này khi có STYLE mẩu ở input form . AI sẽ tạo bài nhạc theo style đó. có thể thêm keywords hay paste lời bài hát vào để AI viết lại
(function () {
    'use strict';

    /************** CONFIG **************/
    const CONFIG = {
        AI_PROVIDER: 'gemini', // gemini | openrouter
        GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
        GEMINI_MODEL: 'gemini-3-flash-preview',

        OPENROUTER_API_KEY: 'YOUR_OPENROUTER_KEY',
        OPENROUTER_MODEL: 'openai/gpt-4o-mini'
    };

    /************** STYLE **************/
    GM_addStyle(`
        #sslg-panel {
            position: fixed;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 300px;
            max-height: 90vh;
            background: #0f0f0f;
            color: #eee;
            padding: 12px;
            border-radius: 12px;
            z-index: 99999;
            font-family: system-ui;
            box-shadow: 0 10px 40px rgba(0,0,0,.6);
            overflow: auto;
        }
        #sslg-header {
            cursor: move;
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .sslg-button {
            width: 100%;
            background: linear-gradient(135deg,#7c3aed,#9333ea);
            color: #fff;
            font-weight: 600;
            padding: 9px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 6px;
        }
        .sslg-button:hover { opacity:.9 }
        .sslg-inject-button {
            width: 100%;
            background: #374151;
            color: #fff;
            font-size: 12px;
            padding: 6px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            margin-bottom:4px;
        }
        .sslg-inject-button:hover { background:#4b5563 }
        .sslg-copy-button {
            width: 100%;
            background: #065f46;
            color: #ecfdf5;
            font-size: 12px;
            padding: 6px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
        }
        .sslg-copy-button:hover { background:#047857 }
    `);

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    class SunoStyleLyricGenerator {
        constructor() {
            this.songs = [];
            this.lastPrompt = '';
            this.init();
        }

        async init() {
            await this.waitForSuno();
            this.injectUI();
            this.makeDraggable();
            this.bindEvents();
            console.log('[SSLG] loaded');
        }

        async waitForSuno() {
            while (!document.querySelector('textarea')) {
                await sleep(500);
            }
        }

        /************** READ STYLE **************/
        getCurrentSunoStyle() {
            return [...document.querySelectorAll('textarea')]
                .find(t => t.maxLength === 1000 && t.value.trim())
                ?.value.trim() || null;
        }

        /************** UI **************/
        injectUI() {
            if (document.getElementById('sslg-panel')) return;

            const panel = document.createElement('div');
            panel.id = 'sslg-panel';
            panel.innerHTML = `
                <div id="sslg-header">🎵 Lyric Generator</div>

                <textarea id="sslg-topic"
                    placeholder="Keywords / chủ đề bài hát..."
                    style="width:100%;height:60px;margin-bottom:6px"></textarea>

                <input id="sslg-count" type="number" min="1" max="20" value="5"
                    style="width:100%;margin-bottom:8px">

                <button id="sslg-generate" class="sslg-button">
                    🎼 Generate (Use Suno Style)
                </button>

                <div id="sslg-status" style="font-size:12px;margin:6px 0;opacity:.9"></div>
                <div id="sslg-song-list"></div>
            `;
            document.body.appendChild(panel);
        }

        makeDraggable() {
            const panel = document.getElementById('sslg-panel');
            const header = document.getElementById('sslg-header');
            let x=0,y=0,dx=0,dy=0;

            header.onmousedown = e => {
                panel.style.transform = 'none';
                dx=e.clientX; dy=e.clientY;
                document.onmousemove = ev => {
                    x = dx - ev.clientX;
                    y = dy - ev.clientY;
                    dx = ev.clientX; dy = ev.clientY;
                    panel.style.left = panel.offsetLeft - x + 'px';
                    panel.style.top  = panel.offsetTop  - y + 'px';
                };
                document.onmouseup = () => document.onmousemove = null;
            };
        }

        bindEvents() {
            document.getElementById('sslg-generate')
                .onclick = () => this.generate();
        }

        updateStatus(msg, error=false) {
            const el = document.getElementById('sslg-status');
            el.textContent = msg;
            el.style.color = error ? '#f87171' : '#a7f3d0';
        }

        /************** AI **************/
        async generate() {
            const topic = document.getElementById('sslg-topic').value.trim();
            const count = parseInt(document.getElementById('sslg-count').value) || 5;
            const style = this.getCurrentSunoStyle();

            if (!topic) return this.updateStatus('⚠️ Nhập keywords', true);
            if (!style) return this.updateStatus('⚠️ Nhập STYLE trong Suno trước', true);

            this.updateStatus('🤖 AI đang tạo lời...');

            const prompt = `
Bạn là chuyên gia sáng tác nhạc.
Tạo ${count} bài hát theo CHỦ ĐỀ: "${topic}" hay viết lại theo lời bài hát nếu có
Phong cách âm nhạc (STYLE): ${style}

YÊU CẦU:
- Bám sát STYLE
- Lời hay, viral, không quá dài
- Chorus dễ nhớ
- Cấu trúc:
[Intro][Verse][Pre-Chorus][Chorus][Verse 2][Chorus][Bridge][Chorus][Outro]
- Mỗi bài cách nhau bằng: ###SONG_SPLIT###
- CHỈ xuất lời bài hát
`;

            this.lastPrompt = prompt;

            try {
                let output = '';

                if (CONFIG.AI_PROVIDER === 'gemini') {
                    const res = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }],
                                generationConfig: { temperature: 0.9, maxOutputTokens: 8192 }
                            })
                        }
                    );
                    const data = await res.json();
                    output = data?.candidates?.[0]?.content?.parts
                        ?.map(p => p.text).join('');
                }

                if (!output) throw new Error('No AI output');

                this.songs = output
                    .split('###SONG_SPLIT###')
                    .map(t => t.trim())
                    .filter(t => t.length > 50)
                    .map(text => ({
                        title: text.split('\n')[0].replace(/\[.*?\]/g,'').trim(),
                        lyrics: text
                    }));

                this.renderSongList();
                this.updateStatus(`✅ Tạo ${this.songs.length} bài`);

            } catch (e) {
                console.error(e);
                this.updateStatus('❌ Lỗi AI', true);
            }
        }

        /************** SONG LIST **************/
        renderSongList() {
            const box = document.getElementById('sslg-song-list');
            box.innerHTML = '';

            this.songs.forEach((song, idx) => {
                const div = document.createElement('div');
                div.style.cssText = `
                    border:1px solid rgba(255,255,255,.08);
                    padding:8px;
                    border-radius:8px;
                    margin-bottom:8px;
                    font-size:12px
                `;

                div.innerHTML = `
                    <div title="${this.escape(this.lastPrompt)}"
                        style="font-weight:600;margin-bottom:6px;cursor:help">
                        ${idx + 1}. ${song.title || 'Untitled'}
                    </div>

                    <button class="sslg-inject-button">🚀 Inject title + lyric</button>
                    <button class="sslg-copy-button">📋 Copy lyric</button>
                `;

                const [injectBtn, copyBtn] = div.querySelectorAll('button');
                injectBtn.onclick = () => this.injectSong(idx);
                copyBtn.onclick   = () => this.copyLyric(idx);

                box.appendChild(div);
            });
        }

        escape(t) {
            return t.replace(/[&<>\"']/g,s=>(
                {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]
            ));
        }

        /************** ACTIONS **************/
        async injectSong(index) {
            const song = this.songs[index];
            if (!song) return;

            await this.injectTitle(song.title);
            await this.injectLyrics(song.lyrics);
            this.updateStatus(`🎵 Injected: ${song.title}`);
        }

        async injectTitle(title) {
            const input = [...document.querySelectorAll('input')]
                .find(i => i.placeholder?.toLowerCase().includes('title'));
            if (!input) return;

            input.focus();
            input.value = title;
            input.dispatchEvent(new Event('input',{bubbles:true}));
            await sleep(300);
        }

        async injectLyrics(text) {
            const textarea = [...document.querySelectorAll('textarea')]
                .find(t => t.maxLength !== 1000);
            if (!textarea) return;

            textarea.focus();
            textarea.value = text;
            textarea.dispatchEvent(new Event('input',{bubbles:true}));
            await sleep(300);
        }

        async copyLyric(index) {
            const song = this.songs[index];
            if (!song?.lyrics) return;

            try {
                await navigator.clipboard.writeText(song.lyrics);
                this.updateStatus(`📋 Copied: ${song.title}`);
            } catch {
                this.updateStatus('❌ Copy failed', true);
            }
        }
    }

    new SunoStyleLyricGenerator();
})();
