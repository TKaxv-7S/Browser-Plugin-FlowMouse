(function () {
    'use strict';

    const DEFAULT_GESTURES = {
        '←': 'back',
        '→': 'forward',
        '↑': 'scrollUp',
        '↓': 'scrollDown',
        '↓→': 'closeTab',
        '←↑': 'restoreTab',
        '→↑': 'newTab',
        '→↓': 'refresh',
        '↑←': 'switchLeftTab',
        '↑→': 'switchRightTab',
        '↓←': 'stopLoading',
        '←↓': 'closeAllTabs',
        '↑↓': 'scrollToBottom',
        '↓↑': 'scrollToTop',
        '←→': 'closeTab',
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
        'toggleFullscreen': 'actionToggleFullscreen',
        'toggleMaximize': 'actionToggleMaximize',
        'minimize': 'actionMinimize',
        'openCustomUrl': 'actionOpenCustomUrl',
        'copyUrl': 'actionCopyUrl',
        'copyTitle': 'actionCopyTitle',
        'openDownloads': 'actionOpenDownloads',
        'openHistory': 'actionOpenHistory',
        'openExtensions': 'actionOpenExtensions',
        'printPage': 'actionPrintPage',
        'duplicateTab': 'actionDuplicateTab'
    };

    const SEARCH_ENGINES = {
        'google': 'https://www.google.com/search?q=',
        'bing': 'https://www.bing.com/search?q=',
        'baidu': 'https://www.baidu.com/s?wd=',
        '360': 'https://www.so.com/s?q='
    };

    const TEXT_DRAG_ACTIONS = {
        'none': 'dragActionNone',
        'search': 'dragActionSearch',
        'copy': 'dragActionCopy'
    };

    const LINK_DRAG_ACTIONS = {
        'none': 'dragActionNone',
        'openTab': 'dragActionOpenTabLink',
        'copyLink': 'dragActionCopyLink'
    };

    const IMAGE_DRAG_ACTIONS = {
        'none': 'dragActionNone',
        'openTab': 'dragActionOpenTabImage',
        'saveImage': 'dragActionSaveImage',
        'copyImageUrl': 'dragActionCopyImageUrl',
        'customSearch': 'dragActionCustomSearch'
    };

    const TAB_POSITIONS = {
        'right': 'tabPositionRight',
        'left': 'tabPositionLeft',
        'first': 'tabPositionFirst',
        'last': 'tabPositionLast'
    };

    const DEFAULT_SETTINGS = {
        theme: 'auto',
        language: 'auto',
        enableGesture: true,
        enableHUD: true,
        enableTrail: true,
        showTrailOrigin: true,
        searchEngine: 'google',
        customSearchUrl: '',
        gestures: DEFAULT_GESTURES,
        enableGestureCustomization: false,
        customGestures: {},
        customGestureUrls: {},
        enableAdvancedSettings: false,
        scrollAmount: 75,
        enableTextDrag: true,
        enableImageDrag: true,
        enableLinkDrag: true,
        textDragGestures: [
            { direction: '→', action: 'search', engine: 'google', position: 'right', active: true, url: '' }
        ],
        linkDragGestures: [
            { direction: '→', action: 'openTab', position: 'right', active: true }
        ],
        imageDragGestures: [
            { direction: '→', action: 'openTab', position: 'right', active: true, url: '' }
        ],
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
        TEXT_DRAG_ACTIONS,
        LINK_DRAG_ACTIONS,
        IMAGE_DRAG_ACTIONS,
        TAB_POSITIONS,
        DEFAULT_SETTINGS
    };
})();
