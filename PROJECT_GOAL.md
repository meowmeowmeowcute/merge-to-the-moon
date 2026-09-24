# 🌕 Merge to the Moon：專案目標文件

> 本文件是本專案的**唯一目標依據**，由 `mid-autumn-h5-checklist.md`（作業要求）和專案需求合併而成。
> 之後每個 session 的實作、Review 和驗收都以本文件為準；需求有變動時，先改本文件或 `SPEC.md`，再改程式。

---

## 0. 一句話介紹

**月餅合成**：類似「合成大西瓜」的中秋 H5 小遊戲。從上方丟下芝麻、蓮子、蛋黃、綠豆椪、蛋黃酥……兩個相同的碰在一起就合成更大一階，最後合成出一顆**月亮**。規則簡單，讓人想「再一局」，也方便分享給朋友。

---

## 1. 作業硬性要求（來自 checklist，全部必須達成）

| # | 要求 | 本專案做法 |
|---|------|-----------|
| 1 | 中秋主題、**完整、能分享給別人玩**的 H5 | 月餅合成遊戲，手機和桌機都能玩，有分享按鈕 |
| 2 | 自己理解怎麼跑、怎麼 build、怎麼 deploy、主要功能怎麼運作 | 沒有 build step，README 寫清楚本機執行、測試和部署流程 |
| 3 | 開發方法：SDD / TDD | **兩者都做**（見第 5、6 節） |
| 4 | AI 協作：主要由 AI 實作，人負責需求、Spec、Test、Review | 每輪流程：Agent 修改 → `git diff` → Review → Commit |
| 5 | Git 紀錄：**不能只有一個 commit**，commit message 看得出進度 | 每個大階段至少一個 commit（見第 8 節） |
| 6 | 部署到公開網址（最低要求 GitHub Pages） | **GitHub Pages**（GitHub Actions 部署 `src/`） |
| 7 | 手機上可以玩 | 觸控操作、RWD、固定邏輯解析度等比縮放 |
| 8 | `README.md`：名稱與簡介、`## Demo`、`## Development`、`## AI Tools` | 最後階段完成 |
| 9 | `RETROSPECTIVE.md`：6 題回答，並保留**至少一次 AI Failure (Incident)** | 開發中隨時記錄到 `docs/ai-incidents.md`，最後整理進 RETROSPECTIVE |
| 10 | Repository 一定要有 `README.md`、`SPEC.md`、`RETROSPECTIVE.md`、`src/` | 見第 4 節目錄結構 |

**RETROSPECTIVE 六題**：
1. 用了哪些 AI / Agent？
2. AI 做得最好的一件事？
3. AI 搞砸的一件事？
4. 你怎麼發現它錯了？
5. 最後怎麼解決？
6. 重做一次，你會怎麼改變協作方式？

**Incident 格式**：我想要什麼 / AI 做了什麼 / 我怎麼發現（例如測試的 expected 和 actual）/ 怎麼解決（重點放在**流程**怎麼修正，例如改 Spec 再重做）。

> ⚠️ AI 一出錯就馬上記到 `docs/ai-incidents.md`，不要等到最後才回想。

---

## 2. 技術選型與限制

- **前端**：原生 **HTML + CSS + JavaScript**（ES Modules），不用框架，不用打包工具。
- **物理引擎**：**Matter.js**（固定版本，例如 `0.20.x`）。
  - 瀏覽器端：把 `matter.min.js` 放進 `src/vendor/`（離線也能用，不依賴 CDN），用 `<script>` 載入成全域 `Matter`。
  - 測試端：透過 npm devDependency `matter-js` 引入。
  - 遊戲邏輯模組**以參數注入 `Matter`**，同一份程式碼在瀏覽器和 Node 都能跑。
- **繪圖**：Canvas 2D。Matter.js 只負責物理，**不使用 Matter.Render**；畫面由自訂 renderer 以像素風格繪製（`imageSmoothingEnabled = false`）。
- **測試**：Node.js 內建 test runner（`node --test`），不需要額外測試框架。`package.json` 只放 devDependencies 和 scripts。
- **部署**：GitHub Pages，用 GitHub Actions workflow：push 到 `main` → 跑測試 → 通過後把 `src/` 部署到 Pages。
- **後端**：不做（見 Non-goals）。

