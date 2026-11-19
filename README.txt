解放的哈爾巴斯｜真正 3D 啟動修正版 2

已修正上一版仍會在啟動後立即中止的錯誤：
- 主角光環原本存放在 hero.aura，但遊戲更新程式讀取 hero.parts.aura，造成 TypeError。
- 已將光環正確掛到 hero.parts.aura。
- 保留先前補上的 particles 陣列初始化。

更新 GitHub Pages：
1. 解壓縮本 ZIP。
2. 在 GitHub 儲存庫根目錄（原 index.html 所在位置）上傳 index.html、main.js、style.css、README.txt。
3. 覆蓋同名檔案，Commit changes。
4. 等待 Pages 部署完成。
5. 用 Safari 開啟：
   https://homie90916-dev.github.io/-3D-/?v=3dfix2

注意：這版需網路載入 Three.js CDN。若仍不能開啟，請把 Safari 的錯誤畫面或 GitHub Pages 部署畫面截圖傳來。
