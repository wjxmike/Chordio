/**
 * Profile 页面 - 个人中心
 */

const MONTHS_CN = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const playCount = require('../../utils/play-count');

Page({
  data: {
    userInfo: {
      avatarUrl: '/assets/images/default-avatar.svg',
      nickName: '音乐爱好者'
    },
    streak: 0,
    remainingCount: 5,  // 剩余能量
    monthNameCN: '',
    monthNameEN: '',
    calendarDays: [],  // [{day: 1, used: false}, ...]
    showLoginModal: false,  // 是否显示登录弹窗
    tempAvatarUrl: '',      // 临时头像
    tempNickName: ''        // 临时昵称
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
      source: 'url("https://cdn.jsdelivr.net/gh/wjxmike/chordio-assets/fonts/JiangChengYuanTi-700W-subset.ttf")',
      success: (res) => console.log('江城圆体 加载成功', res),
      fail: (err) => console.error('江城圆体 加载失败', err)
    });

    // 检查登录状态并获取用户信息
    this.checkLoginStatus();

    // 记录今天使用并更新 streak
    this.recordTodayUsage();

    // 加载日历数据
    this.loadCalendarData();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadStreakData();
    // 刷新剩余能量
    this.setData({ remainingCount: playCount.getRemainingCount() });
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.isLoggedIn) {
      // 已登录，显示用户信息
      this.setData({ userInfo });
    } else {
      // 未登录，显示登录弹窗
      this.setData({ showLoginModal: true });
    }
  },

  /**
   * 选择头像
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ tempAvatarUrl: avatarUrl });
  },

  /**
   * 输入昵称
   */
  onNicknameInput(e) {
    this.setData({ tempNickName: e.detail.value });
  },

  /**
   * 昵称输入框失焦（处理微信昵称键盘确认）
   */
  onNicknameBlur(e) {
    if (e.detail.value) {
      this.setData({ tempNickName: e.detail.value });
    }
  },

  /**
   * 确认登录
   */
  onConfirmLogin() {
    const { tempAvatarUrl, tempNickName } = this.data;

    if (!tempAvatarUrl) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      });
      return;
    }

    if (!tempNickName) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    const userInfo = {
      avatarUrl: tempAvatarUrl,
      nickName: tempNickName,
      isLoggedIn: true
    };

    this.setData({
      userInfo,
      showLoginModal: false,
      tempAvatarUrl: '',
      tempNickName: ''
    });

    wx.setStorageSync('userInfo', userInfo);
    wx.showToast({
      title: '设置成功',
      icon: 'success'
    });
  },

  /**
   * 记录今天使用并更新 streak
   */
  recordTodayUsage() {
    const today = this.formatDate(new Date());
    const usageData = wx.getStorageSync('usageData') || {
      lastUseDate: '',
      streak: 0,
      usedDates: []
    };

    // 如果今天还没记录
    if (usageData.lastUseDate !== today) {
      const yesterday = this.formatDate(new Date(Date.now() - 86400000));

      if (usageData.lastUseDate === yesterday) {
        // 连续使用
        usageData.streak += 1;
      } else if (usageData.lastUseDate === '') {
        // 首次使用
        usageData.streak = 1;
      } else {
        // 断了一天以上，重置
        usageData.streak = 1;
      }

      usageData.lastUseDate = today;
      usageData.usedDates.push(today);
      wx.setStorageSync('usageData', usageData);
    }

    this.setData({ streak: usageData.streak });

    // 同步到主页的 streak
    wx.setStorageSync('streak', usageData.streak);
  },

  /**
   * 加载 streak 数据
   */
  loadStreakData() {
    const usageData = wx.getStorageSync('usageData') || { streak: 0 };
    this.setData({ streak: usageData.streak });
  },

  /**
   * 加载日历数据
   */
  loadCalendarData() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // 设置月份名称
    this.setData({
      monthNameCN: MONTHS_CN[month],
      monthNameEN: MONTHS_EN[month]
    });

    // 获取当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 获取使用过的日期
    const usageData = wx.getStorageSync('usageData') || { usedDates: [] };
    const usedDatesSet = new Set(usageData.usedDates);

    // 生成日历数据
    const calendarDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.formatDate(new Date(year, month, day));
      calendarDays.push({
        day: day,
        used: usedDatesSet.has(dateStr)
      });
    }

    this.setData({ calendarDays });
  },

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 点击设置图标
   */
  onSettingsTap() {
    wx.vibrateShort({ type: 'light' });
    wx.navigateTo({
      url: '/page/settings/settings'
    });
  },

  /**
   * 点击首页按钮
   */
  onHomeTap() {
    wx.vibrateShort({ type: 'light' });
    wx.redirectTo({
      url: '/page/home/home'
    });
  },

  /**
   * 点击 Streak 卡片（详细版提示）
   */
  onStreakTap() {
    wx.vibrateShort({ type: 'light' });
    wx.showModal({
      title: '连续练习',
      content: `你已经连续练习 ${this.data.streak} 天了！\n\n每天完成至少一次练习就能延续你的记录。坚持就是胜利！`,
      showCancel: false,
      confirmText: '继续加油'
    });
  },

  /**
   * 点击能量卡片（详细版提示）
   */
  onCountTap() {
    wx.vibrateShort({ type: 'light' });
    wx.showModal({
      title: '剩余能量',
      content: `今日剩余 ${this.data.remainingCount} 点能量\n\n能量用完后，分享小程序给好友即可获得 3 点额外能量，每天可多次分享。`,
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
