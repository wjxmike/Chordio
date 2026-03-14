/**
 * 关卡选择页
 */

const playCount = require('../../utils/play-count');

Page({
  data: {
    levels: [
      {
        id: 'triads',
        level: 1,
        name: '三和弦',
        nameEn: 'Triads',
        unlocked: true,  // 第一关默认解锁
      },
      {
        id: 'sevenths',
        level: 2,
        name: '七和弦',
        nameEn: 'Seventh Chords',
        unlocked: false,
      },
      {
        id: 'chromatic',
        level: 3,
        name: '离调和弦',
        nameEn: 'Chromatic Chords',
        unlocked: false,
      }
    ]
  },

  onLoad() {
    // 加载字体
    wx.loadFontFace({
      family: 'Fredoka One',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/FredokaOne-Regular.ttf")',
      success: (res) => console.log('Fredoka One 加载成功', res),
      fail: (err) => console.error('Fredoka One 加载失败', err)
    });

    wx.loadFontFace({
      family: '江城圆体',
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/JiangChengYuanTi-700W-subset.woff2")',
      success: (res) => console.log('江城圆体 加载成功', res),
      fail: (err) => console.error('江城圆体 加载失败', err)
    });

    // 检查解锁状态
    this.checkUnlocked();
  },

  onShow() {
    // 每次显示时检查解锁状态
    this.checkUnlocked();
  },

  /**
   * 检查各关卡解锁状态
   */
  checkUnlocked() {
    const progress = wx.getStorageSync('levelProgress') || {
      triads: { completed: false, bestScore: 0 },
      sevenths: { completed: false, bestScore: 0 },
      chromatic: { completed: false, bestScore: 0 }
    };

    const levels = this.data.levels.map(level => {
      if (level.id === 'triads') {
        // 第一关永远解锁
        return { ...level, unlocked: true };
      } else if (level.id === 'sevenths') {
        // 第二关需要第一关 100% 正确
        return { ...level, unlocked: progress.triads?.completed && progress.triads?.bestScore === 100 };
      } else if (level.id === 'chromatic') {
        // 第三关需要第二关 100% 正确
        return { ...level, unlocked: progress.sevenths?.completed && progress.sevenths?.bestScore === 100 };
      }
      return level;
    });

    this.setData({ levels });
  },

  /**
   * 点击关卡卡片
   */
  onLevelTap(e) {
    const { id, unlocked } = e.currentTarget.dataset;

    this.vibrateShort();

    if (!unlocked) {
      wx.showToast({
        title: '请先完成上一关',
        icon: 'none'
      });
      return;
    }

    // 检查并扣除能量
    if (!playCount.canPlay()) {
      wx.showModal({
        title: '能量不足',
        content: '今日免费能量已用完，分享给好友可获得额外3点能量',
        confirmText: '去分享',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
      return;
    }

    // 扣除能量
    playCount.useCount();

    // 跳转到练习页，传递关卡参数
    wx.navigateTo({
      url: `/page/practice/practice?level=${id}`
    });
  },

  /**
   * 返回首页
   */
  onBackTap() {
    this.vibrateShort();
    wx.navigateBack();
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
