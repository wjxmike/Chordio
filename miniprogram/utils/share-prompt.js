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

module.exports = {
  ENERGY_SHARE_ONLY,
  buildEnergyShareMessage,
  getShareAppMessageReturn
};
