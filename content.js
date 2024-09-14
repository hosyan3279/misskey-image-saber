console.log('Misskey Image Saver: Content script loaded');

function getPostId(element) {
  // 現在の要素から親要素に遡って投稿IDを探す
  while (element && element !== document.body) {
    // data-note-id 属性をチェック
    if (element.dataset && element.dataset.noteId) {
      return element.dataset.noteId;
    }
    // note-id 属性をチェック
    if (element.getAttribute('note-id')) {
      return element.getAttribute('note-id');
    }
    // articleタグ内のdata-id属性をチェック
    if (element.tagName === 'ARTICLE' && element.getAttribute('data-id')) {
      return element.getAttribute('data-id');
    }
    // 特定のクラス名を持つ要素内のdata-id属性をチェック
    const idElement = element.querySelector('.xnU59.xesxE');
    if (idElement && idElement.getAttribute('data-id')) {
      return idElement.getAttribute('data-id');
    }
    element = element.parentElement;
  }
  return null;
}

function hasMediaContent(article) {
  // 画像や動画を含む要素をチェック
  const mediaElements = article.querySelectorAll('.xbIzI .xnU59.xesxE.image, .xbIzI .xnU59.xesxE.video, .xbIzI img.xkJBF, .xbIzI video');
  return mediaElements.length > 0;
}

function addSaveButton(article) {
  console.log('Checking article for media content:', article);

  if (!hasMediaContent(article)) {
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

  // 投稿IDを取得
  const postId = getPostId(article);
  if (!postId) {
    console.error('Unable to find post ID for this article', article);
    console.log('Article HTML:', article.outerHTML);
    return;
  }

  console.log('Found post ID:', postId);

  const saveButton = document.createElement('button');
  saveButton.className = 'xviCy _button save-images-button';
  saveButton.innerHTML = '<i class="ti ti-download"></i>';
  saveButton.title = 'メディアを保存';
  saveButton.dataset.postId = postId;

  // 保存状態を確認
  chrome.runtime.sendMessage({action: "checkSavedStatus", postId: postId}, (response) => {
    if (response && response.isSaved) {
      updateButtonState(saveButton, 'completed');
    }
  });

  saveButton.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Save button clicked for post ID:', postId);

    saveButton.classList.add('saving');

    const mediaElements = article.querySelectorAll('.xbIzI .xnU59.xesxE.image img.xkJBF, .xbIzI .xnU59.xesxE.video video');
    const usernameElement = article.querySelector('.xBLVI > span > span');
    const username = usernameElement ? usernameElement.textContent.replace('@', '') : 'unknown';
    console.log('Username found:', username);
    console.log('Found', mediaElements.length, 'media elements');

    let downloadCount = 0;
    const totalFiles = mediaElements.length;

    mediaElements.forEach((media) => {
      const src = media.tagName === 'VIDEO' ? media.src : media.src;
      const originalFilename = src.split('/').pop().split('?')[0];
      const newFilename = `${username}_${originalFilename}`;
      console.log('Sending download message for:', src, 'with filename:', newFilename);
      chrome.runtime.sendMessage({
        action: "download",
        url: src,
        filename: newFilename,
        postId: postId
      }, (response) => {
        if (response && response.success) {
          downloadCount++;
          updateButtonState(saveButton, 'downloading', totalFiles, downloadCount);
          
          if (downloadCount === totalFiles) {
            setTimeout(() => {
              updateButtonState(saveButton, 'completed', totalFiles, downloadCount);
            }, 1000);
          }
        }
      });
    });

    setTimeout(() => {
      saveButton.classList.remove('saving');
    }, 1000);
  };

  const moreButton = footer.querySelector('button:last-child');
  if (moreButton) {
    footer.insertBefore(saveButton, moreButton);
    console.log('Save button added successfully for post ID:', postId);
  } else {
    console.log('More button not found, appending save button to footer for post ID:', postId);
    footer.appendChild(saveButton);
  }
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
function updateButtonState(button, state, totalFiles, downloadedFiles) {
  switch(state) {
    case 'downloading':
      button.innerHTML = `<i class="ti ti-loader"></i> ${downloadedFiles}/${totalFiles}`;
      button.title = `${downloadedFiles}/${totalFiles} ファイルをダウンロード中...`;
      button.classList.add('downloading');
      button.classList.remove('completed');
      break;
    case 'completed':
      button.innerHTML = '<i class="ti ti-check"></i>';
      button.title = '保存済み';
      button.classList.remove('downloading');
      button.classList.add('completed');
      button.disabled = true;
      break;
  }
}

// 既存の投稿に対してボタンを追加
function addSaveButtonsToExistingPosts() {
  const articles = document.querySelectorAll('.x5yeR:not(:has(.save-images-button))');
  articles.forEach(addSaveButton);
}

// MutationObserver を使用して新しい投稿を監視
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const articles = node.querySelectorAll('.x5yeR');
          articles.forEach(addSaveButton);
        }
      });
    }
  });
});

// 監視を開始
observer.observe(document.body, { childList: true, subtree: true });

// 初期化時に既存の投稿にボタンを追加
function addSaveButtonsToExistingPosts() {
  const articles = document.querySelectorAll('.x5yeR:not(:has(.save-images-button))');
  articles.forEach(addSaveButton);
}

// ページ読み込み完了時に実行
window.addEventListener('load', () => {
  addSaveButtonsToExistingPosts();
});

// 定期的にボタンの追加を確認（念のため）
setInterval(addSaveButtonsToExistingPosts, 5000);