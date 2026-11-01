# 風玥茶研所 La'Brezza 新網站

依設計方案 1a「焙火敘事」製作的靜態網站，不需安裝任何套件。

## 建置

```bash
node site/build.mjs
```

輸出到 `site/dist/`。放在子路徑（例如 GitHub Pages 的 `/labrezzatea/`）時設定 `BASE_PATH=/labrezzatea/`。

本機預覽：

```bash
python -m http.server 8090 --directory site/dist
```

推送到 `main` 後，GitHub Actions（`.github/workflows/pages.yml`）會自動建置並發佈到 GitHub Pages。

## 檔案

- `content/data.js`：設計檔附的內容資料（茶品、新聞、獲獎、茶學語錄）
- `content/supplement.json`：從原站補齊的聯絡資訊、文章全文與外部連結
- `src/styles.css`、`src/main.js`：全站樣式與動態效果
- `assets-src/`：原始圖片；`assets/`：縮圖後的圖片（`scripts/optimize-images.ps1` 產生）
- `build.mjs`：產生所有頁面、舊網址轉址、sitemap.xml

## 上線前待辦

- 表單：在 `build.mjs` 的 `CONFIG.formEndpoint` 填入表單服務網址；未填時會改開使用者的郵件程式寄信
- 獲獎年份：新聞 42、3 的正式年份待業主確認
- 正式網域：`CONFIG.siteUrl` 目前為 https://www.labrezzatea.com

## 手機選單與精修更新

- 導覽毛玻璃改由背景偽元素處理，避免捲動後的 `backdrop-filter` 將全螢幕固定選單限制在導覽列內。
- 開啟選單鎖住背景並保存捲動位置；關閉、Escape、點選導覽或切換到桌面尺寸時解除。選單可用鍵盤循環操作，短螢幕可獨立捲動。
- 首頁加入選茶與合作入口，減少粒子並將跑馬燈改為靜態品牌文字。
- 焙火刻度只表示淺／中／深；競賽級獨立呈現。手機分類按鈕至少 44px 高。
- 聯絡頁縮短橫幅，強化欄位與必填提示；尚未串接表單服務時明確標示會開啟郵件程式，仍需使用者確認寄出。
- 頁面固定自身的 URL 基準，避免茶品分類透過 History API 改變網址後，相對連結與延遲載入圖片指向錯誤位置。

`assets-src/craft-clean.png` 為原始 `s1.jpg` 透過內建 ImageGen 去除疊字後的新版本，原圖保留。編輯指示：只移除中央「炭・光火之歌」與文字底色，保留炭木、火光、煙霧與構圖；輸出縮圖為 `assets/craft-clean-800.jpg` 與 `assets/craft-clean-1920.jpg`。茶園及首頁分類照片以 CSS 做低幅度色調統一，茶品內頁保留原照片色彩。
