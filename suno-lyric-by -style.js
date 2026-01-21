// ==UserScript==
// @name Suno Style-Aware Lyric Generator (Left Panel)
// @namespace https://github.com/yourname/suno-style-lyric-generator
// @version 1.2.0
// @description Standalone lyric generator using EXISTING Suno style input. Panel on left-center. Display songs & inject per song. 
// @match https://suno.com/*
// @grant GM_addStyle
//Bản này AI tạo nhạc theo style có sẵn ở input form >>> chỉ cẩn cho vài keywords là AI sẽ tạo bài nhạc dựa theo STYLE có sẵn. Now with draggable panel and improved button styles. Cần API KEY để tạo nhạc
// ==/UserScript==
(function () {
    'use strict';

    /************** CONFIG **************/
    const CONFIG = {
        AI_PROVIDER: 'gemini', // gemini | openrouter
        GEMINI_API_KEY: 'GEMINI_API_KEY',
        GEMINI_MODEL: 'gemini-3-flash-preview',
        OPENROUTER_API_KEY: 'YOUR_OPENROUTER_API_KEY',
        OPENROUTER_MODEL: 'openai/gpt-4o-mini'
    };
    /************** style **************/

        GM_addStyle(`
        #sslg-panel {
            position: fixed;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 280px;
            max-height: 90vh;
            overflow: auto;
            background: #111;
            color: #eee;
            padding: 12px;
            border-radius: 10px;
            z-index: 99999;
            font-family: system-ui;
            box-shadow: 0 0 0 1px rgba(255,255,255,.05);
        }
        .sslg-button {
            width: 100%;
            background: #7c3aed;
            color: #fff;
            font-weight: 600;
            margin-bottom: 6px;
            padding: 8px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .sslg-button:hover {
            background: #6d28d9;
        }
        .sslg-inject-button {
            width: 100%;
            font-size: 12px;
            background: #4b5563;
            color: #fff;
            padding: 6px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .sslg-inject-button:hover {
            background: #374151;
        }
        #sslg-header {
            cursor: move;
            margin-bottom: 8px;
        }
    `);
    /************** UTILS **************/
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    /************** MAIN **************/
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
            console.log('[Suno Style Lyric Generator] loaded');
        }
        async waitForSuno() {
            while (!document.querySelector('textarea')) {
                await sleep(600);
            }
        }
        /************** STYLE (READ ONLY) **************/
        getCurrentSunoStyle() {
            const textarea =
                document.querySelector('textarea[maxlength="1000"]') ||
                Array.from(document.querySelectorAll('textarea'))
                    .find(t => t.maxLength === 1000);
            if (!textarea || !textarea.value.trim()) return null;
            return textarea.value.trim();
        }
        /************** UI **************/
        injectUI() {
            if (document.getElementById('sslg-panel')) return;
            const panel = document.createElement('div');
            panel.id = 'sslg-panel';
            panel.innerHTML = `
                <div id="sslg-header">
                    <div style="font-weight:700;font-size:14px;">🎵 Lyric Generator</div>
                </div>
                <textarea id="sslg-topic" placeholder="Chủ đề bài hát..."
                    style="width:100%;height:70px;margin-bottom:6px"></textarea>
                <input id="sslg-count" type="number" min="1" max="20" value="5"
                    style="width:100%;margin-bottom:8px" />
                <button id="sslg-generate-style" class="sslg-button">
                    🎼 Generate (Use Suno Style)
                </button>
                <div id="sslg-status" style="font-size:12px;opacity:.85;margin-bottom:6px"></div>
                <div id="sslg-song-list"></div>
            `;
            document.body.appendChild(panel);
        }
        makeDraggable() {
            const panel = document.getElementById('sslg-panel');
            const header = document.getElementById('sslg-header');
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            header.onmousedown = dragMouseDown;
            function dragMouseDown(e) {
                e = e || window.event;
                e.preventDefault();
                panel.style.transform = 'none'; // Remove transform for accurate positioning
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }
            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                panel.style.top = (panel.offsetTop - pos2) + "px";
                panel.style.left = (panel.offsetLeft - pos1) + "px";
            }
            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }
        bindEvents() {
            document.getElementById('sslg-generate-style')
                ?.addEventListener('click', () => this.generate());
        }
        updateStatus(msg, error = false) {
            const el = document.getElementById('sslg-status');
            if (!el) return;
            el.textContent = msg;
            el.style.color = error ? '#f87171' : '#a7f3d0';
        }
        /************** AI **************/
        async generate() {
            const topic = document.getElementById('sslg-topic').value.trim();
            const count = parseInt(document.getElementById('sslg-count').value) || 5;
            if (!topic) {
                this.updateStatus('⚠️ Nhập chủ đề', true);
                return;
            }
            const style = this.getCurrentSunoStyle();
            if (!style) {
                this.updateStatus('⚠️ Nhập STYLE trong Suno trước', true);
                return;
            }
            this.updateStatus('🤖 AI đang tạo lời...');
            const prompt = `Bạn là chuyên gia sáng tác nhạc. Tạo ${count} bài theo chủ đề: ${topic}, theo style ${style}
YÊU CẦU:
- Bám theo STYLE nhạc để tạo nhạc. Lời nhạc hay và viral, không cần quá dài
- Cấu trúc: [Intro][Verse][Pre-Chorus][Chorus][Verse 2][Chorus][Bridge][Chorus][Outro]
- Chorus dễ nhớ.
- Mỗi bài cách nhau bằng: ###SONG_SPLIT###
- Chỉ xuất lời bài hát`;
            this.lastPrompt = prompt;
            try {
                let output;
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
                    output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                } else {
                    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: CONFIG.OPENROUTER_MODEL,
                            messages: [{ role: 'user', content: prompt }]
                        })
                    });
                    const data = await res.json();
                    output = data.choices[0].message.content;
                }
                if (!output) throw new Error('AI không trả nội dung');
                this.songs = output
                    .split('###SONG_SPLIT###')
                    .map(t => t.trim())
                    .filter(t => t.length > 50)
                    .map(text => ({
                        title: text.split('\n')[0].replace(/\[.*?\]/g, '').trim(),
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
                div.style.cssText = 'border:1px solid rgba(255,255,255,.08);padding:6px;border-radius:6px;margin-bottom:6px;font-size:12px';
                div.innerHTML = `
                    <div title="${this.escape(this.lastPrompt)}" style="font-weight:600;margin-bottom:4px;cursor:help">
                        ${idx + 1}. ${song.title || 'Untitled'}
                    </div>
                    <button class="sslg-inject-button" data-i="${idx}">🚀 Inject title + lyric</button>
                `;
                div.querySelector('button').onclick = () => this.injectSong(idx);
                box.appendChild(div);
            });
        }
        escape(text) {
            return text.replace(/[&<>\"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
        }
        /************** INJECT **************/
        async injectSong(index) {
            const song = this.songs[index];
            if (!song) return;
            await this.injectTitle(song.title);
            await this.injectLyrics(song.lyrics);
            this.updateStatus(`🎵 Injected: ${song.title}`);
        }
        async injectTitle(title) {
            const input = document.querySelector('input[type="text"]');
            if (!input) return;
            input.focus();
            input.value = title;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(300);
        }
        async injectLyrics(text) {
            const textarea = document.querySelector('textarea:not([maxlength="1000"])');
            if (!textarea) return;
            textarea.focus();
            textarea.value = text;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(300);
        }
    }
    new SunoStyleLyricGenerator();
})();
