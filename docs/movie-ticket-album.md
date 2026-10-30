# 電影票根相簿

左側導覽列「兌換」下方的「票根」頁面是配對共用相簿。每筆 Firestore 文件位於 `pairs/{pairId}/tickets/{ticketId}`，包含配對 ID、上傳者 UID、日期、選填片名和備註、照片 Storage 路徑及建立／更新時間。照片儲存在 `pairs/{pairId}/tickets/{ticketId}/{uuid}.jpg`。

每場電影可上傳 1–4 張圖片。瀏覽器會將 JPG、PNG、WebP 和 HEIC/HEIF 轉為 JPEG，長邊縮至最多 2200 像素並壓縮至 5 MB 以內。相簿依電影日期由新到舊排列。只有上傳者可修改文字資料或刪除整筆紀錄；刪除時會一併移除照片。票根沒有期限清理。

## Firebase 設定

1. 在 Firebase Console 的 Storage 頁面建立或選擇這個 Firebase 專案的 bucket，並將其名稱設為 `src/firebase.js` 的 `storageBucket`。新建的預設 bucket 通常是 `cloud-couple-tasks.firebasestorage.app`；較早建立的 bucket 可能是 `cloud-couple-tasks.appspot.com`。
2. 將 `storage.rules` 發布到 Firebase Storage，並將更新後的 `firestore.rules` 發布到 Firestore。
3. Firebase Storage 新建 bucket 需要 Blaze 計費方案。建立前請在 Firebase Console 確認專案方案與 bucket 可用狀態。

Firestore 文件只保存 Storage 路徑；畫面使用 Firebase Storage SDK 在登入狀態下讀取照片，不保存帶下載權杖的公開 URL。Storage 規則限制配對成員讀取，且限制建立者 UID、JPEG 類型、5 MB 大小和上傳者刪除權限。
