# 好棒棒集章：分頁、票券商店與雲端資料規格

## 1. 產品目標

「好棒棒集章」是使用 Google 帳號登入、可跨裝置同步的個人成長日誌。使用者每次蓋章可留下選填留言；每五枚章會獲得一枚徽章與一張票券。票券是商店貨幣，可購買使用者自行建立的商品，購買結果會進入獎賞道具庫。

本版本不包含：舊 `localStorage` 搬移、公開個人頁、社群排名、管理員、共同給章、刪除蓋章、恢復已消耗票券、商品自訂價格、道具使用或消耗。

## 2. 導覽與頁面

登入後顯示固定底部導覽，所有 viewport 均使用同一模式：

- `/home`：品牌 hero、集章卡、蓋章留言、目前章數與徽章數。
- `/journal`：以月份為單位瀏覽與編輯蓋章留言。
- `/rewards`：已購買的道具庫存。
- `/store`：商品新增、改名、刪除與購買。

空路徑與未知路徑導向 `/home`；頁面以 Angular Router lazy loading 載入。未登入時保留目前 URL，但只顯示登入畫面。
登入後的 site header 以只有票券 icon 與數字的 pill 顯示全站可用票券數量。

## 3. 核心流程

### 3.1 登入與登出

1. 啟動時等待 Firebase Authentication 恢復登入狀態。
2. 未登入時只顯示產品說明、資料使用提示與 Google 登入按鈕。
3. 使用者主動點擊後，以 Google popup 完成登入。
4. popup 取消或失敗時留在登入畫面並顯示可重試錯誤。
5. 登入後顯示帳號、App shell、當前 route 與底部導覽。
6. 登出不刪除任何雲端資料。

### 3.2 蓋章與留言

1. 點擊蓋章後開啟選填留言 dialog；取消不產生紀錄。
2. 第 1 至 4 枚章新增紀錄並累加目前章數。
3. 第 5 枚章在同一 transaction 中新增紀錄、目前章數歸零、徽章數加一並建立可用票券。
4. transaction 成功後才播放成功動畫；失敗時保留輸入並允許重試。
5. 留言可修改或清空，蓋章紀錄及建立時間不可刪除或修改。

### 3.3 月份日誌

1. 預設顯示裝置本地時區的當月。
2. 左右按鈕切換月份；當月時停用下一個月，不顯示未來資料。
3. 查詢範圍為 `createdAt >= 月初` 且 `createdAt < 下月月初`。
4. 切月時解除舊 listener 再訂閱新月份；沒有紀錄時顯示空狀態。
5. 編輯按鈕只顯示 icon，置於日期列右上角並提供完整 accessible name。

### 3.4 商店與購買

1. 商品名稱必填，可新增、改名、刪除及重複購買。
2. 商品資料保留 `price`，目前固定為 `1` 且不出現在 UI。
3. 購買前確認至少持有一張 available ticket，再顯示確認 dialog。
4. transaction 重新讀取商品與指定票券，確認商品存在、價格為 1、票券仍可用。
5. 成功時將票券改為 redeemed，並建立 purchase，保存商品 ID、名稱快照、價格、ticket ID 與購買時間。
6. 商品被其他裝置刪除、票券已被使用、離線或 transaction 失敗時不得建立 purchase。
7. 商店是唯一消耗票券的入口，不提供自由兌換。

### 3.5 獎賞道具

1. 獎賞頁只讀取新 `purchases`，不讀取舊願望兌換紀錄。
2. 依 `storeItemId` 合併購買紀錄，顯示最近一次購買的名稱快照與數量。
3. 商品改名後再次購買仍合併至同一商品；商品刪除不影響庫存。
4. 道具目前只展示，不提供使用、消耗或刪除。

## 4. Firestore 資料模型

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

沿用既有 ticket schema，讓舊 available tickets 可以繼續使用：

| 欄位                 | 型別                      | 說明                              |
| -------------------- | ------------------------- | --------------------------------- |
| `badgeOrdinal`       | number                    | 對應徽章序號                      |
| `status`             | `available` \| `redeemed` | 票券狀態                          |
| `wishId`             | string \| null            | 舊版相容欄位；商店購買固定為 null |
| `rewardNameSnapshot` | string \| null            | 舊版相容欄位；商店購買固定為 null |
| `createdAt`          | timestamp                 | 建立時間                          |
| `redeemedAt`         | timestamp \| null         | 消耗時間                          |

