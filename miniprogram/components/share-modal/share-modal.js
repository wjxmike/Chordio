Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '能量不足'
    },
    message: {
      type: String,
      value: ''
    },
    cancelText: {
      type: String,
      value: '取消'
    },
    shareText: {
      type: String,
      value: '分享给好友'
    }
  },

  methods: {
    onBackdropTap() {
      this.triggerEvent('cancel');
    },

    onCancelTap() {
      this.triggerEvent('cancel');
    },

    onShareTap() {
      this.triggerEvent('share');
    }
  }
});