---

## 3. 遊戲設計（SDD 內容草案，實作前要整理成 `SPEC.md`）

### 3.1 合成階級（至少 7 次合成才到月亮）

從第 1 階合成到月亮一共要經過 **8 次合成**，符合「至少七個階段」的要求。

| 階 | 名稱 | 相對半徑（邏輯寬 400 為基準） | 分數（合成出此階時獲得） | 像素主色 |
|----|------|------|------|------|
| 1 | 芝麻 | 12 | — | 米白／黑 |
| 2 | 蓮子 | 17 | 2 | 淺黃 |
| 3 | 蛋黃 | 24 | 4 | 橘黃 |
| 4 | 綠豆椪 | 32 | 8 | 白皮、綠內餡 |
| 5 | 蛋黃酥 | 40 | 16 | 金黃、芝麻點 |
| 6 | 冰皮月餅 | 50 | 32 | 粉紅／淺綠 |
| 7 | 廣式月餅 | 62 | 64 | 深褐、花紋 |
| 8 | 柚子 | 76 | 128 | 黃綠 |
| 9 | 🌕 月亮 | 92 | 500 | 淡黃、坑洞、光暈 |

- 半徑必須**嚴格遞增**，而且最大階必須是月亮。確切數值可在 Spec 裡調整，但調整後測試要跟著改。
- 階級資料集中寫在 `src/game/config.js`，一個地方定義，其他地方都讀這份。

### 3.2 核心規則

1. **生成**：每次隨機產生 **第 1～5 階**（機率隨難度等級改變，Lv.1 為 35% / 25% / 20% / 12% / 8%）。**不顯示「下一個」預覽**，保留隨機感。隨機數使用**可注入 seed 的 RNG**，方便測試。
   > 變更紀錄：原本是「第 1 或第 2 階加上下一個預覽」，試玩後改成 1～4 階、不預告；之後覺得太簡單，再改成 1～5 階、警戒線下移、物件放大 15%，並加入難度隨分數上升（2026-09-24）。
2. **投放**：玩家左右移動（滑鼠移動、觸控拖曳、鍵盤 ←→），放開或點擊後從頂部掉下。有**投放冷卻**（250ms）；**長按不動 0.4 秒可連續投放**（2026-09-24 由 500ms 縮短並加入長按）。投放位置限制在牆內（考慮物件半徑）。
3. **合成**：兩個**同階**物件接觸時：
   - 兩者移除，在**接觸中點**生成一個高一階的物件，繼承兩者的平均速度（慣性），再**往上彈一下**，並把周圍的物件**推開**（速度都有上限）。
   - 一個物件在同一個 step 內**只能參與一次合成**（用 `merging` 標記加合成佇列，在 `Engine.update` 之後統一處理）。
   - 同時監聽 `collisionStart` 和 `collisionActive`，避免兩個同階物件靜止相貼卻沒合成。
   - 新物件可以再跟相鄰的同階物件**連鎖合成**。
   - **兩顆月亮不再合成**。第一次合成出月亮時觸發「月圓」慶祝事件，遊戲可以繼續。
4. **計分**：合成出第 n 階時加上該階分數；最高分存在 `localStorage`，讀寫都要 try/catch。
5. **結束**：容器頂部有一條「警戒線」。任一**非剛投放**的物件（投放後 1.5 秒內豁免），只要整體位置超過警戒線且持續 **2 秒**，就判定 Game Over。
6. **難度等級**：分數越高等級越高（Lv.1～Lv.4），生成的物件越大、超線容許時間越短（詳見 SPEC 3.3）。
7. **再一局**：Game Over 畫面顯示分數、最高分、最高合成階，並提供「再一局」和「分享」按鈕。重開不需要重新載入頁面。

### 3.3 像素美術

- 每種元素用**程式定義的像素圖**（palette 加字串陣列，例如 16×16 或 24×24），在 offscreen canvas 預先繪製後快取，畫到畫面時依半徑縮放（nearest-neighbor）。
- 物理碰撞體一律用**圓形**，像素圖大致是圓形，視覺上和碰撞範圍的誤差 ≤ 1 個像素格。
- 背景：像素風夜空、星星、雲，容器像木盒或竹籠。UI 字型可用像素字型（Google Fonts「Press Start 2P」／「Cubic 11」之類，或自繪）。

