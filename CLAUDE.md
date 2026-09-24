# CLAUDE.md

本專案是中秋 H5 作業「Merge to the Moon：月餅合成」。

- **目標文件**：[PROJECT_GOAL.md](PROJECT_GOAL.md)。所有實作、測試、驗收都以它為準；原始作業要求在 [mid-autumn-h5-checklist.md](mid-autumn-h5-checklist.md)。
- 技術：原生 HTML/CSS/JS（ES Modules）和 Matter.js，不用框架也不用打包工具；部署到 GitHub Pages（`src/` 是部署根目錄）。
- 測試：`npm test`（Node 內建 `node --test`）。`src/game/*` 不能碰 DOM，`Matter` 以參數注入。
- 走 SDD + TDD：需求改動先改 `SPEC.md` 或 `PROJECT_GOAL.md`；新行為先寫會失敗的測試再實作。
- **每個大階段（PROJECT_GOAL.md 第 8 節 P0～P10）結束就要 commit**，不要等到最後一次才 commit。
- AI 出錯（測試失敗、誤解需求）時，馬上記到 `docs/ai-incidents.md`（我想要什麼 / AI 做了什麼 / 怎麼發現 / 怎麼解決）。
