/**
 * 静态资源托管配置
 *
 * provider: 'cdn'  → GitHub + jsDelivr（与字体同一仓库，无需云存储读权限）
 * provider: 'cloud' → 微信云开发（需配置存储「所有用户可读」）
 *
 * CDN 仓库目录需与云存储一致：
 *   piano/C4.m4a
 *   song-audio/1-1.mp3
 *   covers/1.jpeg
 * 仓库：https://github.com/wjxmike/chordio-assets
 */
const ASSET_PROVIDER = 'cdn';

// 固定到含 Logic Bounces 片段的提交；更新资源后改 commit 或等 @main 缓存刷新
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets@2829207';

function normalizePath(relativePath) {
  return relativePath.replace(/^\//, '');
}

function getAssetUrl(relativePath) {
  const path = normalizePath(relativePath);
  if (ASSET_PROVIDER === 'cloud') {
    const { getCloudFileId } = require('./cloud');
    return getCloudFileId(path);
  }
  return `${CDN_BASE}/${path}`;
}

function downloadCloudFile(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.downloadFile({
      fileID,
      success: (res) => resolve(res.tempFilePath),
      fail: (dlErr) => {
        wx.cloud.getTempFileURL({
          fileList: [fileID],
          success: (res) => {
            const item = res.fileList && res.fileList[0];
            if (!item || item.status !== 0 || !item.tempFileURL) {
              reject(new Error((item && item.errMsg) || 'empty tempFileURL'));
              return;
            }
            wx.downloadFile({
              url: item.tempFileURL,
              success: (httpRes) => resolve(httpRes.tempFilePath),
              fail: reject
            });
          },
          fail: (urlErr) => reject(dlErr || urlErr)
        });
      }
    });
  });
}

/**
 * 下载资源到本地临时路径（InnerAudio 等需要本地路径时用）
 */
function downloadAsset(relativePath) {
  const path = normalizePath(relativePath);
  if (ASSET_PROVIDER === 'cloud') {
    const { getCloudFileId } = require('./cloud');
    return downloadCloudFile(getCloudFileId(path));
  }

  const url = `${CDN_BASE}/${path}`;
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.tempFilePath);
          return;
        }
        reject(new Error(`[assets] HTTP ${res.statusCode}: ${url}`));
      },
      fail: (err) => {
        console.error(
          '[assets] CDN 下载失败，请确认：\n'
          + '1. 文件已 push 到 github.com/wjxmike/chordio-assets\n'
          + '2. 小程序后台已配置 downloadFile 合法域名 cdn.jsdelivr.net\n',
          url,
          err
        );
        reject(err);
      }
    });
  });
}

/**
 * 加载资源为 ArrayBuffer（Web Audio 解码用）
 * CDN：wx.request，避免 http://tmp 路径无法 readFile
 * 云存储：downloadFile + readFile
 */
function loadAssetArrayBuffer(relativePath) {
  const path = normalizePath(relativePath);

  if (ASSET_PROVIDER === 'cloud') {
    const { getCloudFileId } = require('./cloud');
    return downloadCloudFile(getCloudFileId(path)).then((tempFilePath) => new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: tempFilePath,
        success: (res) => resolve(res.data),
        fail: reject
      });
    }));
  }

  const url = `${CDN_BASE}/${path}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
          resolve(res.data);
          return;
        }
        reject(new Error(`[assets] HTTP ${res.statusCode}: ${url}`));
      },
      fail: (err) => {
        console.error(
          '[assets] CDN 请求失败，请确认 request 合法域名含 cdn.jsdelivr.net：',
          url,
          err
        );
        reject(err);
      }
    });
  });
}

function ensureAssetsReady() {
  if (ASSET_PROVIDER === 'cloud') {
    const { ensureFileIdMap } = require('./cloud');
    return ensureFileIdMap();
  }
  return Promise.resolve(true);
}

module.exports = {
  ASSET_PROVIDER,
  CDN_BASE,
  getAssetUrl,
  downloadAsset,
  loadAssetArrayBuffer,
  ensureAssetsReady
};
