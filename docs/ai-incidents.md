# AI Incidents 紀錄

> AI 一出錯（測試失敗、誤解需求、改壞東西）就馬上在這裡記一筆，最後挑至少一則整理進 `RETROSPECTIVE.md`。

## 範本

### #N 標題（日期／階段 Px）

- **我想要什麼**：
- **AI 做了什麼**：
- **我怎麼發現**：（例如測試名稱，以及 expected 和 actual）
- **怎麼解決**：（重點是流程怎麼修正，例如改 Spec 再重做、補測試）
- **手動修改了什麼／為什麼 AI 沒處理好**：（如果有的話）

---

<!-- 在下面新增紀錄 -->

### #1 `npm test` 在 Node 24 找不到測試（2026-09-24／P1 → P2）

- **我想要什麼**：`npm test` 跑 `tests/` 底下所有測試。
- **AI 做了什麼**：P1 把 script 寫成 `node --test tests/`，沒有實際執行（當時還沒裝 Node）。
- **我怎麼發現**：P2 第一次跑 `npm test`，出現 `Error: Cannot find module '...\Merge to the Moon\tests'`。Node 21 以後 `--test` 的參數是 glob，不接受目錄。
- **怎麼解決**：改成 `node --test "tests/**/*.test.js"`。流程上的修正：設定檔寫完要在**當下**實際跑一次；環境還沒準備好時，要在交付說明標注「未驗證」。

### #2 PowerShell 改寫 package.json 造成中文亂碼（2026-09-24／P2）

- **我想要什麼**：只替換 package.json 裡的 test script。
- **AI 做了什麼**：用 PowerShell 5.1 的 `Get-Content | Set-Content` 取代字串。`Get-Content` 預設用 ANSI（Big5）讀 UTF-8 檔，`description` 的中文就被破壞了。
- **我怎麼發現**：編輯器回報檔案變更，diff 裡 `description` 變成亂碼。
- **怎麼解決**：用檔案寫入工具重寫整個 UTF-8 檔。流程上的修正：含中文的檔案不要用 PowerShell 5.1 的 Get-Content / Set-Content 改寫，改用 Edit 工具或 Git Bash。

### #3 測試在空資料上假通過（2026-09-24／P2）

- **我想要什麼**：確認每個測試在 stub 狀態下都是紅燈。
- **AI 做了什麼**：`tier 欄位等於索引 + 1` 和 `半徑嚴格遞增` 都用迴圈檢查，`TIERS = []` 時迴圈一次都沒跑，結果顯示 ✔。
- **我怎麼發現**：跑 stub 版測試時，結果是 `pass 2 / fail 59`，本來預期全紅。
- **怎麼解決**：在迴圈前加上 `TIERS.length > 0` 的斷言，改完後 61 個全紅。流程上的修正：TDD 的 Red 階段一定要看 pass 數，**不應該通過卻通過的測試**就是寫錯的測試。
