CPBL 即時比分板與主控台

這個專案包含兩個頁面：
- index.html：比分板顯示端
- control.html：手機/平板主控台（可遠端更新資料）

快速開始
1. 在 Firebase 主控台建立專案並啟用 Realtime Database（規則可先開發用讀寫允許）。
2. 開啟 js/firebase.js，把你的 Firebase 設定填入（已替你填好）。
   - 若主控台顯示的 Realtime Database URL 與檔案不同，請以主控台為準更新 databaseURL。
3. 用任何本機伺服器開啟此資料夾（建議 VS Code Live Server、npx serve 等），或放到同一局域網可存取的位置。
4. 電腦上開 index.html 看比分板；手機開 control.html 即可操控。

功能
- 主/客隊名稱與比分
- 局數、上下半、目前攻擊方
- 現在打者、投手、投球數
- 好/壞/出局 計數與重置
- 一、二、三壘占壘狀態切換與清空
- 整場重置

資料結構（Realtime Database game）
{
  "awayTeam": { "name": "客隊", "score": 0 },
  "homeTeam": { "name": "主隊", "score": 0 },
  "batting": "away",
  "half": "top",
  "inning": 1,
  "batter": { "name": "—", "avg": ".000" },
  "pitcher": { "name": "—", "pitches": 0 },
  "counts": { "balls": 0, "strikes": 0, "outs": 0 },
  "bases": { "b1": false, "b2": false, "b3": false },
  "updatedAt": 0
}

注意
- 本專案使用 Firebase JS SDK compat 版本於瀏覽器端，無需後端即可即時同步。
- 若要改用其他傳輸（WebSocket/WebRTC/Local network），可替換 js/firebase.js 與讀寫邏輯。

