# 将音频上传到 GitHub（jsDelivr CDN）

小程序已切换为从 `chordio-assets` 仓库加载资源（与字体相同）。

## 仓库

https://github.com/wjxmike/chordio-assets

## 目录结构（与云存储一致）

```
chordio-assets/
├── fonts/          （已有）
├── piano/
│   ├── C2.m4a … C5.m4a   （37 个单音）
├── song-audio/
│   ├── 1-1.mp3 …
└── covers/
    ├── 1.jpeg … 20.jpeg
```

## 上传步骤

1. 克隆仓库：`git clone https://github.com/wjxmike/chordio-assets.git`
2. 运行同步脚本（封面来自桌面歌曲库，音频优先 Logic Bounces）：
   ```bash
   ./scripts/sync-chordio-assets.sh
   ```
   - 歌曲片段源路径：`~/Music/Logic/02 - 工作/Chordio/Songs/Bounces/`（`1-1.mp3` 等）
   - 封面源路径：`~/Desktop/Chordio小程序材料/歌曲库/`（`1.jpeg` 等）
3. 提交并推送：
   ```bash
   git add piano song-audio covers
   git commit -m "Add chordio audio assets"
   git push
   ```
4. 等待 jsDelivr 刷新（通常几分钟）。浏览器可测：
   `https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets@main/piano/C4.m4a`

## 小程序后台

微信公众平台 → 开发 → 开发管理 → 开发设置 → **服务器域名** → **downloadFile 合法域名**：

- `https://cdn.jsdelivr.net`

（字体已在用，一般已配置。）

## 切回云存储

编辑 `miniprogram/config/assets.js`，将 `ASSET_PROVIDER` 改为 `'cloud'`，并确保云存储权限为「所有用户可读」。
