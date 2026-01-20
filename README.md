# 🎵 Suno Power Tools: Ultimate Music Injection Suite

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg) ![Platform](https://img.shields.io/badge/platform-Tampermonkey-green.svg) ![Site](https://img.shields.io/badge/support-Suno.com-orange.svg)

**Suno Power Tools** là bộ userscript mạnh mẽ dành cho [Suno.com](https://suno.com), giúp tự động hóa quy trình sáng tác nhạc bằng cách tích hợp trực tiếp nguồn nhạc từ **NhacCuaTui (NCT)**, **TKaraoke**, và **AI Lyrics Generation**.

Không còn copy-paste thủ công. Không còn lo tìm file MP3 gốc. Tất cả trong một bảng điều khiển nổi ngay trên giao diện Suno.

---

## ✨ Tính Năng Nổi Bật

### 1. 🎧 NCT Injector (NhacCuaTui)
*   **Fetch Lyrics:** Tự động tải lời bài hát từ link NCT (hỗ trợ cả lời nhạc plain text và karaoke time-synced `.lrc`).
*   **Smart Decrypt:** Tự động giải mã file `.lrc` mã hóa của NCT.
*   **Clean MP3:** Lấy link MP3 gốc chất lượng cao, tự động loại bỏ các tham số rác (`?st=...`) để dễ dàng chia sẻ hoặc tải về.
*   **Dual Inject Modes:**
    *   **Inject (Timed):** Giữ nguyên timestamp `[03:21]` để AI hát đúng nhịp.
    *   **Inject (Clean):** Tự động lọc bỏ timestamp, chỉ lấy lời sạch.

### 2. 🎤 TKaraoke Scraper
*   **Playlist Scraping:** Quét toàn bộ playlist từ TKaraoke.
*   **Auto-Fetch:** Lấy lời bài hát và link tải MP3 beat gốc (nếu có).
*   **Batch Injection:** Tự động điền lời và tiêu đề cho hàng loạt bài hát (dành cho power users).

### 3. 🤖 AI Lyric Generator
*   **Gemini / OpenRouter:** Tích hợp API AI để sáng tác lời bài hát theo chủ đề.
*   **Vietnamese Styles:** 9 preset phong cách nhạc Việt chuẩn (Bolero, V-Pop, Indie, Rap Việt...) để inject vào ô Style của Suno.

---

## 🚀 Cài Đặt

### Yêu cầu
1.  Trình duyệt Chrome, Edge, hoặc Firefox.
2.  Extension **Tampermonkey** ([Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)).

### Bước 1: Cài đặt Script
Tạo một script mới trong Tampermonkey và copy đoạn mã nguồn mới nhất (v1.8) vào.

### Bước 2: Cấp quyền (Quan trọng)
Script cần kết nối đến `nhaccuatui.com` và `corsproxy.io` để vượt qua cơ chế bảo mật trình duyệt.
Khi chạy lần đầu, Tampermonkey sẽ hỏi quyền:
*   Chọn **"Always Allow"** (Luôn cho phép) cho các domain kết nối.

---

## 📖 Hướng Dẫn Sử Dụng

### Mode 1: NhacCuaTui (NCT)
Dùng để cover lại các bài hát đang hot hoặc lấy lời nhạc chuẩn.

1.  Truy cập [Suno.com/create](https://suno.com/create).
2.  Mở tab **Custom Mode**.
3.  Tại bảng điều khiển góc phải dưới:
    *   Paste link bài hát (Ví dụ: `https://www.nhaccuatui.com/song/xYz...`).
    *   Bấm **Fetch**.
4.  Sau khi load xong:
    *   Bấm **Inject (Timed)** nếu muốn AI hát theo nhịp gốc.
    *   Bấm **Inject (Clean)** để AI tự do sáng tạo nhịp điệu.
    *   Click **Open MP3** để nghe hoặc tải beat gốc về tham khảo.

### Mode 2: TKaraoke & AI (Advanced)
Dành cho việc sáng tạo album hoặc scraping dữ liệu.

*   Chuyển sang tab **TKaraoke** trên bảng điều khiển.
*   Nhập link playlist TKaraoke -> Bấm **Fetch Playlist**.
*   Script sẽ liệt kê toàn bộ bài hát. Bấm **Inject** vào bài bất kỳ để điền thông tin vào Suno.

---

## 🛠 Troubleshooting (Sửa lỗi thường gặp)

| Lỗi | Nguyên nhân & Cách sửa |
| :--- | :--- |
| **Network Error** | Do chặn CORS. Đảm bảo script có dòng `@connect corsproxy.io` và bạn đã bấm "Allow" trong Tampermonkey. |
| **No Data Found** | Link NCT bị lỗi hoặc bài hát bản quyền bị ẩn. Thử link bài hát khác hoặc dùng link dạng `/song/ID`. |
| **Direct MP3 Error** | Bạn đang paste link file `.mp3` trực tiếp. Hãy paste link **trang bài hát** (có giao diện web) để script quét được lời. |
| **Inject không ăn** | Suno vừa cập nhật giao diện? Thử refresh trang web (F5) và đợi 2s để script load lại các selector. |

---

## ⚠️ Disclaimer
Công cụ này được phát triển cho mục đích giáo dục và hỗ trợ sáng tạo cá nhân.
*   Vui lòng tôn trọng bản quyền tác giả khi sử dụng lời bài hát và beat nhạc.
*   Không sử dụng tool để spam hệ thống của Suno hoặc NhacCuaTui.

---

### ⭐ Credits
Developed for the **Suno AI Community** (Vietnam).
*Happy Creating!* 🎵
