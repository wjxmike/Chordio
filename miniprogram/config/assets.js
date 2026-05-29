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

const PIANO_CACHE_DIR = `${wx.env.USER_DATA_PATH}/piano-samples`;
const fs = wx.getFileSystemManager();

function ensurePianoCacheDir() {
  try {
    fs.mkdirSync(PIANO_CACHE_DIR, true);
  } catch (e) {
    // 目录已存在
  }
}

function pianoCachePath(relativePath) {
  const safe = normalizePath(relativePath).replace(/\//g, '__');
  return `${PIANO_CACHE_DIR}/${safe}`;
}

function readFileAsArrayBuffer(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile({
      filePath,
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

function requestArrayBuffer(url) {
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
      fail: reject
    });
  });
}

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
 * CDN：优先 downloadFile 到本地缓存（与歌曲相同域名规则，真机只需 downloadFile 合法域名）
 * 云存储：downloadFile + readFile
 */
function loadAssetArrayBuffer(relativePath) {
  const path = normalizePath(relativePath);

  if (ASSET_PROVIDER === 'cloud') {
    const { getCloudFileId } = require('./cloud');
    return downloadCloudFile(getCloudFileId(path)).then((tempFilePath) => readFileAsArrayBuffer(tempFilePath));
  }

  const url = `${CDN_BASE}/${path}`;
  ensurePianoCacheDir();
  const localPath = pianoCachePath(path);

  let cached = false;
  try {
    fs.accessSync(localPath);
    cached = true;
  } catch (e) {
    cached = false;
  }

  if (cached) {
    return readFileAsArrayBuffer(localPath);
  }

  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      filePath: localPath,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          readFileAsArrayBuffer(res.filePath || localPath).then(resolve).catch(reject);
          return;
        }
        requestArrayBuffer(url).then(resolve).catch(reject);
      },
      fail: (err) => {
        console.warn('[assets] downloadFile failed, fallback to request:', path, err);
        requestArrayBuffer(url)
          .then(resolve)
          .catch((reqErr) => {
            console.error(
              '[assets] CDN 加载失败，请确认 downloadFile 合法域名含 cdn.jsdelivr.net：',
              url,
              reqErr
            );
            reject(reqErr);
          });
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
