# SPEC：Merge to the Moon（月餅合成）

> 版本：v1.3（P7：生成 1～4 階、移除下一個預覽、合成彈跳、特效／分享／暫停／音效細節）｜來源：[PROJECT_GOAL.md](PROJECT_GOAL.md)
> 流程：Idea → **Spec** → AI 實作 → Review → 修改 Spec → 再實作。
> 本文件描述的行為要能直接對應到測試（見第 7 節對照表）。行為有改動時，先改這份文件並另外 commit（`docs: update spec ...`）。

---

## 1. 要做什麼

一款中秋主題的 H5 物理合成小遊戲，玩法類似「合成大西瓜」。玩家從容器上方丟下月餅系列物件，**兩個相同的物件碰在一起就合成更大一階**，經過 8 次合成最後得到一顆**月亮**。畫面採像素風格，手機和桌機的瀏覽器打開就能玩，一局幾分鐘，結束後可以一鍵「再一局」或分享分數。

- 技術：原生 HTML / CSS / JavaScript（ES Modules）＋ Matter.js 物理引擎，不用框架、不用打包工具。
- 部署：GitHub Pages（`src/` 是部署根目錄）。

---

## 2. 主要功能

| 代號 | 功能 | 說明 |
|------|------|------|
| F1 | 生成 | 每次隨機產生第 1～4 階物件（不預告下一個，增加隨機感） |
| F2 | 投放 | 左右移動後放開，物件從頂部落下；有冷卻時間 |
| F3 | 物理 | 重力、碰撞、堆疊，由 Matter.js 模擬 |
| F4 | 合成 | 同階物件接觸 → 合成高一階，新物件帶著慣性往上彈一下並推開周圍；可以連鎖合成；月亮是最高階 |
| F5 | 特效 | 合成時有粒子、Pop、閃光圈、分數飄字；合成出月亮時有專屬慶祝 |
| F6 | 計分 | 合成時加分；最高分保存在瀏覽器 |
| F7 | 結束 | 物件停在警戒線以上太久就 Game Over |
| F8 | 再一局 | 不必重新整理頁面就能重開 |
| F9 | 分享 | Web Share API，不支援時改成複製到剪貼簿；有 Open Graph 預覽 |
| F10 | 行動裝置 | 觸控操作、RWD、直式優先 |

---

## 3. 遊戲資料

### 3.1 階級表（`src/game/config.js` → `TIERS`）

`TIERS` 是陣列，索引 0 對應第 1 階。每個元素的格式：
`{ tier: number, id: string, name: string, radius: number, score: number, palette: string[] }`

| tier | id | name | radius | score |
|------|----|------|--------|-------|
| 1 | `sesame` | 芝麻 | 12 | 0 |
| 2 | `lotus` | 蓮子 | 17 | 2 |
| 3 | `yolk` | 蛋黃 | 24 | 4 |
| 4 | `mungbean` | 綠豆椪 | 32 | 8 |
| 5 | `yolkpastry` | 蛋黃酥 | 40 | 16 |
| 6 | `snowskin` | 冰皮月餅 | 50 | 32 |
| 7 | `cantonese` | 廣式月餅 | 62 | 64 |
| 8 | `pomelo` | 柚子 | 76 | 128 |
| 9 | `moon` | 月亮 | 92 | 500 |

- `MAX_TIER = 9`，最後一階的 id 一定是 `moon`。
- `radius` 必須嚴格遞增；`score` 是「合成出此階時」獲得的分數。
- 第 1 階不能靠合成產生，所以 score 是 0。

### 3.2 常數（`src/game/config.js` → `GAME`）

