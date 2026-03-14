/**
 * 每日能量管理
 */

const DAILY_FREE_COUNT = 5;  // 每日免费能量
const BONUS_PER_SHARE = 3;   // 每次分享获得的额外能量

/**
 * 获取今日日期字符串 (YYYY-MM-DD)
 */
function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 获取能量数据
 * @returns {{ date: string, used: number, bonus: number }}
 */
function getCountData() {
  const data = wx.getStorageSync('playCount') || { date: getTodayString(), used: 0, bonus: 0 };

  // 如果是新的一天，重置能量
  if (data.date !== getTodayString()) {
    data = { date: getTodayString(), used: 0, bonus: 0 };
    wx.setStorageSync('playCount', data);
  }

  return data;
}

/**
 * 获取剩余能量
 * @returns {number}
 */
function getRemainingCount() {
  const data = getCountData();
  return Math.max(0, DAILY_FREE_COUNT + data.bonus - data.used);
}

/**
 * 检查是否可以游玩
 * @returns {boolean}
 */
function canPlay() {
  return getRemainingCount() > 0;
}

/**
 * 使用一点能量
 * @returns {boolean} 是否成功
 */
function useCount() {
  if (!canPlay()) return false;

  const data = getCountData();
  data.used += 1;
  wx.setStorageSync('playCount', data);
  return true;
}

/**
 * 标记待发放的分享奖励（分享时调用）
 */
function markPendingBonus() {
  wx.setStorageSync('pendingBonus', true);
}

/**
 * 检查并发放待发放的奖励（返回页面时调用）
 * @returns {number} 发放的奖励数量，0 表示无待发放
 */
function checkAndGrantPendingBonus() {
  const pending = wx.getStorageSync('pendingBonus');
  if (!pending) return 0;

  // 清除标记
  wx.removeStorageSync('pendingBonus');

  // 发放奖励
  const data = getCountData();
  data.bonus += BONUS_PER_SHARE;
  wx.setStorageSync('playCount', data);

  return BONUS_PER_SHARE;
}

/**
 * 分享后立即增加能量（保留旧方法，可选使用）
 */
function addBonusCount() {
  const data = getCountData();
  data.bonus += BONUS_PER_SHARE;
  wx.setStorageSync('playCount', data);
}

/**
 * 获取配置
 */
function getConfig() {
  return {
    dailyFree: DAILY_FREE_COUNT,
    bonusPerShare: BONUS_PER_SHARE
  };
}

module.exports = {
  getTodayString,
  getCountData,
  getRemainingCount,
  canPlay,
  useCount,
  addBonusCount,
  markPendingBonus,
  checkAndGrantPendingBonus,
  getConfig
};