### 3.4 合成特效（必須）

- **粒子爆散**：合成點噴出方形像素粒子，顏色取自該階 palette。
- **Pop 縮放**：新物件從 0.6 倍彈到 1.1 倍再回到 1.0 倍（只影響視覺，不影響物理半徑）。
- **閃光圈**：白色像素環擴散後淡出。
- **分數飄字**：`+N` 往上飄並淡出。
- **月亮特效**：全螢幕金光、星星雨、短暫慢動作或輕微震動，並顯示「花好月圓！」。
- 特效系統和物理完全分離，不影響模擬的確定性。

### 3.5 分享

- 用 Web Share API（`navigator.share`）分享文字「我在月餅合成拿到 N 分、合成到〇〇！」加網址；不支援時改成複製到剪貼簿並提示。
- 頁面加上 Open Graph meta（title、description、og:image 使用像素月亮截圖），讓分享連結有預覽。

### 3.6 其他體驗

- 固定邏輯解析度（例如 400×700），依視窗等比縮放，保持在安全區域內；手機直式優先。
- 物理使用固定時間步長（1000/60 ms 加 accumulator），不同更新率的螢幕行為一致。
- 分頁切到背景時暫停。
- 音效（可選）：WebAudio 合成的簡單音效，要有靜音按鈕。

---

## 4. 目錄結構（目標）

```text
Merge to the Moon/
├── PROJECT_GOAL.md          # 本文件（目標依據）
├── mid-autumn-h5-checklist.md
├── CLAUDE.md                # 給 AI Agent 的工作守則
├── SPEC.md                  # SDD 規格（由第 3 節整理而成）
├── README.md
├── RETROSPECTIVE.md
├── package.json             # 只放 devDependencies（matter-js）和 test script
├── docs/
│   └── ai-incidents.md      # AI 出錯即時紀錄
├── src/                     # GitHub Pages 部署根目錄
│   ├── index.html
│   ├── style.css
│   ├── main.js              # 啟動、輸入、遊戲迴圈
│   ├── audio.js             # WebAudio 音效與靜音
│   ├── og.png / favicon.png # 由 scripts/make-images.mjs 產生
│   ├── vendor/matter.min.js
│   ├── game/
│   │   ├── config.js        # 階級表、常數
│   │   ├── rng.js           # 可設 seed 的 RNG
│   │   ├── spawner.js       # 產生第 1～4 階
│   │   ├── world.js         # Matter engine、容器、投放
│   │   ├── merge.js         # 合成偵測與處理
│   │   ├── rules.js         # 計分、Game Over 判定
│   │   ├── storage.js       # localStorage（最高分）
│   │   ├── share.js         # 分享文字
│   │   └── game.js          # 組合以上模組，UI 唯一入口（狀態機、step、drop）
│   └── render/
│       ├── sprites.js       # 像素圖定義與快取
│       ├── renderer.js      # Canvas 繪製
│       └── effects.js       # 粒子、pop、飄字、月亮特效
├── tests/
│   ├── helpers.js           # 建立 headless world、步進 N 次
│   ├── config.test.js
│   ├── spawner.test.js
│   ├── physics.test.js
│   ├── merge.test.js
│   ├── sprites.test.js
│   ├── share.test.js
│   └── rules.test.js
├── scripts/
│   ├── serve.mjs            # 本機靜態伺服器
│   └── make-images.mjs      # 產生 og.png / favicon.png
└── .github/workflows/deploy.yml
```

原則：`src/game/*` **不能碰 DOM 或 Canvas**，這樣才能在 Node 測試；DOM 和繪圖只放在 `main.js` 和 `render/*`。

---

## 5. SDD：`SPEC.md` 必備內容

流程：**Idea → Spec → AI 實作 → Review → 修改 Spec → 再實作**

`SPEC.md` 至少包含：
1. **要做什麼**（第 0 節）
2. **主要功能**（生成、投放、合成、特效、計分、Game Over、再一局、分享）
3. **系統行為**（第 3.2 節的規則，要寫到可以直接對應測試的程度）
4. **Acceptance Criteria**（見下）
5. **Non-goals**（見下）

### Acceptance Criteria（驗收條件）