| 常數 | 值 | 說明 |
|------|----|------|
| `WIDTH` | 400 | 邏輯寬度（容器內寬），x ∈ [0, 400] |
| `HEIGHT` | 700 | 邏輯高度，地板上緣 y = 700 |
| `WALL_THICKNESS` | 60 | 牆和地板的厚度，放在可視範圍外 |
| `DROP_Y` | 60 | 投放時的物件圓心 y |
| `DANGER_Y` | 120 | 警戒線 y |
| `TIMESTEP` | 1000 / 60 | 物理固定步長（ms） |
| `MAX_FRAME_DT` | 250 | 單次 `step(dt)` 最多吃進的時間（防止卡頓後暴衝） |
| `GRAVITY_Y` | 1 | `engine.gravity.y`（Matter 預設 scale） |
| `RESTITUTION` | 0.1 | 彈性 |
| `FRICTION` | 0.3 | 摩擦 |
| `MAX_SPEED` | 20 | 每個 step 結束時，所有物件的速度大小上限 |
| `DROP_COOLDOWN` | 500 | 投放冷卻（ms，模擬時間） |
| `DROP_GRACE` | 1500 | 剛投放物件豁免 Game Over 判定的時間（ms） |
| `OVER_LINE_LIMIT` | 2000 | 超過警戒線多久判定 Game Over（ms） |
| `SPAWN_WEIGHTS` | `{ 1: 0.4, 2: 0.3, 3: 0.2, 4: 0.1 }` | 生成機率（第 1～4 階，越小越常見） |
| `MERGE_POP` | 4 | 合成時新物件額外獲得的向上速度（px / step） |
| `MERGE_PUSH` | 3 | 合成時推開周圍物件的最大速度（px / step），隨距離線性衰減 |
| `MERGE_PUSH_RANGE` | 12 | 推開範圍：兩圓邊緣距離 ≤ 此值的物件會被推開（px） |

所有時間都是**模擬時間**，由 `step()` 累加，不讀 `Date.now()`，所以測試可以重現。

---

## 4. 系統行為

### 4.1 模組邊界

- `src/game/*`：純邏輯，**不碰 DOM、Canvas 和 `window`**。需要 Matter 的模組以參數注入 `Matter`，storage 也以參數注入。可以在 Node 測試。
- `src/render/*`、`src/main.js`：DOM、Canvas、輸入、特效和音效。只讀取 game 的狀態和事件，不修改物理。

| 模組 | 對外介面（契約） |
|------|------------------|
| `rng.js` | `createRng(seed: number) → () => number`，回傳 [0, 1)，相同 seed 產生相同序列（mulberry32） |
| `spawner.js` | `createSpawner({ rng, weights = GAME.SPAWN_WEIGHTS }) → { peek(): tier, next(): tier }`。`peek` 看下一個但不消耗，`next` 取出並產生新的下一個 |
| `world.js` | `createWorld(Matter) → { engine, addFruit(tier, x, y, { bornAt }) → body, removeFruit(body), fruits(): body[], clear() }`。建立地板和左右牆（static），沒有天花板；`bornAt` 預設 0 |
| `merge.js` | `createMergeSystem(Matter, world, { onMerge }) → { flush(now) }`。監聽 engine 的 `collisionStart` 和 `collisionActive`，把同階配對放進佇列；`flush` 在 `Engine.update` 之後處理佇列（移除、生成新物件），每合成一對呼叫一次 `onMerge({ fromTier, toTier, x, y, body })`（body 是新物件）。**計分和事件由 game 在 onMerge 裡處理**，merge.js 不管分數 |
| `rules.js` | 計分和 Game Over 判定（純函式或小型狀態物件，不依賴 Matter） |
| `storage.js` | `loadBest(storage) → number`、`saveBest(storage, value)`。key 是 `merge-to-the-moon:best`；storage 是 null 或丟錯時不能崩潰（load 回傳 0，save 靜默失敗） |
| `game.js` | `createGame(Matter, { seed, storage }) → Game`，組合上述模組，是 UI 唯一需要呼叫的入口 |
| `share.js` | `buildShareText({ score, maxTier }) → string`，產生分享文字（純函式） |

### 4.2 物件（Fruit body）

