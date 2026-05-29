/**
 * 云开发环境配置
 *
 * 若播放失败（empty download url）：
 * 1. 云控制台 → 存储 → 点开任意文件 → 复制完整 File ID 到 CLOUD_FILE_ID_EXAMPLE
 * 2. 或在开发者工具中右键上传并部署云函数 listStorageFiles（自动解析 fileID）
 */
const CLOUD_ENV = 'cloud1-d4gdx1hzuea79bab9';

/**
 * 从控制台复制的完整 File ID，例如：
 * cloud://cloud1-xxx.636c-cloud1-xxx-1412952295/piano/C4.m4a
 */
const CLOUD_FILE_ID_EXAMPLE = 'cloud://cloud1-d4gdx1hzuea79bab9.636c-cloud1-d4gdx1hzuea79bab9-1391793431/piano/C4.m4a';

function parsePrefixFromExample(example) {
  if (!example || typeof example !== 'string') return null;
  const trimmed = example.trim();
  const match = trimmed.match(/^(cloud:\/\/[^/]+)/);
  return match ? match[1] : null;
}

const FALLBACK_STORAGE_ID = '636c-cloud1-d4gdx1hzuea79bab9-1391793431';
let cloudFilePrefix = parsePrefixFromExample(CLOUD_FILE_ID_EXAMPLE)
  || `cloud://${CLOUD_ENV}.${FALLBACK_STORAGE_ID}`;

/** cloudPath → 完整 fileID（由 listStorageFiles 填充） */
const fileIdByCloudPath = {};

function setFileIdMap(files) {
  Object.keys(fileIdByCloudPath).forEach((k) => delete fileIdByCloudPath[k]);
  if (!files || !files.length) return;

  files.forEach((item) => {
    if (item.key && item.fileID) {
      fileIdByCloudPath[item.key] = item.fileID;
    }
  });

  const prefix = parsePrefixFromExample(files[0].fileID);
  if (prefix) {
    cloudFilePrefix = prefix;
  }
}

function getCloudFilePrefix() {
  return cloudFilePrefix;
}

function getCloudFileId(cloudPath) {
  if (fileIdByCloudPath[cloudPath]) {
    return fileIdByCloudPath[cloudPath];
  }
  return `${cloudFilePrefix}/${cloudPath}`;
}

function ensureFileIdMap() {
  if (!wx.cloud) {
    return Promise.resolve(false);
  }
  if (Object.keys(fileIdByCloudPath).length > 0) {
    return Promise.resolve(true);
  }

  return wx.cloud.callFunction({
    name: 'listStorageFiles',
    data: { prefix: '' }
  }).then((res) => {
    const result = res.result || {};
    const files = result.files;
    if (files && files.length) {
      setFileIdMap(files);
      console.log('[cloud] fileID map loaded:', files.length, 'files');
      return true;
    }
    if (!CLOUD_FILE_ID_EXAMPLE) {
      console.warn(
        '[cloud] 未能自动获取 fileID。请部署云函数 listStorageFiles，'
        + '或在 config/cloud.js 填写 CLOUD_FILE_ID_EXAMPLE'
      );
    }
    return false;
  }).catch((err) => {
    console.warn('[cloud] listStorageFiles failed:', err);
    return false;
  });
}

module.exports = {
  CLOUD_ENV,
  getCloudFilePrefix,
  CLOUD_FILE_ID_EXAMPLE,
  getCloudFileId,
  ensureFileIdMap,
  setFileIdMap,
};
