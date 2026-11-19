解放的哈爾巴斯｜iPhone Safari 啟動修正版

這次針對使用者回報的「介面正常、3D 戰場黑畫面、一直停在載入中」進行修正。

修正內容：
1. 移除 ES module / importmap 載入方式，改用傳統 script 載入 Three.js，改善 iOS Safari / App 內建瀏覽器相容性。
2. Three.js 使用 0.159.0，依序嘗試 cdnjs、jsDelivr、unpkg 三個 CDN。
3. 只有引擎下載成功後才載入 main.js。
4. 加入引擎下載失敗、遊戲程式載入失敗、JavaScript 執行錯誤提示。
5. 保留前兩版修正：particles 初始化與 hero.parts.aura。

GitHub 更新：
- 將 ZIP 解壓縮。
- 把 index.html、main.js、style.css、README.txt 放在儲存庫根目錄，覆蓋同名檔案。
- Commit changes，等待 Pages 部署完成。
- Safari 開啟：
  https://homie90916-dev.github.io/-3D-/?v=safari-fix

測試說明：
已檢查 main.js 語法與 ZIP 完整性。尚未在實際 iPhone 上驗證 CDN 網路是否可用。
若 CDN 都無法連線，頁面會顯示明確錯誤，而不是無限停留在載入中。