- 物件一律是 Matter **圓形**剛體，半徑為 `TIERS[tier-1].radius`，`restitution` 和 `friction` 依照 `GAME`。
- 自訂屬性：`body.isFruit = true`、`body.tier`、`body.bornAt`（模擬時間 ms）、`body.merging`（合成佇列鎖，預設 false）。
- 牆和地板是 static 矩形，內緣剛好在 x = 0、x = WIDTH、y = HEIGHT。左右牆從 y < 0（畫面頂端以上）一路延伸到地板，避免彈高的物件從牆頂飛出去。

### 4.3 Game 介面與狀態機

```
state: 'ready' ──start()──▶ 'playing' ──(超線 ≥ 2s)──▶ 'over'
                               ▲                         │
                               └──────restart()──────────┘
```

| 成員 | 行為 |
|------|------|
| `state` | `'ready' \| 'playing' \| 'over'` |
| `start()` | ready → playing |
| `restart()` | 清空所有物件、分數、計時器、統計、生成器（沿用 RNG，不重設 seed），state → playing。不會改動最高分 |
| `step(dtMs)` | 只在 playing 且沒有暫停時推進。`dt = min(dtMs, MAX_FRAME_DT)` 加進 accumulator，每滿 `TIMESTEP` 執行一個 substep（見 4.4） |
| `moveTo(x)` | 把「手上物件」的 x 設為 `clamp(x, r, WIDTH - r)`，r 是手上物件的半徑 |
| `drop()` | 見 4.5，成功回傳 body，失敗回傳 null |
| `current` / `next` | 手上物件的階、下一個物件的階（`next` 只供內部與測試使用，**UI 不顯示**） |
| `aimX` | 手上物件目前的 x（初始值是 WIDTH / 2） |
| `score` / `best` / `maxTier` | 本局分數、最高分、本局達到的最高階（初始 0，投放和合成時更新為 max） |
| `now` | 目前模擬時間（ms） |
| `overTime` | 目前連續超線的時間（ms），UI 用它來讓警戒線閃爍 |
| `pause()` / `resume()` / `paused` | 暫停時 `step` 不推進 |
| `fruits()` | 目前所有物件（給 renderer 用） |
| `world` | 內部的 world 物件（4.1），給測試和除錯直接擺放物件用，UI 不使用 |
| `on(event, fn)` | 訂閱事件（見 4.8） |

### 4.4 Substep 順序（每個 `TIMESTEP` 一次）

1. `Matter.Engine.update(engine, TIMESTEP)`
2. `merge.flush(now)`：處理合成佇列（4.6）
3. 速度上限：所有物件 `|v| > MAX_SPEED` 時等比縮放到 `MAX_SPEED`
4. `now += TIMESTEP`
5. Game Over 判定（4.7）

### 4.5 生成與投放

- 生成器每次只產生 tier 1～4，機率依照 `SPAWN_WEIGHTS`。
- `drop()` 成功的條件：`state === 'playing'`、沒有暫停，而且 `now - lastDropAt ≥ DROP_COOLDOWN`（第一次投放不受冷卻限制）。
- 成功時：在 `(aimX, DROP_Y)` 加入 `current` 階物件，`bornAt = now`；接著 `current = next`，`next = spawner.next()`；`aimX` 重新 clamp 到新 current 的半徑範圍；發出 `drop` 事件。
- 失敗時（冷卻中、非 playing）：什麼都不做，回傳 null。

### 4.6 合成規則

