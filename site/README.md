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
