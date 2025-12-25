(function () {
    'use strict';
    const DEFAULT_GESTURES = {
        '←': 'back',
        '→': 'forward',
        '↑': 'scrollUp',
        '↓': 'scrollDown',
        '↓→': 'closeTab',
        '←↑': 'switchLeftTab',
        '→↑': 'newTab',
        '→↓': 'refresh',
        '↑←': 'scrollToTop',
        '↑→': 'scrollToBottom',
        '↓←': 'closeOtherTabs',
        '←↓': 'newWindow',
        '↑↓': 'closeRightTabs',
        '↓↑': 'closeAllTabs',
        '←→': 'switchRightTab',
        '→←': 'restoreTab'
    };
    const ACTION_KEYS = {
        'none': 'actionNone',
        'back': 'actionBack',
        'forward': 'actionForward',
        'scrollUp': 'actionScrollUp',
        'scrollDown': 'actionScrollDown',
        'scrollToTop': 'actionScrollToTop',
        'scrollToBottom': 'actionScrollToBottom',
        'closeTab': 'actionCloseTab',
        'restoreTab': 'actionRestoreTab',
        'newTab': 'actionNewTab',
        'closeOtherTabs': 'actionCloseOtherTabs',
        'closeRightTabs': 'actionCloseRightTabs',
        'closeAllTabs': 'actionCloseAllTabs',
        'switchLeftTab': 'actionSwitchLeftTab',
        'switchRightTab': 'actionSwitchRightTab',
        'refresh': 'actionRefresh',
        'stopLoading': 'actionStopLoading',
        'newWindow': 'actionNewWindow',
        'newIncognito': 'actionNewIncognito',
        'addToBookmarks': 'actionAddToBookmarks',
        'toggleFullscreen': 'actionToggleFullscreen'
    };
    const SEARCH_ENGINES = {
        'google': 'https://www.google.com/search?q=',
        'bing': 'https://www.bing.com/search?q=',
        'baidu': 'https://www.baidu.com/s?wd=',
        '360': 'https://www.so.com/s?q='
    };
    const DEFAULT_SETTINGS = {
        theme: 'auto',
        language: 'auto',
        enableHUD: true,
        enableTrail: true,
        searchEngine: 'google',
        customSearchUrl: '',
        gestures: DEFAULT_GESTURES,
        enableGestureCustomization: false,
        enableTextDrag: true,
        enableImageDrag: true,
        enableLinkDrag: true,
        hudBgColor: '#000000',
        hudBgOpacity: 70,
        hudTextColor: '#ffffff',
        trailColor: '#4285f4',
        trailWidth: 5,
        blacklist: [],
        lastSyncTime: null
    };
    window.GestureConstants = {
        DEFAULT_GESTURES,
        ACTION_KEYS,
        SEARCH_ENGINES,
        DEFAULT_SETTINGS
    };
})();