1. **偵測**：`collisionStart` 或 `collisionActive` 的每一個 pair，若 `bodyA`、`bodyB` 都是 fruit、`tier` 相同、`tier < MAX_TIER`，而且兩者的 `merging` 都是 false → 兩者 `merging = true`，放進佇列。**同一物件在一個 substep 內最多進佇列一次**，所以三個同階物件同時接觸時只會合成一對。
2. **處理（flush）**：對佇列中每一對：
   - 新階 `t = tier + 1`，新半徑 `R`。
   - 位置 = 兩圓心的中點，再 clamp：`x ∈ [R, WIDTH - R]`、`y ≤ HEIGHT - R`。
   - 速度 = 兩者速度的平均（保留慣性）＋ 向上 `MERGE_POP`，再限制到 `MAX_SPEED`。
   - **推開周圍**：其他 fruit 若和新物件的邊緣距離 `gap = dist − R − r ≤ MERGE_PUSH_RANGE`，就沿「新物件圓心 → 該物件圓心」的方向加上速度 `MERGE_PUSH × (1 − max(0, gap) / MERGE_PUSH_RANGE)`，加完後限制到 `MAX_SPEED`。兩圓心重合時往正上方推。
   - 移除兩個舊物件，加入新物件（`bornAt` = 兩者中較早的那個，**不給**投放豁免）。
   - 呼叫 `onMerge`。game 收到後：分數 `+= TIERS[t-1].score`；`maxTier = max(maxTier, t)`；若 `score > best`，就更新 best 並 `saveBest`；
     發出 `merge` 事件；若 `t === MAX_TIER` 而且本局第一次出現月亮，再發出 `moon` 事件。
3. **連鎖**：新物件在後續 substep 若接觸同階物件，照同樣規則繼續合成（不需要特別處理）。
4. **月亮**：`tier === MAX_TIER` 的物件永遠不進合成佇列，兩顆月亮只會正常碰撞。
5. **碰撞合理性**：合成出的大物件擠開周圍物件時，靠 4.4 的速度上限避免物件被彈飛；牆和地板保證物件不會離開容器。

### 4.7 Game Over 判定

- 「超線物件」的條件：`body.position.y - radius < DANGER_Y`，而且 `now - body.bornAt ≥ DROP_GRACE`。
- 只要有任何超線物件，`overTime += TIMESTEP`；沒有的話 `overTime = 0`。
- `overTime ≥ OVER_LINE_LIMIT` → `state = 'over'`，發出 `gameover` 事件，之後 `step` 不再推進物理。

### 4.8 事件

| 事件 | payload | 用途 |
|------|---------|------|
| `drop` | `{ tier, x, y }` | 音效 |
| `merge` | `{ fromTier, toTier, x, y, gained, score, body }` | 粒子、Pop（用 `body.id` 對應）、閃光圈、飄字、音效 |
| `moon` | `{ x, y }` | 月亮慶祝特效 |
| `gameover` | `{ score, best, maxTier }` | 顯示結算畫面 |

### 4.9 畫面與特效（render）

- **Canvas**：邏輯解析度 400×700，依照視窗等比縮放（contain），並考慮 `devicePixelRatio`；`imageSmoothingEnabled = false`。
- **像素圖**：每一階由 `buildSpriteGrid(tier)`（純函式）**以程式產生** palette 索引字串網格：圓形遮罩＋右下月牙陰影＋左上高光＋外框，再加上各階專屬裝飾（紅印、芝麻、花紋、花邊、葉子、坑洞…）。網格邊長 = `round(2r / 3.5)`（最小 7），讓各階的像素顆粒大小一致（每格約 3～4.5 邏輯 px）。網格在 offscreen canvas 預先繪製後快取；繪製時縮放到直徑 2r，並依 `body.angle` 旋轉。外形和碰撞圓的誤差不超過 1 格（由 `sprites.test.js` 驗證）。
  - 為什麼不手繪字串：9 張圖手刻工作量大，又很難保證外形貼合碰撞圓；程式產生的網格可以直接用測試驗證。
- **場景**：像素夜空、星星、雲；容器像木盒；警戒線是虛線，`overTime > 0` 時閃紅。
- **HUD**：用 DOM 放在畫布上方（分數、最高分、暫停鈕、靜音鈕），不佔用投放區；**不顯示下一個預覽**。手上物件和一條淡淡的投放導引線畫在 `aimX`。
- **合成特效**（由 `merge` 事件觸發，存活約 0.3～0.8 秒）：
  - 粒子：8～16 顆方形像素，顏色取自新階 palette，向外噴散並受重力影響。
  - Pop：新物件的**視覺**縮放 0.6 → 1.1 → 1.0（約 200ms），物理半徑不變。
  - 閃光圈：白色像素環擴散後淡出。
  - 飄字：`+gained` 往上飄並淡出。
