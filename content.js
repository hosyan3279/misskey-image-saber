// content.js
console.log('Misskey Image Saver: Content script loaded');

function addSaveButton(article) {
  console.log('Checking article for media content:', article);

  // メディアコンテンツ（画像、動画、GIF）の有無を確認
  const hasMediaContent = article.querySelector('.xbIzI .xnU59.xesxE.image, .xbIzI .xnU59.xesxE.video');
  
  if (!hasMediaContent) {
    console.log('No media content found in this article, skipping button addition');
    return;
  }

  const footer = article.querySelector('footer.xhAPG');
  if (!footer) {
    console.log('Footer not found in article');
    return;
  }

  if (footer.querySelector('.save-images-button')) {
    console.log('Save button already exists');
    return;
  }

  const saveButton = document.createElement('button');
  saveButton.className = 'xviCy _button save-images-button';
  saveButton.innerHTML = '<i class="ti ti-download"></i>';
  saveButton.title = 'メディアを保存';
  saveButton.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Save button clicked');
    
    // ボタンの状態を「ダウンロード中」に変更
    saveButton.classList.add('downloading');
    saveButton.innerHTML = '<i class="ti ti-loader"></i>';

    const mediaElements = article.querySelectorAll('.xbIzI .xnU59.xesxE.image img.xkJBF, .xbIzI .xnU59.xesxE.video video');
    const usernameElement = article.querySelector('.xBLVI > span > span');
    const username = usernameElement ? usernameElement.textContent.replace('@', '') : 'unknown';
    console.log('Username found:', username);
    console.log('Found', mediaElements.length, 'media elements');
    
    let downloadCount = 0;
    mediaElements.forEach((media) => {
      const src = media.tagName === 'VIDEO' ? media.src : media.src;
      const originalFilename = src.split('/').pop().split('?')[0];
      const newFilename = `${username}_${originalFilename}`;
      console.log('Sending download message for:', src, 'with filename:', newFilename);
      chrome.runtime.sendMessage({
        action: "download",
        url: src,
        filename: newFilename
      }, (response) => {
        if (response && response.success) {
          downloadCount++;
          if (downloadCount === mediaElements.length) {
            // すべてのダウンロードが完了したら、ボタンの状態を「完了」に変更
            saveButton.classList.remove('downloading');
            saveButton.classList.add('completed');
            saveButton.innerHTML = '<i class="ti ti-check"></i>';
            
            // 3秒後にボタンを元の状態に戻す
            setTimeout(() => {
              saveButton.classList.remove('completed');
              saveButton.innerHTML = '<i class="ti ti-download"></i>';
            }, 3000);
          }
        }
      });
    });
  };
  // ボタンを '...' ボタンの前に挿入
  const moreButton = footer.querySelector('button:last-child');
  if (moreButton) {
    footer.insertBefore(saveButton, moreButton);
    console.log('Save button added successfully');
  } else {
    console.log('More button not found, appending save button to footer');
    footer.appendChild(saveButton);
  }
}

function addContextMenu() {
  document.addEventListener('contextmenu', function(e) {
    const target = e.target;
    if (target.tagName === 'IMG' && target.classList.contains('xkJBF')) {
      const article = target.closest('.x5yeR');
      if (article) {
        const usernameElement = article.querySelector('.xBLVI > span > span');
        const username = usernameElement ? usernameElement.textContent.replace('@', '') : 'unknown';
        target.dataset.username = username;
      }
      chrome.runtime.sendMessage({
        action: "updateContextMenu",
        imageUrl: target.src,
        username: target.dataset.username
      });
    }
  }, true);
}

function observeDOM() {
  console.log('Starting DOM observation');
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.classList.contains('x5yeR')) {
            console.log('New article detected:', node);
            addSaveButton(node);
          } else {
            const articles = node.querySelectorAll('.x5yeR');
            articles.forEach(article => {
              console.log('New article found within added node:', article);
              addSaveButton(article);
            });
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function initialize() {
  console.log('Initializing Misskey Image Saver');
  const articles = document.querySelectorAll('.x5yeR');
  console.log('Found', articles.length, 'existing articles');
  articles.forEach(addSaveButton);
  addContextMenu();
  observeDOM();
}

function addContextMenu() {
  document.addEventListener('contextmenu', function(e) {
    const target = e.target;
    if (target.tagName === 'IMG' && target.classList.contains('xkJBF')) {
      // デフォルトの動作を阻止しない
      chrome.runtime.sendMessage({
        action: "createContextMenu",
        imageUrl: target.src
      });
    }
  }, true);
}

// Misskeyの動的ロードを考慮して、少し遅延させて初期化を行う
setTimeout(initialize, 1000);

// 定期的にボタンの追加を試みる
setInterval(() => {
  console.log('Periodic check for new articles');
  const articles = document.querySelectorAll('.x5yeR:not(:has(.save-images-button))');
  articles.forEach(addSaveButton);
}, 5000);