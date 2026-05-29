/**
 * 版本更新日志数据
 */

// 当前版本号
const CURRENT_VERSION = '1.1.1';

// 版本日志列表（从新到旧）
const CHANGELOG = [
  {
    version: '1.1.1',
    date: '2026-05-29',
    isNew: true,
    features: [
      '能量用完后，点「分享给好友」即可直接分享',
      '分享后能量立刻到账'
    ],
    improvements: [
      '歌曲模式加载更快，每段从开头播放',
      '练习时可随时点方块试听单个和弦'
    ],
    fixes: [
      '修复手机点和弦无声、歌曲加载卡住等问题'
    ]
  },
  {
    version: '1.1.0',
    date: '2025-03-15',
    isNew: false,
    features: [
      '能量系统：每日5点免费能量，分享好友可获得+3奖励',
      '个人中心：练习数据统计、连续打卡记录、个人资料设置'
    ],
    improvements: [
      '主页UI界面更新：全新布局设计，启动动画优化',
      '歌曲库扩充：20首热门中英文歌曲，50个歌曲题目'
    ],
    fixes: [
      '挑战模式多填空显示异常',
      '正确率计算逻辑错误',
      '其他已知问题修复'
    ]
  },
  {
    version: '1.0.0',
    date: '2025-02-15',
    isNew: false,
    features: [
      '练习模式：三和弦、七和弦、离调和弦三个级别',
      '和弦进行听辨练习',
      '关卡解锁机制',
      '歌曲模式：听歌识和弦，从真实歌曲片段中识别和弦进行',
      '挑战模式：无限答题、5条命、计时器、难度递增',
      '真实钢琴音色：替换合成音，听感更自然'
    ],
    improvements: [],
    fixes: []
  }
];

/**
 * 获取当前版本号
 */
function getCurrentVersion() {
  return CURRENT_VERSION;
}

/**
 * 获取完整更新日志
 */
function getFullChangelog() {
  return CHANGELOG;
}

/**
 * 获取最新版本信息
 */
function getLatestVersionInfo() {
  return CHANGELOG[0];
}

/**
 * 检查是否需要显示更新公告
 */
function shouldShowUpdateNotice() {
  const lastSeenVersion = wx.getStorageSync('lastSeenVersion');
  return lastSeenVersion !== CURRENT_VERSION;
}

/**
 * 标记已查看当前版本
 */
function markVersionSeen() {
  wx.setStorageSync('lastSeenVersion', CURRENT_VERSION);
}

module.exports = {
  CURRENT_VERSION,
  CHANGELOG,
  getCurrentVersion,
  getFullChangelog,
  getLatestVersionInfo,
  shouldShowUpdateNotice,
  markVersionSeen
};