- **月亮特效**（`moon` 事件）：全螢幕金光閃爍、星星雨約 2 秒、輕微震動，並顯示「花好月圓！」；遊戲繼續。
- 特效只讀事件，不影響物理，也不影響測試結果；使用真實時間，暫停時凍結。
- 震動只移動畫面繪製的偏移量，不影響輸入座標換算。

### 4.10 輸入

- Pointer Events 統一處理滑鼠和觸控：在畫布上 `pointermove` / `pointerdown` → `moveTo`，`pointerup` → `drop`。
- 鍵盤：← / → 每幀移動 6px（按住連續移動），Space 或 Enter 投放。
- 畫布設定 `touch-action: none`；頁面禁止雙擊縮放和拉動回彈，避免誤觸捲動。
- `visibilitychange` 切到背景時 `pause()`，回到前景時 `resume()`。
- 主迴圈用 `requestAnimationFrame`，把兩幀的時間差傳給 `game.step(dt)`。
- 除錯：網址加上 `?debug` 時，把 game 掛到 `window.__game`，方便在 console 擺放物件、快轉 `step`。

### 4.11 UI 流程

1. **標題畫面**（ready）：遊戲名稱、像素月亮、「開始」按鈕、最高分。
2. **遊戲中**：HUD 有暫停鈕和靜音鈕。暫停時顯示「暫停中」覆蓋畫面和「繼續」按鈕；切到背景自動暫停，回來時維持暫停，等玩家按「繼續」。
   - 音效（WebAudio 即時合成，不載入音檔）：投放、合成（階數越高音調越高）、月亮（琶音）、結束（下降音）。靜音狀態存在 `localStorage` 的 `merge-to-the-moon:muted`。AudioContext 在第一次使用者操作時才建立。
3. **結算畫面**（over）：本局分數、最高分（破紀錄時顯示「新紀錄！」）、最高合成階的像素圖和名稱、「再一局」和「分享」按鈕。

### 4.12 分享

- 文字：`我在「月餅合成」拿到 {score} 分，最高合成到「{name}」！一起來合成月亮 🌕`，加上頁面網址。
- 有 `navigator.share` 時使用它；沒有或失敗（非使用者取消）時改用 `navigator.clipboard.writeText`，並提示「已複製分享文字」。
- `index.html` 加上 `og:title`、`og:description`、`og:image`（像素月亮圖 `src/og.png`）、`twitter:card`，以及像素月亮 favicon。
- `og.png` 和 `favicon.png` 由 `scripts/make-images.mjs` 依像素圖網格產生（不需要額外套件）。部署後 `og:image` 要改成絕對網址（P9）。

---

## 5. Acceptance Criteria

| AC | 驗收條件 | 驗證方式 |
|----|----------|----------|
| AC1 | 階級表 ≥ 9 階（≥ 8 次合成），半徑嚴格遞增，最後一階是 `moon` | 自動測試 |
| AC2 | 生成只會出現第 1～4 階，四種都會出現；相同 seed 產生相同序列；UI 不顯示下一個 | 自動測試 ＋ 手動 |
| AC3 | 物件受重力落下，停在地板或其他物件上，不會穿透地板或牆壁 | 自動測試 |
| AC4 | 兩個同階物件接觸後，在同一個 substep 內合成一個高一階物件，位置在兩者中點（經 clamp）；新物件速度 = 平均速度 ＋ 向上彈跳，周圍物件被推開 | 自動測試 |
| AC5 | 不同階物件接觸不會合成 | 自動測試 |
| AC6 | 一個物件同時接觸兩個同階物件時只合成一次，物件總數正確；重複的碰撞事件不會重複合成 | 自動測試 |
| AC7 | 合成擠開鄰居時，沒有物件速度 > `MAX_SPEED`、沒有物件離開容器，穩定後沒有明顯重疊 | 自動測試 |
| AC8 | 可以連鎖合成；兩顆月亮不合成；第一次合成出月亮時觸發 `moon` 事件 | 自動測試 |
| AC9 | 每次合成都有粒子、Pop、閃光圈、飄字；月亮有專屬慶祝特效 | 手動 |
| AC10 | 分數正確累加；最高分重新整理後還在；storage 無法使用時不會崩潰 | 自動測試 ＋ 手動 |
| AC11 | 超線 ≥ 2s 判定 Game Over，< 2s 不會；剛投放的物件豁免 1.5s；`restart()` 後狀態全部歸零 | 自動測試 |
| AC12 | 投放有 500ms 冷卻；投放 x 會 clamp 在牆內 | 自動測試 |
| AC13 | 手機直式能完整遊玩（觸控投放、畫面不溢出、不誤觸捲動或縮放） | 手動（實機） |
| AC14 | 分享在支援的裝置叫出系統分享，不支援時改成複製到剪貼簿 | 手動 |
| AC15 | GitHub Pages 公開網址可以直接打開遊玩；CI 測試通過才部署 | 手動 ＋ CI |
| AC16 | 暫停鈕可暫停和繼續；靜音設定重新整理後還在 | 手動 |

