chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveImage",
    title: "この画像を保存",
    contexts: ["image"],
    documentUrlPatterns: ["https://misskey.io/*"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveImage") {
    const url = new URL(info.srcUrl);
    const originalFilename = url.pathname.split('/').pop();
    chrome.downloads.download({
      url: info.srcUrl,
      filename: originalFilename
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "download") {
    console.log('Received download request:', request);
    chrome.downloads.download({
      url: request.url,
      filename: request.filename
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
      } else {
        console.log('Download started with ID:', downloadId);
      }
    });
  }
});