# 好棒棒集章

一個手機優先、可離線安裝的 Angular 22 PWA。替每一件值得肯定的小事蓋章，集滿五個印章就解鎖一枚「好棒棒徽章」。

## 功能

- 手動蓋章與集滿動畫
- 每五章自動解鎖徽章
- 瀏覽器本機保存進度
- 可安裝 PWA 與離線使用
- 新版本更新提示
- 響應式與減少動態效果支援

## 本機開發

```bash
npm install
npm start
```

開啟 `http://localhost:4200`。

## 驗證

```bash
npm test -- --watch=false
npm run build
```

正式版輸出位於 `dist/howbon/browser`，部署時需使用 HTTPS 並將未知路徑回退至 `index.html`。

## 資料與隱私

進度只保存在使用者目前瀏覽器的 `localStorage`，不會傳送到伺服器，也不支援跨裝置同步。
