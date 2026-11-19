《解放的哈爾巴斯》資產驅動 3D 版本

這版不再用程序化幾何人偶當玩家或怪物。人物改為載入獨立 GLB 高細節 3D 模型，並播放模型內附的骨架動畫。

實際使用的模型資產（均為 Grab3D CC0 1.0）：
- 玩家：Samurai High Detail Rigged（約 14 MB rigged GLB；原模型為紅金漆甲，遊戲內將材質調成黑紫金方向，額外加上紅披風與紫色巨劍配件）。原模型頁：https://grab3d.com/models/characters/samurai/
- 怪物：Skeleton Warrior High Detail Rigged（約 14 MB rigged GLB；走路/跑步動畫）。原模型頁：https://grab3d.com/models/characters/skeleton-warrior/
- 精英怪：Orc High Detail Rigged（約 13 MB rigged GLB；走路/跑步動畫）。原模型頁：https://grab3d.com/models/characters/orc/

注意：
1. GLB 模型由遊戲透過網路從 Grab3D CDN 載入，首次載入需要網路，三個模型合計約 41 MB。這些不是天堂 M 官方模型，而是 CC0 授權的高細節 3D 基礎資產。
2. Samurai 模型並非天堂 M 官方騎士；材質會改成黑紫金，並加入紅披風、紫色大劍。原模型本身只有走路/跑步動畫，沒有官方攻擊動畫。
3. Skeleton Warrior / Orc 模型使用原有骨架動畫；怪物攻擊和死亡由遊戲控制器處理。
4. 為 iPhone 效能，場上怪物上限調整為 12，地磚改用 InstancedMesh 減少 draw calls。
5. 使用 Three.js 0.170.0、GLTFLoader、SkeletonUtils，透過 esm.sh 載入。
6. 需在 GitHub Pages 根目錄放置 index.html、main.js、style.css、README.txt、ASSET_LICENSES.txt。

GitHub Pages：
解壓縮 ZIP，將四個檔案上傳到儲存庫根目錄，覆蓋同名檔案後 Commit changes。
網址：https://homie90916-dev.github.io/-3D-/?v=asset-driven-2

測試聲明：
本專案已做 JavaScript 語法與 ZIP 完整性檢查；目前執行環境無法對 iPhone Safari 和遠端 GLB CDN 做實機網路測試。
