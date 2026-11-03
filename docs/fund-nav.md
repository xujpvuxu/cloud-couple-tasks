# 基金淨值排程與保存

「股票」頁從 Firestore 讀取淨值，不會由瀏覽器直接呼叫 MoneyDJ，因此不受瀏覽器 CORS 限制。配對基金仍存放於 `pairs/{pairId}/funds`；每日淨值放在 `pairs/{pairId}/funds/{fundId}/nav/{YYYYMMDD}`，欄位為 `date`、`nav` 和 `updatedAt`。

`.github/workflows/update-fund-nav.yml` 於週一至週五台灣時間 19:00 至 23:30 每半小時啟動一次。每檔基金當天已有淨值文件時，排程略過 MoneyDJ；若尚未取得當日資料，排程會再查詢，直到取得為止。股票頁的「立即更新」會建立 Firestore 請求，由同一工作流程每五分鐘檢查一次，因此通常數分鐘內處理，並非即時推送。每天最早 19:00 的排程會刪除 14 天保留期限以外的淨值文件。保留期間包含今天，共 14 個日曆日。

工作流程使用 GitHub Actions 執行環境與 Firebase Admin SDK，不使用 Cloud Functions。第一次啟用前，需在 GitHub 專案 `Settings → Secrets and variables → Actions` 建立 `FIREBASE_SERVICE_ACCOUNT` repository secret，值為具備此 Firebase 專案 Firestore 讀寫權限的服務帳戶 JSON。此密鑰亦供既有任務紀錄清理工作流程使用；不要提交至 Git 或貼在對話中。設定完成後可在 Actions 手動執行 `Update fund NAV`。

Firestore 規則只允許配對成員讀取 `nav` 文件，客戶端不可新增、修改或刪除；配對成員只能建立受限的手動檢查請求，不能修改請求結果。排程使用 Admin SDK 寫入。規則檔由 `firebase.json` 的 `firestore.rules` 設定部署。排程若遇到 MoneyDJ 暫時錯誤，該次工作會失敗，下一次排程會重試。GitHub Actions 排程可能延遲，並非精準即時服務。

手動檢查腳本需先用 `google-github-actions/auth` 或其他安全方式提供 Firebase Admin 憑證，再執行：

```sh
FIREBASE_PROJECT_ID=cloud-couple-tasks npm run update:fund-nav
```
