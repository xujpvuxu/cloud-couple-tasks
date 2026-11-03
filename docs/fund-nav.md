# 基金淨值查詢

股票頁使用 Firebase HTTP Function `fundNav` 代查 MoneyDJ，避免瀏覽器跨網域讀取時遭 CORS 阻擋。基金卡片依本金由高到低排序。前端傳入基金文件 ID 和日期範圍；Function 驗證 Firebase 登入身分、配對關係及基金文件，再以 Firestore 內的基金代碼查詢 MoneyDJ。淨值結果不會寫回 Firestore。

Function 僅接受 GitHub Pages 網域與本機 Vite 開發網域的跨來源請求。日期範圍最多 31 天，回應快取五分鐘。呼叫時須附 Firebase Authentication ID token。

部署至 `cloud-couple-tasks`：

```powershell
npx firebase-tools deploy --only functions:fundNav --project cloud-couple-tasks
```

Function 區域為 `asia-east1`，線上端點為 `https://asia-east1-cloud-couple-tasks.cloudfunctions.net/fundNav`。

部署 Cloud Functions 需要 Firebase Blaze 方案並連結 Cloud Billing 帳戶；Function 有每月免費用量額度，超額用量和部署映像儲存可能計費。部署前應在 Google Cloud 設定預算通知。
