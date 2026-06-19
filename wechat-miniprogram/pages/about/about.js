const app = getApp();

function copy(text) {
  wx.setClipboardData({
    data: text
  });
}

Page({
  copyPikafishUrl() {
    copy("https://github.com/official-pikafish/Pikafish");
  },

  copySourceUrl() {
    copy("https://github.com/qq978262947/-_-");
  },

  copyServiceUrl() {
    copy(app.globalData.serviceUrl);
  }
});
