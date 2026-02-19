/**
 * 首页 + 启动页（合并）
 * 先显示启动页，字体加载完成后过渡到首页
 */

Page({
  data: {
    showSplash: true,    // 是否显示启动页
    fontsLoaded: false,  // 字体是否加载完成
    streak: 12,          // 连续练习天数
    selectedMode: null   // 当前选中的模式
  },

  onLoad() {
    // 记录开始时间，确保启动页最少显示 2.5 秒（让动画完成）
    // 动画：0.4s延迟 + 0.6s动画 = 1s，加上一些缓冲时间
    const startTime = Date.now();
    const minDuration = 2500;

    // 并行加载所有字体
    const fontPromises = [
      this.loadFont('Fredoka One', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/FredokaOne-Regular.ttf'),
      this.loadFont('江城圆体', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets@ed749764/fonts/JiangChengYuanTi-700W.ttf'),
      this.loadFont('Protest Strike', 'https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/ProtestStrike.ttf')
    ];

    // 等待所有字体加载完成
    Promise.all(fontPromises).then(() => {
      console.log('所有字体加载完成');

      // 显示启动页文字（触发动画）
      this.setData({ fontsLoaded: true });

      // 计算还需要等待多久
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      // 等待剩余时间后切换到首页
      setTimeout(() => {
        this.setData({ showSplash: false });
      }, remaining);
    });

    // 从本地存储读取 streak
    this.loadStreak();
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
    wx.showToast({
      title: '即将上线',
      icon: 'none'
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
