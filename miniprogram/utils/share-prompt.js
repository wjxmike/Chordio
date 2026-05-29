/**
 * 分享弹窗辅助：统一文案与 onShareAppMessage 配置
 */

const playCount = require('./play-count');

const ENERGY_SHARE_SUFFIX = '\n\n⚠️ 今日能量已用完，分享给好友可获得额外 3 点能量 ⚡';
const ENERGY_SHARE_ONLY = '今日免费能量已用完，分享给好友可获得额外 3 点能量 ⚡';

function buildEnergyShareMessage(mainContent) {
  return `${mainContent}${ENERGY_SHARE_SUFFIX}`;
}

function getShareAppMessageReturn() {
  playCount.markPendingBonus();
  return {
    title: 'Chordiio：听和弦练习小程序',
    path: '/page/home/home'
  };
}

/**
 * 从分享面板返回当前页时，检查并发放待领取的分享奖励
 * @param {(bonus: number) => void} [onGranted]
 * @returns {number} 发放的能量数量，0 表示无待领取
 */
function grantPendingShareBonus(onGranted) {
  const bonus = playCount.checkAndGrantPendingBonus();
  if (bonus > 0 && typeof onGranted === 'function') {
    onGranted(bonus);
  }
  return bonus;
}

module.exports = {
  ENERGY_SHARE_ONLY,
  buildEnergyShareMessage,
  getShareAppMessageReturn,
  grantPendingShareBonus
};