- [ ] AC1：階級表至少 9 階（≥ 8 次合成），半徑嚴格遞增，最後一階是月亮。
- [ ] AC2：每次生成的物件只會是第 1～4 階，不顯示下一個預覽。
- [ ] AC3：物件受重力落下，停在容器底部或其他物件上，不會穿透地板或牆壁。
- [ ] AC4：兩個同階物件接觸後在 1 個 step 內合成一個高一階的物件，位置在兩者中點。
- [ ] AC5：不同階物件接觸不會合成。
- [ ] AC6：同一物件同時接觸兩個同階物件時只合成一次，物件總數正確。
- [ ] AC7：合成出的新物件擠開鄰居時，沒有物件速度超過上限、沒有物件飛出容器，穩定後物件之間沒有明顯重疊。
- [ ] AC8：連鎖合成可以正常發生；兩顆月亮不合成。
- [ ] AC9：每次合成都有粒子、pop、飄字特效；合成出月亮時有專屬慶祝特效。
- [ ] AC10：分數正確累加，最高分重新整理後還在。
- [ ] AC11：物件超過警戒線 2 秒判定 Game Over，剛投放的物件豁免；可以不重新整理就再一局。
- [ ] AC12：手機直式可以完整遊玩（觸控投放、畫面不溢出、不誤觸捲動或縮放）。
- [ ] AC13：分享按鈕在支援的裝置叫出系統分享，不支援時改成複製到剪貼簿。
- [ ] AC14：GitHub Pages 公開網址可以直接打開遊玩。
- [ ] AC15：`npm test` 全部通過，CI 通過才部署。

### Non-goals（不做）

- 不做後端、排行榜、帳號、資料庫（作業標明「真的需要才加」，本專案不需要）。
- 不使用前端框架、打包工具、TypeScript。
- 不做多人連線、關卡、道具、商店、廣告。
- 不追求像素完美的碰撞，碰撞體統一是圓形。
- 不支援 IE 或過舊的瀏覽器（以近兩年的 Chrome、Safari、Firefox、Edge 為準）。

---

## 6. TDD：測試計畫

流程：**Test → Fail → AI 實作 → Pass → Refactor**
測試針對真實行為（物理、遊戲規則、狀態轉換、localStorage），不為了湊數量寫測試。物理測試使用 **headless Matter.Engine**，固定步長、固定 seed，結果必須可重現。

### 6.1 基礎物理碰撞（`physics.test.js`）

| 測試 | 驗證 |
|------|------|
| 重力落下 | 放一個物件並步進 N 次後，y 增加、vy > 0 |
| 地板支撐 | 從頂部落下並步進至靜止，底部 ≈ 地板（誤差 ≤ 1px），沒有穿透 |
| 防穿隧 | 最大階物件以最大速度落下也不會穿過地板 |
| 牆壁限制 | 給物件大水平速度，所有時間點的 x 都在 `[r, W - r]`（含容差） |
| 堆疊不重疊 | 不同階物件疊放並靜止後，圓心距離 ≥ r1 + r2 − 容差 |
| 穩定靜止 | 物件靜止後速度 < ε，不會一直抖動 |

### 6.2 合成過程的碰撞合理性（`merge.test.js`）

| 測試 | 驗證 |
|------|------|
| 同階合成 | 兩個第 k 階接觸 → 剩一個第 k+1 階，原本兩個 id 都移除 |
| 合成位置 | 新物件位在兩者接觸中點（容差內） |
| 不同階不合成 | 第 k 階和第 k+1 階接觸 → 數量不變 |
| 只合成一次 | 三個同階物件同時接觸 → 一個第 k+1 階加一個第 k 階（總數 2） |
| 重複事件 | 同一對物件在同一 step 觸發多次碰撞事件 → 只合成一次 |
| 靜止相貼也合成 | 兩個同階物件從靜止並排開始 → 仍然合成（collisionActive） |
| 擠開鄰居合理 | 在密集堆疊中合成出大物件 → 所有鄰居速度 ≤ 上限、沒有物件飛出容器、穩定後沒有明顯重疊 |
| 速度繼承與上限 | 新物件速度 = 兩者平均，並被限制在上限內 |
| 連鎖合成 | 新物件接觸同階物件 → 繼續合成 |
| 月亮上限 | 兩顆月亮接觸 → 不合成；首次合成出月亮時觸發 `moon` 事件 |

