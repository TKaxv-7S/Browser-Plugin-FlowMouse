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
		'→←': 'restoreTab',       
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
		'closeTabKeepWindow': 'actionCloseTabKeepWindow',
		'closeBrowser': 'actionCloseBrowser',
		'restoreTab': 'actionRestoreTab',
		'newTab': 'actionNewTab',
		'closeOtherTabs': 'actionCloseOtherTabs',
		'closeLeftTabs': 'actionCloseLeftTabs',
		'closeRightTabs': 'actionCloseRightTabs',
		'closeAllTabs': 'actionCloseAllTabs',
		'switchLeftTab': 'actionSwitchLeftTab',
		'switchRightTab': 'actionSwitchRightTab',
		'refresh': 'actionRefresh',
		'refreshAllTabs': 'actionRefreshAllTabs',
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
		...({
			'openDownloads': 'actionOpenDownloads',
			'openHistory': 'actionOpenHistory',
			'openExtensions': 'actionOpenExtensions',
		}),
		'printPage': 'actionPrintPage',
		'duplicateTab': 'actionDuplicateTab',
		'toggleMuteTab': 'actionToggleMuteTab',
		'toggleMuteAllTabs': 'actionToggleMuteAllTabs',
	};

	const SEARCH_ENGINES = {
		'system': {
			name: 'Browser Default',
			i18nKey: 'searchEngine_system'
		},
		'google': {
			name: 'Google',
			url: 'https://www.google.com/search?q='
		},
		'bing': {
			name: 'Bing',
			url: 'https://www.bing.com/search?q='
		},
		'baidu': {
			name: 'Baidu',
			i18nKey: 'searchEngine_baidu',
			url: 'https://www.baidu.com/s?wd='
		},
		'360': {
			name: '360 Search',
			i18nKey: 'searchEngine_360',
			url: 'https://www.so.com/s?q='
		},
		'duckduckgo': {
			name: 'DuckDuckGo',
			url: 'https://duckduckgo.com/?q='
		},
		'yahoo': {
			name: 'Yahoo!',
			url: 'https://search.yahoo.com/search?p='
		},
		'yahoo_jp': {
			name: 'Yahoo! JAPAN',
			url: 'https://search.yahoo.co.jp/search?p='
		},
		'yandex': {
			name: 'Yandex',
			i18nKey: 'searchEngine_yandex',
			url: 'https://yandex.com/search/?text='
		},
		'naver': {
			name: 'Naver',
			url: 'https://search.naver.com/search.naver?query='
		},
		'seznam': {
			name: 'Seznam',
			url: 'https://search.seznam.cz/?q='
		},
	};

	const SEARCH_ENGINE_ORDER = {
		'default': ['system', 'google', 'bing', 'duckduckgo', 'yahoo'],
		'en': ['system', 'google', 'bing', 'duckduckgo', 'yahoo', 'baidu', '360', 'yandex', 'naver', 'seznam', 'yahoo_jp'],
		'zh_CN': ['system', 'google', 'bing', 'baidu', '360', 'duckduckgo', 'yahoo'],

		'cs': ['system', 'google', 'seznam', 'bing', 'duckduckgo', 'yahoo'],
		'ja': ['system', 'google', 'yahoo_jp', 'bing', 'duckduckgo', 'yahoo'],
		'ko': ['system', 'google', 'naver', 'bing', 'duckduckgo', 'yahoo'],
		'uk': ['system', 'google', 'bing', 'duckduckgo', 'yahoo'],
		'ru': ['system', 'google', 'yandex', 'bing', 'duckduckgo', 'yahoo'],
	};

	const IMAGE_SEARCH_ENGINES = {
		'google': {
			name: 'Google Lens',
			url: 'https://lens.google.com/uploadbyurl?url='
		},
		'bing': {
			name: 'Bing',
			url: 'https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:'
		},
		'yandex': {
			name: 'Yandex',
			i18nKey: 'searchEngine_yandex',
			url: 'https://yandex.com/images/search?rpt=imageview&url='
		},
		'tineye': {
			name: 'TinEye',
			url: 'https://www.tineye.com/search?url='
		},
		'saucenao': {
			name: 'SauceNAO',
			url: 'https://saucenao.com/search.php?db=999&url='
		},
		'iqdb': {
			name: 'IQDB',
			url: 'https://iqdb.org/?url='
		},
		'trace': {
			name: 'Trace.moe',
			url: 'https://trace.moe/?url='
		}
	};

	const IMAGE_SEARCH_ENGINE_ORDER = {
		'default': ['google', 'bing', 'tineye', 'yandex', 'saucenao', 'iqdb', 'trace'],
		'uk': ['google', 'bing', 'tineye', 'saucenao', 'iqdb', 'trace'],
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
		'imageSearch': 'dragActionImageSearch'
	};

	const TAB_POSITIONS = {
		'right': 'tabPositionRight',
		'left': 'tabPositionLeft',
		'first': 'tabPositionFirst',
		'last': 'tabPositionLast',
		'current': 'tabPositionCurrent'
	};

	const DEFAULT_SETTINGS = {
		theme: 'auto',
		language: 'auto',
		enableGesture: true, 
		enableHUD: true,
		enableTrail: true,
		showTrailOrigin: true, 
		enableTrailSmooth: true, 
		searchEngine: 'system',
		customSearchUrl: '',
		gestures: DEFAULT_GESTURES,
		enableGestureCustomization: false,
		customGestures: {}, 
		customGestureUrls: {}, 
		enableAdvancedSettings: false, 
		scrollAmount: 75, 
		scrollSmoothness: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) ? 'system' : 'custom', 
		enableTextDrag: true,
		enableImageDrag: true,
		enableLinkDrag: true,
		autoDetectUrl: false,  
		preferLink: false,     
		textDragGestures: [
			{ direction: '→', action: 'search', engine: 'system', position: 'right', active: true, url: '' }
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
		distanceThreshold: 25,
		showRestrictedNotice: true, 
		blacklist: [],
		lastSyncTime: null
	};

	const ARROW_SVG = {
		'↑': '<svg xmlns="http://www.w3.org/2000/svg" width="0.85em" height="0.85em" fill="currentColor" viewBox="5 3.5 6 9" style="vertical-align:-0.125em; margin:0.05em; display:inline"><path fill-rule="evenodd" d="M 8 12 a 0.5 0.5 0 0 0 0.5 -0.5 V 5.707 L 10.646 7.854 a 0.5 0.5 0 0 0 0.708 -0.708 l -3 -3 a 0.5 0.5 0 0 0 -0.708 0 l -3 3 a 0.5 0.5 0 0 0 0.708 0.708 L 7.5 5.707 V 11.5 A 0.5 0.5 0 0 0 8 12"/></svg>',
		'↓': '<svg xmlns="http://www.w3.org/2000/svg" width="0.85em" height="0.85em" fill="currentColor" viewBox="5 3.5 6 9" style="vertical-align:-0.125em; margin:0.05em; display:inline"><path fill-rule="evenodd" d="M 8 4 a 0.5 0.5 0 0 1 0.5 0.5 v 5.793 L 10.646 8.146 a 0.5 0.5 0 0 1 0.708 0.708 l -3 3 a 0.5 0.5 0 0 1 -0.708 0 l -3 -3 a 0.5 0.5 0 0 1 0.708 -0.708 L 7.5 10.293 V 4.5 A 0.5 0.5 0 0 1 8 4"/></svg>',
		'←': '<svg xmlns="http://www.w3.org/2000/svg" width="0.85em" height="0.85em" fill="currentColor" viewBox="3.5 5 9 6" style="vertical-align:-0.125em; margin:0.05em; display:inline"><path fill-rule="evenodd" d="M 12 8 a 0.5 0.5 0 0 0 -0.5 -0.5 H 5.707 L 7.854 5.354 a 0.5 0.5 0 1 0 -0.708 -0.708 l -3 3 a 0.5 0.5 0 0 0 0 0.708 l 3 3 a 0.5 0.5 0 0 0 0.708 -0.708 L 5.707 8.5 H 11.5 A 0.5 0.5 0 0 0 12 8"/></svg>',
		'→': '<svg xmlns="http://www.w3.org/2000/svg" width="0.85em" height="0.85em" fill="currentColor" viewBox="3.5 5 9 6" style="vertical-align:-0.125em; margin:0.05em; display:inline"><path fill-rule="evenodd" d="M 4 8 a 0.5 0.5 0 0 1 0.5 -0.5 h 5.793 L 8.146 5.354 a 0.5 0.5 0 1 1 0.708 -0.708 l 3 3 a 0.5 0.5 0 0 1 0 0.708 l -3 3 a 0.5 0.5 0 0 1 -0.708 -0.708 L 10.293 8.5 H 4.5 A 0.5 0.5 0 0 1 4 8"/></svg>'
	};

	function arrowsToSvg(text) {
		return text.replace(/[↑↓←→]/g, match => ARROW_SVG[match] || match);
	}

	window.GestureConstants = {
		DEFAULT_GESTURES,
		ACTION_KEYS,
		SEARCH_ENGINES,
		SEARCH_ENGINE_ORDER,
		IMAGE_SEARCH_ENGINES,
		IMAGE_SEARCH_ENGINE_ORDER,
		TEXT_DRAG_ACTIONS,
		LINK_DRAG_ACTIONS,
		IMAGE_DRAG_ACTIONS,
		TAB_POSITIONS,
		DEFAULT_SETTINGS,
		ARROW_SVG,
		arrowsToSvg
	};
})();