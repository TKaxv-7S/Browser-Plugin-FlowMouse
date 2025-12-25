chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'closeTab':
      if (sender.tab && sender.tab.id) {
        chrome.tabs.remove(sender.tab.id);
      }
      break;
    case 'restoreTab':
      chrome.sessions.restore(null, (restoredSession) => {
        if (chrome.runtime.lastError) {
        }
      });
      break;
    case 'openTab':
      if (request.url) {
        chrome.tabs.create({ url: request.url, active: true });
      } else {
        chrome.tabs.create({ active: true });
      }
      break;
    case 'newTab':
      chrome.tabs.create({ active: true });
      break;
    case 'closeOtherTabs':
      if (sender.tab) {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id !== sender.tab.id) {
              chrome.tabs.remove(tab.id);
            }
          });
        });
      }
      break;
    case 'closeRightTabs':
      if (sender.tab) {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          tabs.forEach(tab => {
            if (tab.index > sender.tab.index) {
              chrome.tabs.remove(tab.id);
            }
          });
        });
      }
      break;
    case 'closeAllTabs':
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        chrome.tabs.create({ active: true }, (newTab) => {
          tabs.forEach(tab => {
            chrome.tabs.remove(tab.id);
          });
        });
      });
      break;
    case 'switchLeftTab':
      if (sender.tab) {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          const currentIndex = sender.tab.index;
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          chrome.tabs.update(tabs[prevIndex].id, { active: true });
        });
      }
      break;
    case 'switchRightTab':
      if (sender.tab) {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          const currentIndex = sender.tab.index;
          const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          chrome.tabs.update(tabs[nextIndex].id, { active: true });
        });
      }
      break;
    case 'newWindow':
      chrome.windows.create({});
      break;
    case 'newIncognito':
      chrome.windows.create({ incognito: true });
      break;
    case 'addToBookmarks':
      if (sender.tab) {
        chrome.bookmarks.create({
          title: sender.tab.title,
          url: sender.tab.url
        });
      }
      break;
    case 'toggleFullscreen':
      chrome.windows.getCurrent((win) => {
        const newState = win.state === 'fullscreen' ? 'normal' : 'fullscreen';
        chrome.windows.update(win.id, { state: newState });
      });
      break;
  }
  return true;
});