# 好棒棒集章：雲端帳號與獎賞願望清單規格

## 1. 產品目標

將「好棒棒集章」從單一瀏覽器的本機集章工具，升級為使用 Google 帳號登入、可跨裝置同步的個人成長日誌。使用者每次蓋章可留下選填留言；每五枚章會獲得一枚徽章與一張獎賞票券。使用者可以預先維護願望清單，並在兌換票券時選擇願望或自由兌換。

本版本不包含：既有 `localStorage` 資料搬移、公開個人頁、社群排名、管理員、陪伴者共同給章、刪除蓋章、恢復已兌換票券、票券價格或願望庫存。

## 2. 使用者流程

### 2.1 登入與登出

1. 應用程式啟動時等待 Firebase Authentication 恢復登入狀態。
2. 未登入時只顯示產品說明、資料使用提示與 Google 登入按鈕。
3. 使用者主動點擊後，以 Google popup 完成登入。
4. popup 取消或失敗時留在登入畫面並顯示可重試錯誤。
5. 登入後顯示使用者名稱、頭像與登出操作。
6. 登出不刪除任何雲端資料。

### 2.2 蓋章與留言

1. 點擊「蓋一個好棒章」後開啟留言視窗。
2. 留言選填；取消不產生蓋章，確認才送出 Firestore transaction。
3. 第 1 至第 4 枚章新增紀錄並累加目前章數。
4. 第 5 枚章在同一 transaction 中新增紀錄、將目前章數歸零、徽章數加一，並建立一張可用票券。
5. transaction 成功後才播放蓋章或徽章解鎖動畫；失敗時保留輸入並允許重試。
6. 留言可事後修改或清空，但蓋章紀錄及建立時間不可刪除或修改。

### 2.3 願望清單

1. 願望只有必填名稱，可新增、改名與刪除。
2. 願望可被不同票券重複選擇，兌換後仍保留在清單。
3. 刪除願望前需要確認；刪除不影響既有兌換紀錄。
4. 空清單不阻止自由兌換票券。

### 2.4 票券兌換

1. 徽章解鎖時直接建立 `available` 票券，不要求輸入獎賞。
2. 兌換時可選擇願望，或不指定願望直接自由兌換。
3. 選擇願望時，在 transaction 中確認願望仍存在，並保存願望 ID 與當下名稱快照。
4. 自由兌換時，願望 ID 與獎賞名稱快照均為 `null`。
5. 成功後票券改為 `redeemed` 並保存伺服器兌換時間。
6. 已兌換票券永久唯讀，不可恢復、改選願望或再次使用。

## 3. Firestore 資料模型

### `users/{uid}`

| 欄位                | 型別           | 說明            |
| ------------------- | -------------- | --------------- |
| `schemaVersion`     | number         | 固定為 `1`      |
| `displayName`       | string         | Google 顯示名稱 |
| `photoURL`          | string \| null | Google 頭像     |
| `currentStampCount` | number         | `0` 至 `4`      |
| `badgeCount`        | number         | 非負整數        |
| `createdAt`         | timestamp      | 首次建立時間    |
| `updatedAt`         | timestamp      | 最後更新時間    |

### `users/{uid}/stamps/{stampId}`

| 欄位        | 型別      | 說明                    |
| ----------- | --------- | ----------------------- |
| `note`      | string    | 選填留言，最多 300 字元 |
| `createdAt` | timestamp | 蓋章時間，不可修改      |
| `updatedAt` | timestamp | 留言最後修改時間        |

### `users/{uid}/tickets/{ticketId}`

| 欄位                 | 型別                      | 說明                    |
| -------------------- | ------------------------- | ----------------------- |
| `badgeOrdinal`       | number                    | 對應徽章序號，從 1 開始 |
| `status`             | `available` \| `redeemed` | 票券狀態                |
| `wishId`             | string \| null            | 兌換時選擇的願望        |
| `rewardNameSnapshot` | string \| null            | 兌換時的願望名稱快照    |
| `createdAt`          | timestamp                 | 票券建立時間            |
| `redeemedAt`         | timestamp \| null         | 兌換時間                |

