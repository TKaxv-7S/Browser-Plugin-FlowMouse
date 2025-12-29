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
      if (sender.tab) {
        if (request.url) {
          chrome.tabs.create({
            url: request.url,
            active: true,
            index: sender.tab.index + 1,
            openerTabId: sender.tab.id
          });
        } else {
          chrome.tabs.create({
            active: true,
            index: sender.tab.index + 1,
            openerTabId: sender.tab.id
          });
        }
      } else {
        if (request.url) {
          chrome.tabs.create({ url: request.url, active: true });
        } else {
          chrome.tabs.create({ active: true });
        }
      }
      break;

    case 'newTab':
      chrome.tabs.create({ active: true });
      break;

    case 'openTabAtPosition':
      if (sender.tab) {
        const position = request.position || 'right';
        const active = request.active !== false;

        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          let newIndex;
          switch (position) {
            case 'left':
              newIndex = sender.tab.index;
              break;
            case 'first':
              newIndex = 0;
              break;
            case 'last':
              newIndex = tabs.length;
              break;
            case 'right':
            default:
              newIndex = sender.tab.index + 1;
              break;
          }

          chrome.tabs.create({
            url: request.url,
            active: active,
            index: newIndex,
            openerTabId: sender.tab.id
          });
        });
      } else {
        chrome.tabs.create({ url: request.url, active: request.active !== false });
      }
      break;

    case 'saveImage':
      if (request.url) {
        chrome.downloads.download({
          url: request.url,
          saveAs: false
        });
      }
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

    case 'toggleMaximize':
      chrome.windows.getCurrent((win) => {
        const newState = win.state === 'maximized' ? 'normal' : 'maximized';
        chrome.windows.update(win.id, { state: newState });
      });
      break;

    case 'minimize':
      chrome.windows.getCurrent((win) => {
        chrome.windows.update(win.id, { state: 'minimized' });
      });
      break;

    case 'openCustomUrl':
      chrome.storage.sync.get(['customGestureUrls'], (items) => {
        const urls = items.customGestureUrls || {};
        let url = urls[request.pattern];
        if (url) {
          const protocolRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

          url = url.trim();

          if (!protocolRegex.test(url)) {
            url = 'http://' + url;
          }

          chrome.tabs.create({ url: url, active: true });
        }
      });
      break;

    case 'openDownloads':
      chrome.tabs.create({ url: 'chrome://downloads', active: true });
      break;

    case 'openHistory':
      chrome.tabs.create({ url: 'chrome://history', active: true });
      break;

    case 'openExtensions':
      chrome.tabs.create({ url: 'chrome://extensions', active: true });
      break;

    case 'duplicateTab':
      if (sender.tab && sender.tab.id) {
        chrome.tabs.duplicate(sender.tab.id);
      }
      break;
  }

  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update' && details.previousVersion) {
    if (details.previousVersion.startsWith('1.0')) {
      chrome.storage.sync.get(['enableGestureCustomization'], (items) => {
        if (!items.enableGestureCustomization) {
          chrome.storage.sync.remove('gestures');
        }
      });
    }
  }
});