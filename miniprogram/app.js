// Chord Hero - 和弦识别训练
const { ASSET_PROVIDER } = require('./config/assets');
const { CLOUD_ENV } = require('./config/cloud');
const songSession = require('./utils/song-session');

App({
  globalData: {
    splashShown: false  // 是否已显示过启动页
  },

  onLaunch() {
    if (ASSET_PROVIDER === 'cloud' && wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV,
        traceUser: true
      });
    }

    // 优先预下载下次歌曲练习的第一题，钢琴采样稍后加载避免抢带宽
    songSession.prepareNextSessionAndPrefetchFirst();
    require('./utils/audio').initPiano();
  }
});
