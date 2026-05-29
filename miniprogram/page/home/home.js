/**
 * 首页 + 启动页（合并）
 * 先显示启动页，字体加载完成后过渡到首页
 */

const app = getApp();
const playCount = require('../../utils/play-count');
const changelog = require('../../data/changelog');
const songSession = require('../../utils/song-session');
const sharePrompt = require('../../utils/share-prompt');

Page({
  data: {
    showSplash: true,    // 是否显示启动页
    fontsLoaded: false,  // 字体是否加载完成
    streak: 0,           // 连续练习天数
    remainingCount: 5,   // 剩余能量
    selectedMode: null,  // 当前选中的模式
    showBonusToast: false,  // 是否显示奖励浮窗
    bonusAmount: 0,      // 奖励数量
    showUpdateNotice: false,  // 是否显示更新公告
    updateInfo: null,     // 更新信息
    showShareModal: false,   // 能量不足 · 分享弹窗
    shareModalTitle: '能量不足',
    shareModalMessage: sharePrompt.ENERGY_SHARE_ONLY,
    shareModalCancelText: '取消'
  },

  onLoad() {
    songSession.prepareNextSessionAndPrefetchFirst();

    // 从本地存储读取 streak
    this.loadStreak();

    // 如果已经显示过启动页，直接显示首页（但仍然需要加载字体）
    if (app.globalData.splashShown) {
      this.setData({ showSplash: false, fontsLoaded: true });
      // 仍然加载字体（字体加载是异步的，不影响页面显示）
      this.loadFonts();
      return;
    }

    // 首次打开：显示启动页动画
    // 记录开始时间，确保启动页最少显示 2.5 秒（让动画完成）
    const startTime = Date.now();
    const minDuration = 2500;

    // 加载字体
    this.loadFonts().then(() => {
      console.log('所有字体加载完成');

      // 显示启动页文字（触发动画）
      this.setData({ fontsLoaded: true });

      // 计算还需要等待多久
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      // 等待剩余时间后切换到首页
      setTimeout(() => {
        this.setData({ showSplash: false }, () => {
          app.globalData.splashShown = true;
          this.maybeShowUpdateNotice();
        });
      }, remaining);
    });
  },

  /**
   * 加载所有字体，返回 Promise
   */
  loadFonts() {
    const fontPromises = [
      this.loadFont('Fredoka One', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/FredokaOne-Regular.ttf'),
      this.loadFont('江城圆体', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/JiangChengYuanTi-700W-subset.woff2'),
      this.loadFont('Protest Strike', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/ProtestStrike.ttf')
    ];
    return Promise.all(fontPromises);
  },

  onShow() {
    // 返回首页时重置选中状态并刷新数据
    this.loadStreak();
    const remainingCount = playCount.getRemainingCount();
    this.setData({ selectedMode: null, remainingCount });

    // 检查待发放的分享奖励
    sharePrompt.grantPendingShareBonus((bonus) => {
      setTimeout(() => {
        this.showBonusToast(bonus);
      }, 300);
    });

    if (!this.data.showSplash) {
      songSession.prepareNextSessionAndPrefetchFirst();
      this.maybeShowUpdateNotice();
    }
  },

  /**
   * 启动页结束后或返回首页时，弹出当前版本更新公告（每版本仅一次）
   */
  maybeShowUpdateNotice() {
    if (this._updateNoticeScheduled || !changelog.shouldShowUpdateNotice()) {
      return;
    }
    this._updateNoticeScheduled = true;
    setTimeout(() => {
      if (!this.data.showUpdateNotice) {
        this.showUpdateNotice();
      }
    }, 400);
  },

  /**
   * 显示奖励浮窗
   * @param {number} amount 奖励数量
   */
  showBonusToast(amount) {
    const remainingCount = playCount.getRemainingCount();
    this.setData({
      showBonusToast: true,
      bonusAmount: amount,
      remainingCount
    });

    // 2秒后自动消失
    setTimeout(() => {
      this.setData({ showBonusToast: false });
    }, 2000);
  },

  /**
   * 显示更新公告
   */
  showUpdateNotice() {
    const updateInfo = changelog.getLatestVersionInfo();
    this.setData({
      showUpdateNotice: true,
      updateInfo
    });
  },

  /**
   * 关闭更新公告
   */
  closeUpdateNotice() {
    this.vibrateShort();
    changelog.markVersionSeen();
    this.setData({ showUpdateNotice: false });
  },

  /**
   * 加载单个字体，返回 Promise
   */
  loadFont(family, url) {
    return new Promise((resolve) => {
      wx.loadFontFace({
        family: family,
        source: `url("${url}")`,
        success: (res) => {
          console.log(`${family} 加载成功`, res);
          resolve(true);
        },
        fail: (err) => {
          console.error(`${family} 加载失败`, err);
          resolve(false);
        }
      });
    });
  },

  /**
   * 加载 Streak 数据
   */
  loadStreak() {
    const streak = wx.getStorageSync('streak') || 0;
    this.setData({ streak });
  },

  /**
   * 检查能量并跳转
   * @param {string} url 目标页面
   * @param {string} mode 模式名称
   * @param {boolean} deductNow 是否立即扣除能量（默认 true）
   */
  checkAndNavigate(url, mode, deductNow = true) {
    if (!playCount.canPlay()) {
      this.showNoCountModal();
      return;
    }

    // 如果需要立即扣除（挑战/歌曲模式）
    if (deductNow) {
      playCount.useCount();
      const remainingCount = playCount.getRemainingCount();
      this.setData({ remainingCount });
    }

    this.vibrateShort();
    this.setData({ selectedMode: mode });

    setTimeout(() => {
      wx.navigateTo({ url });
    }, 150);
  },

  /**
   * 显示能量不足弹窗
   */
  showNoCountModal() {
    this.setData({
      showShareModal: true,
      shareModalTitle: '能量不足',
      shareModalMessage: sharePrompt.ENERGY_SHARE_ONLY,
      shareModalCancelText: '取消'
    });
  },

  onShareModalCancel() {
    this.setData({ showShareModal: false });
  },

  onShareModalShare() {
    this.setData({ showShareModal: false });
  },

  /**
   * 点击 Practice 模式
   */
  onPracticeTap() {
    // 练习模式：只检查能量，进入具体关卡时才扣除
    this.checkAndNavigate('/page/level-select/level-select', 'practice', false);
  },

  /**
   * 点击 Challenge 模式
   */
  onChallengeTap() {
    this.checkAndNavigate('/page/challenge/challenge', 'challenge');
  },

  /**
   * 点击 Songs 模式
   */
  onSongsTap() {
    this.checkAndNavigate('/page/song/song', 'songs');
  },

  /**
   * 点击主页图标
   */
  onHomeTap() {
    this.vibrateShort();
  },

  /**
   * 点击 Profile 图标
   */
  onProfileTap() {
    this.vibrateShort();
    wx.redirectTo({
      url: '/page/profile/profile'
    });
  },

  /**
   * 点击音频测试
   */
  onAudioTestTap() {
    wx.navigateTo({
      url: '/page/audio-test/audio-test'
    });
  },

  /**
   * 短震动反馈
   */
  vibrateShort() {
    wx.vibrateShort({
      type: 'light'
    });
  },

  /**
   * 点击 Streak（简短版提示）
   */
  onStreakTap() {
    this.vibrateShort();
    wx.showModal({
      title: '连续练习',
      content: `连续练习 ${this.data.streak} 天！每天至少完成一次练习即可保持连续记录 🔥`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 点击能量（简短版提示）
   */
  onCountTap() {
    this.vibrateShort();
    wx.showModal({
      title: '剩余能量',
      content: `今日剩余 ${this.data.remainingCount} 点能量，分享给好友可获得额外 3 点 ⚡`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 分享到好友/群聊
   */
  onShareAppMessage() {
    return sharePrompt.getShareAppMessageReturn();
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    playCount.markPendingBonus();

    return {
      title: 'Chordiio：听和弦练习小程序',
      query: ''
    };
  }
});
