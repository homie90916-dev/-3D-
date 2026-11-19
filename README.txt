解放的哈爾巴斯｜真正 3D 修正版

這是修正後的 Three.js 即時 3D 專案。已修正上一包造成遊戲啟動後空白的 JavaScript 執行錯誤：
- 初始化戰鬥／技能粒子陣列，避免第一幀更新時 ReferenceError。
- ZIP 內檔案直接放在最外層，避免 GitHub Pages 找不到根目錄 index.html。

GitHub Pages 更新方式（重要）：
1. 解壓縮本 ZIP。
2. 開啟 GitHub 儲存庫根目錄（與原本 index.html 同一層）。
3. 上傳這四個檔案：index.html、main.js、style.css、README.txt。
4. 不要把 halpas_true_3D_FIXED 這個資料夾整個上傳成子資料夾；也不要把檔案放進子資料夾。
5. 覆蓋同名檔案並 Commit changes。
6. 等待 GitHub Pages 部署完成。
7. Safari 開啟：
   https://homie90916-dev.github.io/-3D-/?v=3dfix1

本版使用 CDN 載入 Three.js，需有網路。建議 iPhone Safari 橫向遊玩。
若仍無法啟動，請截圖 Safari 顯示的錯誤畫面，並確認 GitHub 根目錄能直接看到 index.html、main.js、style.css。

注意：這是原創程序化 3D 原型，不是天堂 M 官方模型或完整複製品。
