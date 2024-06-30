let currentImageInfo = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveImage",
    title: "この画像を保存",
    contexts: ["image"],
    documentUrlPatterns: ["https://misskey.io/*"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveImage" && currentImageInfo) {
    const url = new URL(currentImageInfo.imageUrl);
    const originalFilename = url.pathname.split('/').pop();
    const newFilename = `${currentImageInfo.username}_${originalFilename}`;
    chrome.downloads.download({
      url: currentImageInfo.imageUrl,
      filename: newFilename
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateContextMenu") {
    currentImageInfo = {
      imageUrl: request.imageUrl,
      username: request.username
    };
  } else if (request.action === "download") {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        sendResponse({success: false});
      } else {
        console.log('Download started with ID:', downloadId);
        sendResponse({success: true});
      }
    });
    return true; // 非同期レスポンスを示す
  }
});