### 6.3 規則與設定（`config.test.js`、`spawner.test.js`、`rules.test.js`）

- 階級表長度 ≥ 9、半徑嚴格遞增、最後一階是月亮。
- 生成器取 1000 次，結果只有 1～4，而且四種都會出現；相同 seed 產生相同序列。
- 計分：合成出第 n 階時加上對應分數；最高分更新邏輯（mock storage，storage 丟錯時不崩潰）。
- Game Over：超過警戒線 < 2s 不結束、≥ 2s 結束、剛投放的物件在豁免期內不計；重開後狀態全部歸零。
- 投放：冷卻期間投放無效；投放 x 會被限制在牆內。

---

## 7. AI 協作守則

- Implementation 盡量交給 AI Agent；人負責需求、Spec、Test、Prompt、Review diff、Debug、驗證、架構決策。
- 每一輪：**Agent 修改 → `git diff` → Review → 跑 `npm test` → Commit**。
- 手動修改時要記下**為什麼要自己改**，以及 **AI 為什麼沒處理好**。
- 測試失敗或 AI 理解錯需求時，馬上把 expected 和 actual 記到 `docs/ai-incidents.md`，這是 RETROSPECTIVE 的素材。
- 需求有衝突時，以本文件和 `SPEC.md` 為準；要改需求，先改文件再改程式。

---

## 8. 開發階段與 Commit 計畫

**不能只在最後 commit。** 每個大階段結束時至少 commit 一次（階段內可以有多個小 commit）。commit message 用英文祈使句，前綴使用 `docs:`、`test:`、`feat:`、`fix:`、`refactor:`、`ci:`、`chore:`。

| 階段 | 內容 | 預期 commit 範例 |
|------|------|------|
| P0 | 建立目標文件、CLAUDE.md、git init | `docs: add project goal document` |
| P1 | 由本文件整理出 `SPEC.md`；建立 `package.json`、`.gitignore`、`docs/ai-incidents.md` | `docs: add initial spec` / `chore: set up node test runner` |
| P2 | **先寫測試**（config、spawner、physics、merge、rules），確認全部 Fail | `test: add failing tests for physics and merge rules` |
| P3 | 核心邏輯：config、rng、spawner、world（容器、投放）→ 物理測試通過 | `feat: implement physics world and drop` |
| P4 | 合成邏輯 merge.js → 合成測試通過 | `feat: implement same-tier merge with chain merging` |
| P5 | 規則：計分、Game Over、最高分 → 全部測試通過 | `feat: add scoring and game over rules` |
| P6 | 像素 sprites 和 renderer，接上 main.js，瀏覽器可以玩 | `feat: add pixel-art sprites and canvas renderer` |
| P7 | 合成特效和月亮慶祝特效 | `feat: add merge particles and moon celebration` |
| P8 | UI：開始、Game Over、再一局、暫停、靜音、分享、RWD、觸控 | `feat: add game UI, share and mobile controls` |
| P9 | 部署：GitHub Actions（test → deploy `src/`），確認公開網址 | `ci: deploy to github pages` |
| P10 | README.md、RETROSPECTIVE.md、最終檢查 | `docs: add readme and retrospective` |

中途修 bug 用 `fix: ...` 另外 commit；修改 Spec 用 `docs: update spec ...` 另外 commit。

---

## 9. 最終檢查清單（交件前）

- [x] 公開網址可以打開（https://meowmeowmeowcute.github.io/merge-to-the-moon/）
- [ ] 手機實機可以玩（待實機確認）
- [x] `npm test` 全部通過，CI 綠燈
- [x] commit 歷史看得出進度（P0～P10），不是只有一個 commit
- [x] `README.md`（簡介、`## Demo`、`## Development`、`## AI Tools`）
- [x] `SPEC.md`（要做什麼、主要功能、系統行為、Acceptance Criteria、Non-goals）
- [x] `RETROSPECTIVE.md`（6 題加至少 1 個 Incident）
- [x] `src/` 存在，而且是部署根目錄
- [ ] 自己能說明：怎麼跑、怎麼 build（無需 build）、怎麼 deploy、合成和物理怎麼運作