票券文件 ID 固定使用 `badge-{badgeOrdinal}`，避免 transaction 重試建立重複票券。

### `users/{uid}/wishes/{wishId}`

| 欄位        | 型別      | 說明                   |
| ----------- | --------- | ---------------------- |
| `name`      | string    | 必填名稱，最多 80 字元 |
| `createdAt` | timestamp | 建立時間               |
| `updatedAt` | timestamp | 最後修改時間           |

## 4. 權限與交易邊界

- Firestore Rules 僅允許已登入且 `request.auth.uid == uid` 的使用者讀寫自己的文件。
- Rules 限制允許欄位、必要欄位、型別、字串長度與不可變欄位。
- 新增蓋章、更新進度及第五章建立票券必須在同一 transaction 中完成。
- 兌換票券及讀取所選願望名稱必須在同一 transaction 中完成。
- 本產品是個人自我鼓勵工具；安全規則負責帳號隔離與資料格式，不提供伺服器端反作弊。

## 5. 離線、跨裝置與錯誤

- 啟用 Firestore persistent multi-tab cache，讓登入過的裝置離線查看最近同步資料。
- 離線時禁止蓋章、編輯留言、願望管理與票券兌換，並顯示離線提示。
- transaction 失敗時不得先行播放成功動畫或清空表單。
- 寫入失敗時保留使用者輸入，提供清楚錯誤與重試方式。
- 多裝置同時蓋第五章時，由 transaction 重試確保徽章序號及票券唯一。
- 兌換時若願望已被其他裝置刪除，拒絕該次兌換並要求重選或改為自由兌換。

## 6. UI 與無障礙

- 主畫面包含：帳號區、集章卡、集章日誌、我的票券、願望清單、兌換紀錄。
- 所有 modal 具備適當的 dialog role、標題、Escape 關閉、初始焦點及鍵盤操作。
- Material Symbols Rounded icon 為裝飾用途時設為 `aria-hidden`；按鈕仍需可見文字或 `aria-label`。
- 保留 `prefers-reduced-motion` 支援、手機優先響應式版面與 PWA 更新提示。
- 移除重設進度按鈕及相關確認視窗。

## 7. 環境與發布

- Firebase Console：建立 Web App、啟用 Google provider、建立 Native mode Firestore，台灣使用者採 `asia-east1`。
- Authorized domains：`localhost`、`howbon.young-app.com`，以及實際使用的 GitHub Pages 網域。
- 前端使用 Firebase modular SDK；Firebase Web config 可放在 Angular environment，禁止加入 Admin SDK 私鑰。
- 使用 Firebase CLI、JDK 21 與 Local Emulator Suite 測試 Firestore Rules。
- 網站維持 GitHub Pages 部署；Firestore Rules 與 indexes 由 Firebase CLI 發布。
- Material Symbols Rounded 字型自行託管於 PWA assets。

## 8. 驗收與測試

- 登入成功、取消 popup、登入失敗、登出與重載後恢復登入。
- 第 1 至 4 章累加；第 5 章只產生一枚徽章與一張票券。
- transaction 重試與雙裝置操作不會建立重複票券。
- 留言可留白、建立、修改與清空，不能修改章數或建立時間。
- 願望可建立、改名、刪除，且可被多張票券重複使用。
- 自由兌換顯示「自由兌換」；指定願望兌換保存名稱快照。
- 願望改名或刪除後，舊兌換紀錄仍顯示原始名稱。
- 已兌換票券不能再次使用。
- 未登入、跨帳號與非法資料均被 Firestore Rules 拒絕。
- 離線可閱讀快取，所有寫入操作停用，恢復連線後可操作。
- 通過 Angular 單元測試、Rules emulator 測試、production build 與 bundle budget。

## 9. 既有資料

舊的 `howbon.stamp-progress.v1` 不讀取、不搬移、不上傳，也不主動刪除；更新後每個 Google 帳號從新的 Firestore 個人資料開始。