### `users/{uid}/storeItems/{storeItemId}`

| 欄位        | 型別      | 說明               |
| ----------- | --------- | ------------------ |
| `name`      | string    | 必填，最多 80 字元 |
| `price`     | number    | 本版本固定為整數 1 |
| `createdAt` | timestamp | 建立時間           |
| `updatedAt` | timestamp | 最後修改時間       |

### `users/{uid}/purchases/{purchaseId}`

| 欄位           | 型別      | 說明                               |
| -------------- | --------- | ---------------------------------- |
| `storeItemId`  | string    | 購買時的商品 ID                    |
| `nameSnapshot` | string    | 購買時名稱快照                     |
| `price`        | number    | 本版本固定為 1                     |
| `ticketIds`    | string[]  | 本版本長度固定為 1，預留多票券價格 |
| `purchasedAt`  | timestamp | 購買時間                           |

`purchaseId` 固定使用本次消耗的 ticket ID；本版本每筆購買只消耗一張票券，因此可同時避免 transaction 重試產生重複 purchase。

既有 `wishes` collection 與舊 redeemed tickets 不搬移、不刪除，新 UI 完全忽略；舊 available tickets 繼續作為餘額。

## 5. 權限與交易邊界

- Firestore Rules 只允許已登入且 `request.auth.uid == uid` 的使用者存取自己的路徑。
- Store item 建立時 `price == 1`，更新時價格及建立時間不可修改。
- Purchase 只能建立，不能更新或刪除；必須與 available → redeemed ticket 更新發生於同一 transaction。
- Purchase 文件 ID 必須等於唯一的 `ticketIds[0]`，同一張票券不能建立第二筆購買。
- Purchase 的商品名稱、價格必須等於 transaction 中讀取的 store item；ticketIds 目前只能包含一張票券。
- 新增蓋章、更新進度及第五章建立票券仍必須在同一 transaction 中完成。

## 6. Loading、離線與錯誤

- 全域 `LoadingService` 以 reference count 管理並行動作，支援 `begin/end` 與 `run`。
- 登入、登出、路由切換、蓋章、留言修改、商品 CRUD 與購買均顯示滿版 Loading mask。
- Loading 時主要內容設為 inert 與 aria-busy，阻擋滑鼠、觸控及鍵盤操作；所有動作以 finally 保證解除。
- Firestore snapshot 初次載入使用頁面／區塊 loading，不使用滿版 mask。
- 啟用 persistent multi-tab cache；離線可查看快取，但所有寫入操作停用。
- 錯誤時保留表單輸入，顯示可理解訊息並允許重試。

## 7. UI、架構與無障礙

- 專案採 core/shared/features 架構；stamps feature 擁有首頁與日誌，rewards feature 擁有獎賞與商店。
- 所有 Component 使用同名 `.ts`、`.html`、`.scss`，不使用 inline template/style 或 CSS。
- 共用 dialog、page header、empty state、loading mask、bottom nav；按鈕、表單、卡片與 icon button 樣式集中於全域 SCSS。
- 獎賞與商店頁比照日誌使用單一外層 card，不顯示頁面描述、票券餘額卡或列表內層容器；項目數直接顯示於 page header，列表與標題位於同一個 card 層級。
- Bottom nav 固定底部並支援 `safe-area-inset-bottom`；內容保留足夠底部空間。
- Material Symbols 為裝飾時設 `aria-hidden`；icon-only 按鈕具備 `aria-label`。
- 保留 focus-visible、reduced-motion、手機優先響應式與 PWA 安裝／更新提示。

## 8. 驗收與測試

- 四條 lazy routes、深連結、上一頁／下一頁、未知路徑與登入門檻正確。
- Loading 單一與並行動作、成功與失敗都能正確顯示及解除。
- 日誌預設當月、跨月、跨年、未來月份停用、本地時區邊界與 listener cleanup 正確。
- 商品 CRUD 固定保存 price 1，UI 不顯示價格。
- 餘額不足、離線、商品被刪除、票券競爭時購買失敗且不產生 purchase。
- 成功購買只消耗一張票券並建立一筆 purchase。
- Inventory 依 storeItemId 合併，保留商品刪除／改名後的快照與數量。
- Rules 拒絕未登入、跨帳號、非法價格、任意 purchase、重複票券與修改購買紀錄。
- 通過 Prettier、Angular tests、Rules Emulator、production build、production audit 與桌面／390px 視覺檢查。
