# 🌕 中秋 H5 作業 Checklist

## 一、作品本身
- [ ] 中秋主題的 H5 網頁（題材、技術不限）
- [ ] 是**完整、可以分享給別人玩**的成品
- [ ] 自己搞懂四件事：專案怎麼跑、怎麼 build、怎麼 deploy、主要功能怎麼運作

## 二、開發方法（SDD 或 TDD 擇一，也可以都做）

**選 SDD：**
- [ ] 建立 `SPEC.md`，內容至少包含：
  - [ ] 要做什麼
  - [ ] 主要功能
  - [ ] 系統行為
  - [ ] Acceptance Criteria（驗收條件）
  - [ ] Non-goals（不做什麼）
- [ ] 流程：Idea → Spec → AI 實作 → Review → 修改 Spec → 再實作

**選 TDD：**
- [ ] 先寫測試，再讓 AI 實作
- [ ] 流程：Test → Fail → AI 實作 → Pass → Refactor
- [ ] 測試要測真正的程式行為（計分、遊戲規則、狀態轉換、localStorage、API、validation），不要湊數

> 注意：Repository 結構要求一定要有 `SPEC.md`，所以就算走 TDD，也建議寫一份 SPEC。

## 三、AI 協作方式
- [ ] Implementation 盡量交給 AI / Coding Agent
- [ ] 自己負責：寫需求、寫 Spec / Test、Prompt、Review diff、Debug、驗證功能、決定架構、判斷 AI 做得對不對
- [ ] 可以手動改一兩行，但要知道**為什麼要自己改**，以及 **AI 為什麼沒處理好**（可順手記下來當 Retrospective 素材）

## 四、Git 紀錄
- [ ] 保留正常開發過程，**不能只有一個 commit**
- [ ] commit message 要看得出進度，例如：`add initial spec` → `implement ...` → `fix ... bug` → `deploy to github pages`
- [ ] 每一輪都走：Agent 修改 → `git diff` → Review → Commit

## 五、部署
- [ ] 部署到公開網址（最低要求 GitHub Pages；Cloudflare / Vercel / Netlify 等也可以）
- [ ] 確認網址可以直接打開、手機上也能玩

## 六、README.md
- [ ] 專案名稱 + 一句話介紹
- [ ] `## Demo`：可直接點開的網址
- [ ] `## Development`：如何安裝與執行
- [ ] `## AI Tools`：用了哪些 AI / Agent

## 七、RETROSPECTIVE.md
回答以下六題（不用長）：
- [ ] 1. 用了哪些 AI / Agent？
- [ ] 2. AI 做得最好的一件事？
- [ ] 3. AI 搞砸的一件事？
- [ ] 4. 你怎麼發現它錯了？
- [ ] 5. 最後怎麼解決？
- [ ] 6. 重做一次，你會怎麼改變協作方式？

**必須保留一次 AI Failure（Incident），格式包含：**
- [ ] 我想要什麼
- [ ] AI 做了什麼
- [ ] 我怎麼發現（例如測試失敗的 expected / actual）
- [ ] 怎麼解決（重點是你怎麼修正**流程**，例如改 Spec 再重做）

> 小提醒：開發時 AI 一出錯就先記下來，不要等最後才回想。

## 八、Repository 最終結構
```text
project/
├── README.md
├── SPEC.md
├── RETROSPECTIVE.md
├── src/
└── ...
```

## 九、Optional（非必做）
- [ ] 後端功能：排行榜、留言板、DB、API、KV、Serverless（Cloudflare Workers / D1 / KV / Supabase / Firebase）
- ⚠️ 作品真的需要才加，不要為了看起來厲害硬加

---

## ✅ 建議執行順序
1. 決定題材 → 寫 `SPEC.md`（有測試就一起寫）→ **commit**
2. 讓 AI 實作第一個核心功能 → review diff → **commit**
3. 逐步加功能，每一輪都 review 後 commit，**遇到 AI 出錯就記錄**
4. 部署 → 確認公開網址可用 → **commit**
5. 寫 `README.md` 和 `RETROSPECTIVE.md` → **commit**
6. 最後檢查：網址能開、commit 歷史正常、三個 md 檔都在
