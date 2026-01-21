// ==UserScript==
// @name         Suno Auto-Lyric Generator + TKaraoke + MP3 v2
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  AI generate lyrics, TKaraoke scrape, MP3 download for Suno
// @match        https://suno.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @connect      lyric.tkaraoke.com
// @connect      corsproxy.io
// @connect      ytmedia.tkaraoke.com
// @connect      generativelanguage.googleapis.com
// @connect      openrouter.ai
// ==/UserScript==
// credit to @ https://8a5.com
(function() {
    'use strict';

    const CONFIG = {
        AI_PROVIDER: 'gemini', /// default 
        GEMINI_API_KEY: 'GEMINI_API_KEY', ///enter your gemini key
        GEMINI_MODEL: 'gemini-2.0-flash-exp',  // ✅ Fixed model name
        OPENROUTER_API_KEY: 'OPENROUTER_API_KEY',  /// set operouter api key
        OPENROUTER_MODEL: 'x-ai/grok-4.1-fast',
        TKARAOKE_BASE: 'https://lyric.tkaraoke.com', ///để tham khảo, ae tôn trọng, không auto fetch data của tkaraoke
        PROXY: 'https://corsproxy.io/?',
        DELAY_BETWEEN_SONGS: 6000,

        VIETNAMESE_STYLES: {
            tinhca: "Vietnamese emotional ballad, expressive heartfelt vocals, grand piano lead, cinematic string orchestra, slow tempo, clear verse-chorus structure, intimate to powerful dynamic build, warm reverb, high-quality studio mix, emotional climax",

            bolero: "Vietnamese bolero, nostalgic romantic vocals, classical guitar main, soft brushed percussion, slow tempo, vintage warm tone, clear storytelling melody, smooth phrasing, intimate emotional performance",

            trutinhque: "Vietnamese traditional folk ballad, warm natural vocals, acoustic guitar and traditional instruments, rural countryside atmosphere, simple melody, organic acoustic arrangement, emotional and authentic",

            nhactre: "Modern Vietnamese pop (V-Pop), bright youthful vocals, catchy topline melody, polished synth production, trendy pop beat, strong chorus hook, radio-ready structure, clean commercial mix",

            nhacvang: "Classic Vietnamese pop (Nhạc Vàng), warm emotional vocals, orchestral arrangement, timeless romantic melody, slow to mid tempo, clear verse-chorus form, golden era sound, clean professional mix",

            vpopedm: "Vietnamese EDM pop, energetic powerful vocals, uplifting pre-chorus, big festival drop, modern synth leads, deep pumping bass, build-drop structure, high-energy club-ready mix",

            rapviet: "Vietnamese hip-hop rap, confident rhythmic flow, modern trap or boom bap beat, punchy drums, strong bass, clear vocal presence, verse-focused structure, raw street energy",

            indie: "Vietnamese indie pop, soft intimate vocals, acoustic guitar or lo-fi keys, minimal arrangement, bedroom pop aesthetic, relaxed tempo, emotional closeness, warm lo-fi mix",

            rnb: "Vietnamese R&B, smooth soulful vocals, emotional melodic runs, jazzy neo-soul chords, groovy bassline, laid-back tempo, modern clean R&B production",

            folktronica: "Vietnamese folktronica, traditional folk melodies fused with modern electronic, dan bau and ethnic instruments with synth layers, tribal percussion, cinematic atmosphere, mid-tempo 100–110 BPM, modern hybrid production",

            vpopdream: "Vietnamese dream pop shoegaze, airy ethereal vocals, lush reverb guitar layers, shimmering synth pads, slow dreamy tempo 70–85 BPM, emotional atmospheric soundscape, soft and intimate mood",

            rapdiss: "Vietnamese rap diss battle track, aggressive confident delivery, dark hard trap beat, heavy 808 bass, sharp hi-hats, dramatic tension build, confrontational energy, punchy dry vocal mix",

            latinvpop: "Vietnamese Latin pop fusion, reggaeton or dembow rhythm, catchy rhythmic vocals, Spanish guitar flavor, tropical percussion, danceable groove, summer party vibe, 95–105 BPM",

            acousticvpop: "Modern Vietnamese acoustic pop, clean fingerstyle acoustic guitar, warm close-up vocals, light piano and strings, emotional storytelling, slow to mid tempo 75–90 BPM, intimate studio acoustic mix",

            rockviet_classic: "Vietnamese classic Melancholic rock ballad, powerful raspy male vocals, introspective electric guitar riffs, driving drums and bass, anthemic chorus, 90s–2000s Vietnamese rock influence,  mid-tempo 110–130 BPM",

            rockdanca: "Vietnamese folk rock fusion, emotional narrative vocals, traditional folk melodies with electric guitar, acoustic textures, cultural depth, warm analog rock production, mid-tempo 95–110 BPM",

            altrock: "Vietnamese alternative rock, introspective raspy male or female vocals, jangly guitars, atmospheric synth layers, emotional verse-driven structure, indie underground vibe, mid-tempo 100–120 BPM",

            hardrock: "Vietnamese hard rock, aggressive powerful vocals, heavy distorted guitars, pounding drums, fast guitar solos, high-energy performance, thick punchy rock mix, 130–150 BPM",

            indierock: "Vietnamese indie rock, youthful energetic vocals, clean electric guitar hooks, catchy chorus, modern indie production, emotional yet upbeat feel, 115–135 BPM",

            postrock: "Vietnamese cinematic post-rock, mostly instrumental, slow emotional build-up, ambient guitars, swelling strings, gradual intensity rise, epic climax, wide atmospheric reverb, 80–100 BPM",

            metalcore: "Vietnamese metalcore, aggressive screamed verses with melodic clean chorus, heavy breakdown riffs, tight double-kick drums, djent-influenced guitars, intense modern metal production, fast tempo 140–170 BPM"
        }

    };

    class SunoAIGenerator {
        constructor() {
            this.generatedLyrics = [];
            this.playlist = [];
            this.currentIndex = 0;
            this.isProcessing = false;
            this.currentMode = 'ai';
            this.injectUI();
        }

        injectUI() {
            const panel = document.createElement('div');
            panel.id = 'suno-ai-generator';
            panel.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; z-index: 10000;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            padding: 20px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                            color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            min-width: 420px; max-width: 460px;">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">
                            🎵 Suno Auto Generator
                        </h3>
                        <button id="sg-minimize-btn" style="background: rgba(255,255,255,0.2); border: none;
                                border-radius: 4px; color: white; width: 24px; height: 24px; cursor: pointer;
                                font-weight: bold; font-size: 18px;">−</button>
                    </div>

                    <div id="sg-panel-content">
                        <!-- Mode Tabs -->
                        <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                            <button id="sg-mode-ai" class="mode-tab" style="flex: 1; padding: 10px; background: #10b981;
                                    border: none; border-radius: 6px; color: white; font-weight: 600; cursor: pointer; font-size: 13px;">
                                🤖 AI Generate
                            </button>
                            <button id="sg-mode-tkaraoke" class="mode-tab" style="flex: 1; padding: 10px;
                                    background: rgba(255,255,255,0.2); border: none; border-radius: 6px;
                                    color: white; font-weight: 600; cursor: pointer; font-size: 13px;">
                                🎤 TKaraoke
                            </button>
                        </div>

                        <!-- AI Mode -->
                        <div id="sg-ai-mode" style="display: block;">
                            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                                <button id="sg-provider-gemini" class="provider-btn" style="flex: 1; padding: 8px;
                                        background: #10b981; border: none; border-radius: 6px; color: white;
                                        font-weight: 600; cursor: pointer; font-size: 12px;">
                                    🤖 Gemini
                                </button>
                                <button id="sg-provider-openrouter" class="provider-btn" style="flex: 1; padding: 8px;
                                        background: rgba(255,255,255,0.2); border: none; border-radius: 6px; color: white;
                                        font-weight: 600; cursor: pointer; font-size: 12px;">
                                    🌐 OpenRouter
                                </button>
                            </div>

                            <div style="margin-bottom: 10px;">
                                <label style="font-size: 12px; opacity: 0.9; display: block; margin-bottom: 4px;">
                                    📝 Chủ đề lời bài hát:
                                </label>
                                <textarea id="sg-lyric-prompt" placeholder="VD: Tình yêu tan vỡ trong mưa đêm..."
                                          style="width: 100%; height: 70px; padding: 10px; border-radius: 6px;
                                          border: none; font-size: 13px; resize: vertical;"></textarea>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                                <label style="font-size: 11px; opacity: 0.9;">Số bài:
                                    <input type="number" id="sg-lyrics-count" value="10" min="1" max="20"
                                           style="width: 100%; padding: 6px; border-radius: 4px; border: none; margin-top: 4px; font-size: 12px;">
                                </label>
                                <label style="font-size: 11px; opacity: 0.9;">Delay (ms):
                                    <input type="number" id="sg-delay-input" value="6000" min="3000" max="30000" step="1000"
                                           style="width: 100%; padding: 6px; border-radius: 4px; border: none; margin-top: 4px; font-size: 12px;">
                                </label>
                            </div>

                            <button id="sg-generate-btn" style="width: 100%; padding: 11px; background: #10b981;
                                    border: none; border-radius: 6px; color: white; font-weight: 600;
                                    cursor: pointer; font-size: 13px; margin-bottom: 10px;">
                                ✨ Generate Lyrics
                            </button>
                        </div>

                        <!-- TKaraoke Mode -->
                        <div id="sg-tkaraoke-mode" style="display: none;">
                            <div style="margin-bottom: 12px;">
                                <label style="font-size: 12px; opacity: 0.9; display: block; margin-bottom: 4px;">
                                    🔗 TKaraoke Playlist URL:
                                </label>
                                <input type="text" id="sg-playlist-url"
                                       placeholder="https://lyric.tkaraoke.com/10312/playlist/dan_nguyen/"
                                       style="width: 100%; padding: 10px; border-radius: 6px; border: none; font-size: 13px; margin-bottom: 6px;">
                                <button id="sg-fetch-btn" style="width: 100%; padding: 10px; background: #10b981;
                                        border: none; border-radius: 6px; color: white; font-weight: 600;
                                        cursor: pointer; font-size: 13px;">
                                    📥 Fetch Playlist
                                </button>
                            </div>

                            <label style="font-size: 11px; opacity: 0.9; margin-bottom: 12px; display: block;">
                                Delay (ms):
                                <input type="number" id="sg-tk-delay-input" value="6000" min="3000" max="30000" step="1000"
                                       style="width: 100%; padding: 6px; border-radius: 4px; border: none; margin-top: 4px; font-size: 12px;">
                            </label>
                        </div>

                        <!-- Style Selection -->
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 12px; opacity: 0.9; display: block; margin-bottom: 4px;">
                                🎸 Music Style Preset:
                            </label>
                            <div style="display: flex; gap: 6px;">
                                <select id="sg-style-select" style="flex: 1; padding: 10px; border-radius: 6px;
                                        border: none; font-size: 13px; background: white; color: #333;">
                                    <option value="tinhca">Tình Ca (Ballad)</option>
                                    <option value="bolero">Bolero</option>
                                    <option value="trutinhque">Trữ Tình Quê</option>
                                    <option value="nhactre">Nhạc Trẻ</option>
                                    <option value="nhacvang">Nhạc Vàng</option>
                                    <option value="vpopedm">V-Pop EDM</option>
                                    <option value="rapviet">Rap Việt</option>
                                    <option value="indie">Indie</option>
                                    <option value="rnb">R&B/Soul</option>
                                    <option value="folktronica">Folktronica (Dân ca điện tử)</option>
                                    <option value="rockdanca">Rock Dân Ca</option>
                                    <option value="rapdiss">Rap Diss</option>
                                    <option value="rockviet_classic">Rock Việt Classic</option>
                                    <option value="altrock">Alternative Rock Việt</option>
                                    <option value="vpopdream">Dream Pop / Shoegaze V-Pop</option>
                                    <option value="latinvpop">Latin V-Pop Fusion</option>
                                    <option value="acousticvpop">Acoustic V-Pop</option>
                                    <option value="hardrock">Hard Rock Việt</option>
                                    <option value="indierock">Indie Rock Việt</option>
                                    <option value="postrock">Post-Rock Cinematic Việt</option>
                                    <option value="metalcore">Metalcore / Modern Metal Việt</option>
                                </select>
                                <button id="sg-inject-style-btn" style="padding: 10px 14px; background: #f59e0b;
                                        border: none; border-radius: 6px; color: white; font-weight: 600;
                                        cursor: pointer; font-size: 13px; white-space: nowrap;">
                                    💉 Inject
                                </button>
                            </div>
                            <textarea id="sg-style-preview" readonly
                                      style="width: 100%; height: 50px; padding: 8px; border-radius: 6px;
                                      border: none; font-size: 11px; margin-top: 6px; resize: vertical;
                                      background: rgba(0,0,0,0.2); color: white; font-family: monospace;"></textarea>
                        </div>

                        <!-- Song List -->
                        <div id="sg-song-list" style="max-height: 300px; overflow-y: auto;
                             background: rgba(0,0,0,0.2); border-radius: 6px; padding: 10px;
                             margin-bottom: 12px; display: none;"></div>

                        <!-- Action Buttons -->
                        <div id="sg-action-buttons" style="display: none; gap: 8px; margin-bottom: 10px;">
                            <button id="sg-start-btn" style="flex: 1; padding: 11px; background: #3b82f6;
                                    border: none; border-radius: 6px; color: white; font-weight: 600;
                                    cursor: pointer; font-size: 13px;">
                                ▶️ Start Auto-Inject
                            </button>
                        </div>

                        <button id="sg-stop-btn" style="width: 100%; padding: 11px; background: #ef4444;
                                border: none; border-radius: 6px; color: white; font-weight: 600;
                                cursor: pointer; font-size: 13px; display: none;">
                            ⏹️ Stop Processing
                        </button>

                        <!-- Status -->
                        <div id="sg-status" style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.2);
                             border-radius: 6px; font-size: 12px; line-height: 1.5;">
                            ✅ Ready
                        </div>
                    </div>
                </div>

                <!-- MP3 Modal with Preview -->
                <div id="sg-mp3-modal" style="display: none; position: fixed; top: 50%; left: 50%;
                     transform: translate(-50%, -50%); z-index: 10001; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                     padding: 20px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                     color: white; min-width: 380px; max-width: 480px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 id="sg-mp3-modal-title" style="margin: 0; font-size: 15px; font-weight: 600;">🎵 MP3 Versions</h4>
                        <button id="sg-modal-close" style="background: rgba(255,255,255,0.2); border: none;
                                border-radius: 4px; color: white; width: 24px; height: 24px; cursor: pointer;
                                font-weight: bold; font-size: 16px;">×</button>
                    </div>

                    <!-- Audio Player -->
                    <div id="sg-audio-player" style="display: none; margin-bottom: 15px; padding: 12px;
                         background: rgba(0,0,0,0.2); border-radius: 6px;">
                        <div id="sg-audio-label" style="font-size: 12px; margin-bottom: 8px; opacity: 0.9;">🎧 Preview:</div>
                        <audio id="sg-audio" controls style="width: 100%; height: 40px; border-radius: 4px;"></audio>
                    </div>

                    <div id="sg-mp3-versions" style="max-height: 320px; overflow-y: auto;"></div>
                </div>
                <div id="sg-modal-backdrop" style="display: none; position: fixed; top: 0; left: 0;
                     width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;"></div>
            `;
            document.body.appendChild(panel);

            this.bindEvents();
            this.updateStylePreview();
            this.checkAPIKeys();
        }

        bindEvents() {
            document.getElementById('sg-mode-ai').addEventListener('click', () => this.switchMode('ai'));
            document.getElementById('sg-mode-tkaraoke').addEventListener('click', () => this.switchMode('tkaraoke'));
            document.getElementById('sg-provider-gemini').addEventListener('click', () => this.switchProvider('gemini'));
            document.getElementById('sg-provider-openrouter').addEventListener('click', () => this.switchProvider('openrouter'));

            document.getElementById('sg-minimize-btn').addEventListener('click', () => this.toggleMinimize());
            document.getElementById('sg-generate-btn').addEventListener('click', () => this.generateLyrics());
            document.getElementById('sg-fetch-btn').addEventListener('click', () => this.fetchPlaylist());
            document.getElementById('sg-start-btn').addEventListener('click', () => this.startAutoInject());
            document.getElementById('sg-stop-btn').addEventListener('click', () => this.stopProcessing());
            document.getElementById('sg-inject-style-btn').addEventListener('click', () => this.injectStyleOnly());

            document.getElementById('sg-style-select').addEventListener('change', () => this.updateStylePreview());
            document.getElementById('sg-modal-close').addEventListener('click', () => this.closeMP3Modal());
            document.getElementById('sg-modal-backdrop').addEventListener('click', () => this.closeMP3Modal());
        }

        switchMode(mode) {
            this.currentMode = mode;
            const aiMode = document.getElementById('sg-ai-mode');
            const tkaraokeMode = document.getElementById('sg-tkaraoke-mode');
            const aiBtn = document.getElementById('sg-mode-ai');
            const tkBtn = document.getElementById('sg-mode-tkaraoke');

            if (mode === 'ai') {
                aiMode.style.display = 'block';
                tkaraokeMode.style.display = 'none';
                aiBtn.style.background = '#10b981';
                tkBtn.style.background = 'rgba(255,255,255,0.2)';
            } else {
                aiMode.style.display = 'none';
                tkaraokeMode.style.display = 'block';
                aiBtn.style.background = 'rgba(255,255,255,0.2)';
                tkBtn.style.background = '#f093fb';
            }
        }

        switchProvider(provider) {
            CONFIG.AI_PROVIDER = provider;
            const geminiBtn = document.getElementById('sg-provider-gemini');
            const openrouterBtn = document.getElementById('sg-provider-openrouter');

            if (provider === 'gemini') {
                geminiBtn.style.background = '#10b981';
                openrouterBtn.style.background = 'rgba(255,255,255,0.2)';
            } else {
                geminiBtn.style.background = 'rgba(255,255,255,0.2)';
                openrouterBtn.style.background = '#f59e0b';
            }

            this.checkAPIKeys();
        }

        checkAPIKeys() {
            const provider = CONFIG.AI_PROVIDER;
            let hasKey = provider === 'gemini' ?
                CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE' :
                CONFIG.OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_API_KEY_HERE';

            document.getElementById('sg-generate-btn').disabled = !hasKey;
        }

        updateStylePreview() {
            const selectedStyle = document.getElementById('sg-style-select').value;
            document.getElementById('sg-style-preview').value = CONFIG.VIETNAMESE_STYLES[selectedStyle];
        }

        async injectStyleOnly() {
            try {
                const style = CONFIG.VIETNAMESE_STYLES[document.getElementById('sg-style-select').value];
                await this.setMusicStyle(style);
                this.updateStatus('✅ Style injected!');
            } catch (error) {
                this.updateStatus(`❌ ${error.message}`, true);
            }
        }

        toggleMinimize() {
            const content = document.getElementById('sg-panel-content');
            const btn = document.getElementById('sg-minimize-btn');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            btn.textContent = content.style.display === 'none' ? '+' : '−';
        }

        updateStatus(message, isError = false) {
            const status = document.getElementById('sg-status');
            status.textContent = message;
            status.style.background = isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0,0,0,0.2)';
        }

        showMP3Modal(song) {
            const modal = document.getElementById('sg-mp3-modal');
            const backdrop = document.getElementById('sg-modal-backdrop');
            const versionsDiv = document.getElementById('sg-mp3-versions');
            const titleEl = document.getElementById('sg-mp3-modal-title');

            titleEl.textContent = `🎵 ${song.title}`;

            versionsDiv.innerHTML = song.mp3Versions.map((version) => `
                <div style="margin-bottom: 8px; display: flex; gap: 6px;">
                    <button data-mp3-url="${version.url}" data-version-name="${version.name}" class="preview-mp3-btn"
                            style="flex: 1; padding: 12px; background: rgba(255,255,255,0.15);
                            border: none; border-radius: 6px; color: white; cursor: pointer; text-align: left;
                            font-size: 13px; transition: all 0.2s;">
                        🎤 ${version.name}
                    </button>
                    <button data-mp3-url="${version.url}" data-song-title="${song.title}" data-version-name="${version.name}" class="download-mp3-btn"
                            style="padding: 12px 16px; background: #10b981; border: none; border-radius: 6px;
                            color: white; cursor: pointer; font-size: 13px; font-weight: 600;">
                        📥
                    </button>
                </div>
            `).join('');

            versionsDiv.querySelectorAll('.preview-mp3-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const playerDiv = document.getElementById('sg-audio-player');
                    const audio = document.getElementById('sg-audio');
                    const label = document.getElementById('sg-audio-label');
                    audio.src = btn.dataset.mp3Url;
                    audio.load();
                    playerDiv.style.display = 'block';
                    label.textContent = `🎧 ${btn.dataset.versionName}`;
                });
            });

            versionsDiv.querySelectorAll('.download-mp3-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    GM_download({
                        url: btn.dataset.mp3Url,
                        name: `${btn.dataset.songTitle} - ${btn.dataset.versionName}.mp3`,
                        saveAs: false,
                        onerror: (err) => {
                            console.error('GM_download failed, trying fallback:', err);
                            this.fallbackDownload(btn.dataset.mp3Url, `${btn.dataset.songTitle} - ${btn.dataset.versionName}.mp3`);
                        }
                    });
                });
            });

            modal.style.display = 'block';
            backdrop.style.display = 'block';
        }

        fallbackDownload(url, filename) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: (response) => {
                    const blob = response.response;
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                }
            });
        }

        closeMP3Modal() {
            document.getElementById('sg-mp3-modal').style.display = 'none';
            document.getElementById('sg-modal-backdrop').style.display = 'none';
            document.getElementById('sg-audio-player').style.display = 'none';
            const audio = document.getElementById('sg-audio');
            audio.pause();
            audio.src = '';
        }

        async generateLyrics() {
            const prompt = document.getElementById('sg-lyric-prompt').value.trim();
            const count = parseInt(document.getElementById('sg-lyrics-count').value) || 10;

            if (!prompt) {
                this.updateStatus('⚠️ Nhập chủ đề!', true);
                return;
            }

            this.updateStatus(`🔄 Generating...`);

            try {
                const systemPrompt = `
Viết lời bài hát tiếng Việt ${count} bài theo chủ đề: ${prompt}

YÊU CẦU BẮT BUỘC:
- 100% lời Việt, tự nhiên, có vần điệu, lời nhạc cuốn hút và vần âm điệu
- Cấu trúc: [Intro] [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Chorus] [Bridge] [Chorus] [Outro].
   - Add descriptive musical cues INSIDE the tags, e.g., [Verse 1: Raspy vocals, steady rhythm guitar], guiding elements like vocals, instruments, builds, effects, or SFX (e.g., rain, wind) that match the theme.
   - Ensure a logical flow from Intro to Outro.
- Mỗi bài 16-24 câu, cân đối giữa verse và chorus
- Chorus phải catchy, dễ nhớ, lặp lại được, dễ viral trên tiktok
- Sử dụng hình ảnh thơ mộng, cảm xúc sâu sắc
- Để tên bài hát vào trong tag . ví dụ : [ tên bài hát ]
PHONG CÁCH LỜI:
- Ballad: Tâm trạng, day dứt, hình ảnh mưa/đêm/ly biệt, hận, yêu , nhớ, giá như,....
- V-Pop: Năng động, tích cực, về tuổi trẻ/tình yêu/ước mơ
- Rap: Chơi chữ, so sánh, storytelling, flow mạnh mẽ
- Indie: Tối giản, chân thật, góc nhìn đời thường

Chỉ output lời bài hát từ intro cho tới outro. Mỗi bài cách nhau bằng: ###SONG_SPLIT###
                `;

                let fullText;
                if (CONFIG.AI_PROVIDER === 'gemini') {
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: systemPrompt }] }],
                                generationConfig: {
                                    temperature: 0.95,
                                    maxOutputTokens: 8192
                                },
                                safetySettings: [
                                    {
                                        category: "HARM_CATEGORY_HARASSMENT",
                                        threshold: "BLOCK_NONE"
                                    },
                                    {
                                        category: "HARM_CATEGORY_HATE_SPEECH",
                                        threshold: "BLOCK_NONE"
                                    },
                                    {
                                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                        threshold: "BLOCK_NONE"
                                    },
                                    {
                                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                        threshold: "BLOCK_NONE"
                                    }
                                ]
                            })
                        }
                    );

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
                    }

                    const data = await response.json();

                    // ✅ Comprehensive error checking
                    if (!data.candidates || data.candidates.length === 0) {
                        console.error('Gemini response:', data);
                        throw new Error('Gemini blocked the request. Try a different prompt or use OpenRouter.');
                    }

                    const candidate = data.candidates[0];

                    // Check for blocking
                    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
                        throw new Error(`Content blocked: ${candidate.finishReason}. Try OpenRouter instead.`);
                    }

                    // Check for content
                    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                        console.error('Gemini candidate:', candidate);
                        throw new Error('Gemini returned empty response. Try again or use OpenRouter.');
                    }

                    fullText = candidate.content.parts[0].text;

                    if (!fullText || fullText.trim().length === 0) {
                        throw new Error('Gemini returned empty text. Try OpenRouter instead.');
                    }

                } else {
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`
                        },
                        body: JSON.stringify({
                            model: CONFIG.OPENROUTER_MODEL,
                            messages: [{ role: 'user', content: systemPrompt }]
                        })
                    });
                    const data = await response.json();
                    fullText = data.choices[0].message.content;
                }

                this.generatedLyrics = fullText.split('###SONG_SPLIT###')
                    .map(l => l.trim())
                    .filter(l => l.length > 50)
                    .slice(0, count)
                    //.map((lyrics, idx) => ({ title: `Bài ${idx + 1}`, lyrics, isGenerated: true }));
                    .map(lyrics => {
                    const title = lyrics.split('\n')[0].trim();
                    return { title, lyrics, isGenerated: true };
                });


                this.displaySongList(this.generatedLyrics);
                this.updateStatus(`✅ Generated ${this.generatedLyrics.length} lyrics!`);
                document.getElementById('sg-action-buttons').style.display = 'flex';
            } catch (error) {
                console.error('Generation error:', error);
                this.updateStatus(`❌ ${error.message}`, true);
            }
        }

        async fetchPlaylist() {
            const url = document.getElementById('sg-playlist-url').value.trim();
            if (!url) return;

            this.updateStatus('🔄 Fetching...');

            try {
                const songs = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: CONFIG.PROXY + encodeURIComponent(url),
                        onload: (response) => {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(response.responseText, 'text/html');
                            const songs = [];

                            doc.querySelectorAll('a[href*=".html"]').forEach((link) => {
                                const href = link.getAttribute('href');
                                const title = link.textContent?.trim();

                                if (href && title && !href.includes('playlist') && !href.includes('singer')) {
                                    const fullUrl = href.startsWith('http') ? href : `${CONFIG.TKARAOKE_BASE}${href}`;
                                    if (!songs.find(s => s.url === fullUrl)) {
                                        songs.push({ title, url: fullUrl, lyrics: null, mp3Versions: [], isGenerated: false });
                                    }
                                }
                            });

                            resolve(songs);
                        },
                        onerror: () => reject(new Error('Network error'))
                    });
                });

                this.playlist = songs;
                this.displaySongList(songs);
                this.updateStatus(`✅ Found ${songs.length} songs!`);
                document.getElementById('sg-action-buttons').style.display = 'flex';
            } catch (error) {
                this.updateStatus(`❌ ${error.message}`, true);
            }
        }

        async fetchSongDetails(song) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: CONFIG.PROXY + encodeURIComponent(song.url),
                    onload: (response) => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');

                        const lyricDiv = doc.querySelector('div.div-content-lyric') || doc.querySelector('div.div-lyric');
                        let lyrics = '';
                        if (lyricDiv) {
                            const cloned = lyricDiv.cloneNode(true);
                            cloned.querySelectorAll('script, style, a, i, ul, li, h1, h2, h3, h4').forEach(el => el.remove());
                            cloned.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
                            lyrics = (cloned.innerText || '').split('\n').map(l => l.trim()).filter(l => l).join('\n');
                        }

                        const mp3Versions = [];
                        doc.querySelectorAll('a[title="Nghe bài hat"]').forEach((link) => {
                            const href = link.getAttribute('href');
                            const match = href?.match(/\/mp3\/(\d+)_/);
                            if (match) {
                                const id = match[1];
                                let filename = href.split('/').pop()?.replace('.html', '') || '';
                                let singerName = filename.substring(filename.indexOf('_') + 1).replace(/_/g, ' ') || `Version ${mp3Versions.length + 1}`;
                                mp3Versions.push({
                                    url: `https://ytmedia.tkaraoke.com/audio?refId=${id}`,
                                    name: singerName
                                });
                            }
                        });

                        resolve({ lyrics, mp3Versions });
                    },
                    onerror: () => reject(new Error('Network error'))
                });
            });
        }

        displaySongList(songs) {
            const listDiv = document.getElementById('sg-song-list');
            listDiv.style.display = 'block';
            listDiv.innerHTML = '';

            songs.forEach((song, idx) => {
                const hasLyrics = song.lyrics || song.isGenerated;
                const hasMp3 = song.mp3Versions?.length > 0;

                const songEl = document.createElement('div');
                songEl.style.cssText = 'padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; border-left: 3px solid #10b981;';

                songEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">${idx + 1}. ${song.title}</div>
                            <div class="status-${idx}" style="font-size: 11px; opacity: 0.7;">
                                ${hasLyrics ? `✅ ${song.lyrics?.split('\n').length || 0} dòng` : 'Chưa fetch'}
                                ${hasMp3 ? ` • ${song.mp3Versions.length} MP3` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            ${!song.isGenerated ? `
                                <button class="fetch-${idx}" style="padding: 6px 10px; background: #3b82f6;
                                        border: none; border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">Fetch</button>` : ''}
                            <button class="inject-${idx}" ${!hasLyrics ? 'disabled' : ''}
                                    style="padding: 6px 10px; background: #10b981; border: none; border-radius: 4px;
                                    color: white; font-size: 11px; cursor: pointer; opacity: ${hasLyrics ? '1' : '0.5'};">Inject</button>
                            ${!song.isGenerated ? `
                                <button class="mp3-${idx}" ${!hasMp3 ? 'disabled' : ''}
                                        style="padding: 6px 10px; background: #8b5cf6; border: none; border-radius: 4px;
                                        color: white; font-size: 11px; cursor: pointer; opacity: ${hasMp3 ? '1' : '0.5'};">
                                    MP3 ${hasMp3 ? `(${song.mp3Versions.length})` : ''}</button>` : ''}
                        </div>
                    </div>
                `;

                listDiv.appendChild(songEl);

                if (!song.isGenerated) {
                    songEl.querySelector(`.fetch-${idx}`)?.addEventListener('click', async () => {
                        const btn = songEl.querySelector(`.fetch-${idx}`);
                        btn.textContent = '⏳';
                        btn.disabled = true;
                        try {
                            const details = await this.fetchSongDetails(song);
                            song.lyrics = details.lyrics;
                            song.mp3Versions = details.mp3Versions;

                            songEl.querySelector(`.status-${idx}`).textContent = `✅ ${details.lyrics.split('\n').length} dòng • ${details.mp3Versions.length} MP3`;
                            btn.textContent = '✓';
                            btn.style.background = '#10b981';

                            songEl.querySelector(`.inject-${idx}`).disabled = false;
                            songEl.querySelector(`.inject-${idx}`).style.opacity = '1';

                            const mp3Btn = songEl.querySelector(`.mp3-${idx}`);
                            if (mp3Btn && details.mp3Versions.length > 0) {
                                mp3Btn.disabled = false;
                                mp3Btn.style.opacity = '1';
                                mp3Btn.textContent = `MP3 (${details.mp3Versions.length})`;
                            }
                        } catch (error) {
                            btn.textContent = 'Retry';
                            btn.disabled = false;
                        }
                    });

                    songEl.querySelector(`.mp3-${idx}`)?.addEventListener('click', () => {
                        if (song.mp3Versions.length > 0) this.showMP3Modal(song);
                    });
                }

                songEl.querySelector(`.inject-${idx}`)?.addEventListener('click', () => this.injectSingle(idx));
            });
        }

        async injectSingle(idx) {
            const song = this.currentMode === 'ai' ? this.generatedLyrics[idx] : this.playlist[idx];
            if (!song.lyrics) return;

            try {
                const style = CONFIG.VIETNAMESE_STYLES[document.getElementById('sg-style-select').value];
                await this.navigateToCustomMode();
                await this.injectTitle(song.title);
                await this.injectLyric(song.lyrics);
               // await this.setMusicStyle(style);
                this.updateStatus(`✅ Injected: ${song.title}`);
            } catch (error) {
                this.updateStatus(`❌ ${error.message}`, true);
            }
        }

        async startAutoInject() {
            this.isProcessing = true;
            document.getElementById('sg-start-btn').style.display = 'none';
            document.getElementById('sg-stop-btn').style.display = 'block';

            const delay = this.currentMode === 'tkaraoke' ?
                parseInt(document.getElementById('sg-tk-delay-input').value) :
                parseInt(document.getElementById('sg-delay-input').value);

            const style = CONFIG.VIETNAMESE_STYLES[document.getElementById('sg-style-select').value];
            const songs = this.currentMode === 'ai' ? this.generatedLyrics : this.playlist;

            try {
                for (let i = 0; i < songs.length && this.isProcessing; i++) {
                    const song = songs[i];

                    if (!song.lyrics && !song.isGenerated) {
                        const details = await this.fetchSongDetails(song);
                        song.lyrics = details.lyrics;
                    }

                    if (!song.lyrics) continue;

                    this.updateStatus(`🎵 ${i + 1}/${songs.length}: ${song.title}`);

                    await this.navigateToCustomMode();
                    await this.injectTitle(song.title);
                    await this.injectLyric(song.lyrics);
                    await this.setMusicStyle(style);
                    await this.createSong();

                    if (i < songs.length - 1) await this.sleep(delay);
                }

                this.updateStatus(`🎉 Completed!`);
            } catch (error) {
                this.updateStatus(`❌ ${error.message}`, true);
            } finally {
                this.resetUI();
            }
        }

        stopProcessing() {
            this.isProcessing = false;
            this.resetUI();
        }

        resetUI() {
            document.getElementById('sg-start-btn').style.display = 'block';
            document.getElementById('sg-stop-btn').style.display = 'none';
        }

        async navigateToCustomMode() {
            if (!window.location.href.includes('/create')) {
                document.querySelector('a[href="/create"]')?.click();
                await this.sleep(2000);
            }
            await this.sleep(500);
            Array.from(document.querySelectorAll('button, div[role="tab"]'))
                .find(el => el.textContent.trim().toLowerCase() === 'custom')?.click();
            await this.sleep(1000);
        }

        async injectTitle(text) {
            const input = document.querySelector('input[placeholder*="title" i]') ||
                         document.querySelector('input[placeholder*="Title" i]');

            if (!input) {
                console.warn('Title input not found');
                return;
            }

            input.focus();
            await this.sleep(100);
            input.value = '';
            const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, text);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await this.sleep(200);
        }

        async injectLyric(text) {
            // Strategy 1: Find by placeholder
            let textarea = document.querySelector('textarea[placeholder*="yric"]') ||
                          document.querySelector('textarea[placeholder*="Lyric"]');

            // Strategy 2: Find the tallest textarea without maxlength
            if (!textarea) {
                const textareas = Array.from(document.querySelectorAll('textarea'));
                const filtered = textareas.filter(ta => !ta.maxLength && ta.offsetParent !== null);
                if (filtered.length > 0) {
                    textarea = filtered.sort((a, b) => b.offsetHeight - a.offsetHeight)[0];
                }
            }

            // Strategy 3: Find by common height (Suno's lyric box is usually 200-400px)
            if (!textarea) {
                const candidates = Array.from(document.querySelectorAll('textarea'))
                    .filter(ta => ta.offsetHeight > 150 && ta.offsetHeight < 500);
                if (candidates.length > 0) {
                    textarea = candidates[0];
                }
            }

            if (!textarea) {
                console.error('Available textareas:', document.querySelectorAll('textarea'));
                throw new Error('Lyric textarea not found. Make sure you are in Custom mode.');
            }

            console.log('✅ Found lyric textarea:', textarea, 'Height:', textarea.offsetHeight, 'MaxLength:', textarea.maxLength);

            textarea.focus();
            await this.sleep(150);

            // Clear and set value
            textarea.value = '';
            const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
            nativeSetter.call(textarea, text);

            // Trigger React events
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: text
            }));

            await this.sleep(300);

            // Verify
            if (textarea.value === text) {
                console.log('✅ Lyric injected successfully');
            } else {
                console.warn('⚠️ Verification failed, retrying with typing simulation...');
                await this.simulateTyping(textarea, text);
            }
        }

        async simulateTyping(textarea, text) {
            textarea.focus();
            await this.sleep(100);
            textarea.value = '';

            for (let i = 0; i < text.length; i++) {
                textarea.value += text[i];
                textarea.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    data: text[i],
                    inputType: 'insertText'
                }));

                if (i % 20 === 0) await this.sleep(5);
            }

            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            await this.sleep(200);
            console.log('✅ Lyric injected via typing simulation');
        }

        async setMusicStyle(style) {
            const textarea = document.querySelector('textarea[maxlength="1000"]') ||
                           Array.from(document.querySelectorAll('textarea'))
                               .find(ta => ta.maxLength === 1000);

            if (!textarea) {
                console.warn('Style textarea not found');
                return;
            }

            console.log('✅ Found style textarea');

            textarea.focus();
            await this.sleep(150);

            textarea.value = '';
            const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
            nativeSetter.call(textarea, style);

            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: style
            }));

            await this.sleep(300);

            if (textarea.value === style) {
                console.log('✅ Style injected successfully');
            } else {
                console.warn('⚠️ Style injection failed, retrying...');
                await this.simulateTyping(textarea, style);
            }
        }

        async createSong() {
            await this.sleep(800);
            const btn = Array.from(document.querySelectorAll('button'))
                .find(btn => btn.textContent.toLowerCase().includes('create') && !btn.disabled);

            if (btn) {
                btn.click();
                console.log('✅ Create button clicked');
            } else {
                console.warn('⚠️ Create button not found');
            }
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.sunoAI = new SunoAIGenerator();
        });
    } else {
        window.sunoAI = new SunoAIGenerator();
    }
})();


///lrc download




(function () {
    'use strict';
    const file_type = "lrc"; // lrc or srt

    // ================= COOKIE =================
    function getLastCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length > 1) {
            return parts[parts.length - 1].split(';')[0];
        }
    }

    // ================= MERGED LRC (MUST BE ABOVE BUTTON) =================
    function convertToMergedLRC(alignedWords, gapMs = 700, maxWords = 10) {
        let result = [];
        let lineText = '';
        let lineTime = null;
        let lastStart = null;
        let wordCount = 0;
    
        alignedWords.forEach(word => {
            const startMs = word.start_s * 1000;
            const cleanWord = String(word.word || '')
                .replace(/\[.*?\]/g, '')
                .trim();
    
            if (!cleanWord) {
                lastStart = startMs;
                return;
            }
    
            const isNewLineByGap =
                lastStart !== null && startMs - lastStart > gapMs;
    
            const isTooLong = wordCount >= maxWords;
    
            if (lineText && (isNewLineByGap || isTooLong)) {
                result.push(`${lineTime} ${lineText.trim()}`);
                lineText = '';
                wordCount = 0;
            }
    
            if (!lineText) {
                lineTime = formatLrcTime(word.start_s);
                lineText = cleanWord;
                wordCount = 1;
            } else {
                lineText += ' ' + cleanWord;
                wordCount++;
            }
    
            lastStart = startMs;
        });
    
        if (lineText) {
            result.push(`${lineTime} ${lineText.trim()}`);
        }
    
        // empty line between lyric lines
        return result.join('\n');
    }


    // ================= FETCH =================
    async function fetchAlignedWords(songId, token) {
        const apiUrl = `https://studio-api.prod.suno.com/api/gen/${songId}/aligned_lyrics/v2/`;
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            if (data && data.aligned_words) return data.aligned_words;
        } catch (err) {
            console.error("Fetch error:", err);
        }
    }

    // ================= UI =================
    function addButton(imageSrc, alignedWords) {
        const imageElements = document.querySelectorAll(`img[src*="${imageSrc}"].w-full.h-full`);

        imageElements.forEach(imageElement => {
            if (!imageElement) return;

            // ORIGINAL BUTTON
            const button = document.createElement('button');
            button.innerText = 'Download ' + file_type;
            button.style.position = 'absolute';
            button.style.bottom = '0';
            button.style.left = '0';
            button.style.right = '0';
            button.style.background = 'gray';
            button.style.borderRadius = '5px';
            button.style.padding = '10px 6px';
            button.style.zIndex = '9999';

            button.onclick = () => {
                const content =
                    file_type === 'srt'
                        ? convertToSRT(alignedWords)
                        : convertToLRC(alignedWords);

                download(content, 'aligned_words.' + file_type);
            };

            // FORMATTED BUTTON
            const buttonFormatted = document.createElement('button');
            buttonFormatted.innerText = 'Download Formatted LRC';
            buttonFormatted.style.position = 'absolute';
            buttonFormatted.style.bottom = '44px';
            buttonFormatted.style.left = '0';
            buttonFormatted.style.right = '0';
            buttonFormatted.style.background = '#2563eb';
            buttonFormatted.style.color = 'white';
            buttonFormatted.style.borderRadius = '5px';
            buttonFormatted.style.padding = '10px 6px';
            buttonFormatted.style.zIndex = '9999';

            buttonFormatted.onclick = () => {
                const formatted = convertToMergedLRC(alignedWords);
                download(formatted, 'formatted_lyrics.lrc');
            };

            imageElement.parentNode.appendChild(buttonFormatted);
            imageElement.parentNode.appendChild(button);
        });
    }

    // ================= CONVERT =================
    function convertToSRT(alignedWords) {
        let srt = '';
        alignedWords.forEach((w, i) => {
            srt += `${i + 1}\n`;
            srt += `${formatTime(w.start_s)} --> ${formatTime(w.end_s)}\n`;
            srt += `${w.word}\n\n`;
        });
        return srt;
    }

    function convertToLRC(alignedWords) {
        return alignedWords
            .map(w => `${formatLrcTime(w.start_s)}${w.word}`)
            .join('\n');
    }

    function formatTime(seconds) {
        const d = new Date(0);
        d.setMilliseconds(seconds * 1000);
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')},${String(d.getUTCMilliseconds()).padStart(3, '0')}`;
    }

    function formatLrcTime(seconds) {
        const d = new Date(0);
        d.setMilliseconds(seconds * 1000);
        return `[${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}.${String(Math.floor(d.getUTCMilliseconds() / 10)).padStart(2, '0')}]`;
    }

    function download(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ================= MAIN =================
    function main() {
        const songId = location.href.split('/').pop();
        const token = getLastCookie('__session');
        if (!token) return;

        fetchAlignedWords(songId, token).then(words => {
            if (words) addButton(songId, words);
        });
    }

    setTimeout(main, 5000);
})();
