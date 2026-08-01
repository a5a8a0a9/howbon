# 好棒棒集章

一個手機優先、可安裝的 Angular 22 PWA。使用 Google 帳號保存每一次值得肯定的小事，集滿五枚章即可解鎖徽章與獎賞票券；票券可以自由兌換，或選擇預先建立的獎賞願望。

完整產品與資料規格請見 [`docs/cloud-account-and-rewards-spec.md`](docs/cloud-account-and-rewards-spec.md)。

## 功能

- Google SSO 登入與依帳號隔離的 Firestore 資料
- 每次蓋章可留下、修改或清空選填留言
- 每五枚章自動產生一枚徽章與一張票券
- 可重複使用的獎賞願望清單
- 自由兌換或指定願望的票券紀錄
- Firestore persistent cache 與離線唯讀狀態
- 自行託管的 Material Symbols Rounded icon font
- PWA 安裝與版本更新提示

舊版 `localStorage` 進度不會讀取、搬移或上傳。

## 必要環境

- Node.js 24
- npm 11
- JDK 21（Firebase Emulator 必要）
- 一個 Firebase project

目前專案的 `.firebaserc` 使用安全的 `demo-howbon` 作為本機 Emulator project ID。連接正式 Firebase project 前，請將它改成實際 project ID。

## Firebase Console 設定

1. 建立 Firebase project 與 Web App。
2. 在 Authentication 啟用 Google provider。
3. 在 Authentication 的 Authorized domains 加入：
   - `localhost`
   - `howbon.young-app.com`
   - 實際使用的 GitHub Pages 網域
4. 建立 Native mode Cloud Firestore；台灣使用者建議採 `asia-east1`。
5. 將 Firebase Web App config 填入 `src/environments/environment.ts`，取代所有 `REPLACE_WITH_...` 值。
6. 將 `.firebaserc` 的 `default` 改成正式 Firebase project ID。

Firebase Web config 會打包在前端，不能放入 Admin SDK 私鑰或服務帳號憑證；資料授權由 `firestore.rules` 負責。

## 本機開發

```bash
npm install
npm start
```

開啟 `http://localhost:4200`。Firebase 尚未填寫時，應用程式會顯示設定提示，不會白屏或嘗試連線。

啟動完整 Firebase Emulator：

```bash
npm run firebase:emulators
```

目前前端預設連接正式 Firebase config；Rules 自動測試則會使用 `demo-howbon` Firestore Emulator，不會觸碰正式資料。

## 驗證

```bash
npm test -- --watch=false
npm run test:rules
npm run build -- --configuration production
```

- Angular 測試涵蓋登入門檻、蓋章留言、第五章獎勵與願望／票券 UI。
- Rules 測試涵蓋未登入拒絕、帳號隔離、願望驗證與票券單向兌換。
- 正式輸出位於 `dist/howbon/browser`。

## 發布

推送至 `main` 後，GitHub Actions 會使用 Node.js 24 與 JDK 21 執行 Angular 測試、Firestore Rules Emulator 測試、production build，並部署網站至 GitHub Pages。

首次正式發布前，需由已登入 Firebase CLI 的維護者發布 Rules 與 indexes：

```bash
npm run firebase:deploy:rules
```

網站仍部署於 `https://howbon.young-app.com`，不使用 Firebase Hosting。
