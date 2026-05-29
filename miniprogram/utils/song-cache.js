/**
 * 歌曲片段本地缓存 + 动态优先级下载队列
 *
 * 优先级（数字越小越优先）：
 *   0  = 当前题（urgent 通道，立即 downloadSong）
 *  10  = 下一题
 * 100+ = 本场剩余题目，按顺序递增
 */

const { getAssetUrl } = require('../config/assets');

const SONG_AUDIO_DIR = `${wx.env.USER_DATA_PATH}/song-clips`;
const fs = wx.getFileSystemManager();

const PRIORITY = {
  CURRENT: 0,
  NEXT: 10,
  SESSION_BASE: 100
};

const pendingDownloads = new Map();
/** 持久化缓存失败时，本场临时路径（如开发者工具） */
const sessionTempCache = new Map();
/** @type {{ path: string, priority: number, seq: number }[]} */
const downloadQueue = [];
let queueActive = 0;
let seqCounter = 0;
const QUEUE_CONCURRENCY = 2;
const DOWNLOAD_TIMEOUT_MS = 12000;

function isRemoteUrl(src) {
  return typeof src === 'string' && /^https?:\/\//.test(src);
}

function ensureDir() {
  try {
    fs.mkdirSync(SONG_AUDIO_DIR, true);
  } catch (e) {
    // 目录已存在
  }
}

function cachePath(relativePath) {
  const safe = relativePath.replace(/\//g, '__');
  return `${SONG_AUDIO_DIR}/${safe}`;
}

function isCached(relativePath) {
  try {
    fs.accessSync(cachePath(relativePath));
    return true;
  } catch (e) {
    return false;
  }
}

function getLocalPathIfCached(relativePath) {
  if (!relativePath) {
    return null;
  }
  if (isCached(relativePath)) {
    return cachePath(relativePath);
  }
  if (sessionTempCache.has(relativePath)) {
    return sessionTempCache.get(relativePath);
  }
  return null;
}

function downloadToTemp(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
          resolve(res.tempFilePath);
          return;
        }
        reject(new Error(`[song-cache] HTTP ${res.statusCode}`));
      },
      fail: reject
    });
  });
}

function persistTempFile(tempFilePath, localPath) {
  return new Promise((resolve) => {
    fs.copyFile({
      srcPath: tempFilePath,
      destPath: localPath,
      success: () => resolve(localPath),
      fail: () => {
        // 开发者工具等环境无法写入 usr 目录时，仍可用临时文件播放
        resolve(tempFilePath);
      }
    });
  });
}

function removeFromQueue(relativePath) {
  const index = downloadQueue.findIndex((item) => item.path === relativePath);
  if (index >= 0) {
    downloadQueue.splice(index, 1);
  }
}

function sortQueue() {
  downloadQueue.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.seq - b.seq;
  });
}

/**
 * 写入或提升队列中某路径的优先级（更高优先级 = 更小的数字）
 */
function enqueue(relativePath, priority) {
  if (!relativePath || isCached(relativePath) || pendingDownloads.has(relativePath)) {
    return;
  }

  const existing = downloadQueue.find((item) => item.path === relativePath);
  if (existing) {
    existing.priority = Math.min(existing.priority, priority);
  } else {
    downloadQueue.push({
      path: relativePath,
      priority,
      seq: seqCounter += 1
    });
  }

  sortQueue();
}

function drainQueue() {
  while (queueActive < QUEUE_CONCURRENCY && downloadQueue.length > 0) {
    const item = downloadQueue.shift();
    if (!item || isCached(item.path) || pendingDownloads.has(item.path)) {
      continue;
    }

    queueActive += 1;
    downloadSong(item.path)
      .catch(() => {
        // 预下载失败时静默处理，当前题会走 CDN 流式播放
      })
      .finally(() => {
        queueActive -= 1;
        drainQueue();
      });
  }
}

function downloadSong(relativePath) {
  if (!relativePath) {
    return Promise.reject(new Error('empty path'));
  }

  ensureDir();
  const local = cachePath(relativePath);

  if (isCached(relativePath)) {
    return Promise.resolve(local);
  }

  if (pendingDownloads.has(relativePath)) {
    return pendingDownloads.get(relativePath);
  }

  const promise = new Promise((resolve, reject) => {
    let settled = false;
    const url = getAssetUrl(relativePath);

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`[song-cache] timeout: ${relativePath}`));
    }, DOWNLOAD_TIMEOUT_MS);

    const finish = (filePath) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (filePath === local) {
        sessionTempCache.delete(relativePath);
      } else {
        sessionTempCache.set(relativePath, filePath);
      }
      resolve(filePath);
    };

    const fail = (err) => {
      if (settled) return;
      downloadToTemp(url)
        .then((temp) => persistTempFile(temp, local))
        .then(finish)
        .catch((retryErr) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(retryErr || err);
        });
    };

    wx.downloadFile({
      url,
      filePath: local,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          finish(res.filePath || local);
          return;
        }
        fail(new Error(`[song-cache] HTTP ${res.statusCode}`));
      },
      fail
    });
  }).finally(() => {
    pendingDownloads.delete(relativePath);
    drainQueue();
  });

  pendingDownloads.set(relativePath, promise);
  return promise;
}

/**
 * 当前正在播放/即将播放的曲目：立即下载，不排队
 */
function prioritizeDownload(relativePath) {
  if (!relativePath) {
    return Promise.reject(new Error('empty path'));
  }

  const cached = getLocalPathIfCached(relativePath);
  if (cached) {
    return Promise.resolve(cached);
  }

  removeFromQueue(relativePath);
  return downloadSong(relativePath);
}

/**
 * 按题目顺序重排下载队列：当前题 > 下一题 > 后续按序
 * @param {Array<{ audio?: string }|string>} questionsOrPaths 题目列表或路径列表
 * @param {number} currentIndex 当前题下标
 */
function scheduleSession(questionsOrPaths, currentIndex = 0) {
  if (!questionsOrPaths || !questionsOrPaths.length) {
    return;
  }

  ensureDir();

  const paths = [];
  for (let i = currentIndex; i < questionsOrPaths.length; i += 1) {
    const item = questionsOrPaths[i];
    const path = typeof item === 'string' ? item : item && item.audio;
    if (path) {
      paths.push(path);
    }
  }

  if (!paths.length) {
    return;
  }

  const sessionPathSet = new Set(paths);

  // 移出与当前场次无关的排队项
  for (let i = downloadQueue.length - 1; i >= 0; i -= 1) {
    if (!sessionPathSet.has(downloadQueue[i].path)) {
      downloadQueue.splice(i, 1);
    }
  }

  paths.forEach((path, offset) => {
    let priority;
    if (offset === 0) {
      priority = PRIORITY.CURRENT;
    } else if (offset === 1) {
      priority = PRIORITY.NEXT;
    } else {
      priority = PRIORITY.SESSION_BASE + offset;
    }
    enqueue(path, priority);
  });

  drainQueue();
}

/** @deprecated 使用 scheduleSession */
function prefetch(relativePaths) {
  scheduleSession(relativePaths, 0);
}

module.exports = {
  ensureDir,
  isCached,
  cachePath,
  getLocalPathIfCached,
  isRemoteUrl,
  downloadSong,
  prioritizeDownload,
  scheduleSession,
  prefetch
};
