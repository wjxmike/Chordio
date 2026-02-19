/**
 * 首页 + 启动页（合并）
 * 先显示启动页，字体加载完成后过渡到首页
 */

const app = getApp();

Page({
  data: {
    showSplash: true,    // 是否显示启动页
    fontsLoaded: false,  // 字体是否加载完成
    streak: 12,          // 连续练习天数
    selectedMode: null   // 当前选中的模式
  },

  onLoad() {
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
        this.setData({ showSplash: false });
        // 标记启动页已显示
        app.globalData.splashShown = true;
      }, remaining);
    });
  },

  /**
   * 加载所有字体，返回 Promise
   */
  loadFonts() {
    const fontPromises = [
      this.loadFont('Fredoka One', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/FredokaOne-Regular.ttf'),
      this.loadFont('江城圆体', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/JiangChengYuanTi-700W-subset.ttf'),
      this.loadFont('Protest Strike', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/ProtestStrike.ttf')
    ];
    return Promise.all(fontPromises);
  },

  onShow() {
    // 返回首页时重置选中状态
    this.setData({ selectedMode: null });
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
   * 点击 Practice 模式
   */
  onPracticeTap() {
    this.vibrateShort();
    this.setData({ selectedMode: 'practice' });

    setTimeout(() => {
      wx.navigateTo({
        url: '/page/level-select/level-select'
      });
    }, 150);
  },

  /**
   * 点击 Challenge 模式
   */
  onChallengeTap() {
    this.vibrateShort();
    this.setData({ selectedMode: 'challenge' });

    setTimeout(() => {
      wx.navigateTo({
        url: '/page/challenge/challenge'
      });
    }, 150);
  },

  /**
   * 点击 Songs 模式
   */
  onSongsTap() {
    this.vibrateShort();
    this.setData({ selectedMode: 'songs' });

    setTimeout(() => {
      wx.navigateTo({
        url: '/page/song/song'
      });
    }, 150);
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
  }
});