---

## 6. Non-goals（不做）

- 不做後端、排行榜、帳號、資料庫、API。
- 不使用前端框架、打包工具、TypeScript，也沒有 build step。
- 不做多人連線、關卡、道具、商店、廣告。
- 不做像素級精準碰撞，碰撞體統一是圓形。
- 不支援 IE 或過舊的瀏覽器（以近兩年的 Chrome、Safari、Firefox、Edge 為準）。
- 不做 i18n，介面只有繁體中文。
- 不追求多種螢幕更新率下物理結果逐幀一致（固定步長已足夠）；也不做存檔或續玩。

---

## 7. 測試對照（TDD，P2 先寫測試）

測試用 Node 內建 `node --test` 執行，物理測試使用 headless `Matter.Engine` 加固定步長和 seed。共用工具放在 `tests/helpers.js`（建立 game 或 world、步進 N 個 substep、等待靜止、mock storage）。

| 測試檔 | 涵蓋 AC | 重點案例 |
|--------|---------|----------|
| `config.test.js` | AC1 | 長度 ≥ 9、半徑嚴格遞增、最後一階是 moon、tier 欄位等於索引 + 1 |
| `spawner.test.js` | AC2 | 1000 次只出現 {1～4} 而且四種都有、第 1 階最多；同 seed 同序列；`peek` 不消耗 |
| `physics.test.js` | AC3、AC7 | 重力落下、停在地板（誤差 ≤ 1px）、最大階高速落下不穿隧、大水平速度不穿牆、不同階疊放不重疊、靜止後速度 < ε |
| `merge.test.js` | AC4～AC8 | 同階合成（id 移除、階 + 1、中點）、不同階不合成、三個同時接觸只合成一對、重複事件不重複合成、靜止相貼也合成、密集堆中合成時的速度上限和容器限制、速度平均＋向上彈跳加上限、推開範圍內的鄰居（方向正確、範圍外不動、不超速）、連鎖、月亮不合成加 moon 事件只觸發一次 |
| `sprites.test.js` | 4.9 | 每階網格尺寸正確、不透明格不超出碰撞圓 1 格、圓內超過 1 格的地方不能透明、只使用 palette 內的索引、各階顆粒大小一致 |
| `share.test.js` | 4.12 | 分享文字包含分數和最高合成階名稱；沒有合成時的文字 |
| `rules.test.js` | AC10～AC12 | 計分、最高分更新和保存、storage 丟錯不崩潰、超線 < 2s 或 ≥ 2s、投放豁免、restart 歸零、投放冷卻、aimX clamp、非 playing 時不能投放 |

**容差約定**：位置 ±1px（靜止判定）或 ±2px（合成中點）；重疊判定：圓心距離 ≥ r1 + r2 − 1.5；靜止：所有物件的 `|v| < 0.05`，並持續 30 個 substep。
