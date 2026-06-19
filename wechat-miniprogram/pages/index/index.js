const app = getApp();

Page({
  data: {
    serviceUrl: "",
    showFallback: false
  },

  onLoad() {
    this.setData({
      serviceUrl: app.globalData.serviceUrl
    });
  },

  handleWebLoad() {
    this.setData({
      showFallback: false
    });
  },

  handleWebError() {
    this.setData({
      showFallback: true
    });
  },

  copyUrl() {
    wx.setClipboardData({
      data: app.globalData.serviceUrl
    });
  }
});
