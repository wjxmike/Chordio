/**
 * Settings 页面 - 关于/设置
 */

Page({
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
  },

  /**
   * 点击返回按钮
   */
  onBackTap() {
    wx.vibrateShort({ type: 'light' });
    wx.navigateBack();
  }
});
