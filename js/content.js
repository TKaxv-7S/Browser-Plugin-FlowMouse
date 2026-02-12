(function () {
	'use strict';


	const currentDomain = location.hostname;
	
	let isBlacklisted = false;
	let initGesturesCalled = false;

	try {
		if (chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get({ blacklist: [] }, (items) => {
				if (chrome.runtime.lastError) return; 
				isBlacklisted = items.blacklist.includes(currentDomain);
				if (!isBlacklisted) {
					initGestures();
				}
			});
		} else {
			initGestures();
		}
	} catch (e) {
		initGestures();
	}

	try {
		if (chrome.storage && chrome.storage.onChanged) {
			chrome.storage.onChanged.addListener((changes, namespace) => {
				if (namespace === 'sync') {
					if (changes.blacklist) {
						const oldBlacklist = changes.blacklist.oldValue || [];
						const newBlacklist = changes.blacklist.newValue || [];
						const wasBlacklisted = oldBlacklist.includes(currentDomain);
						const nowBlacklisted = newBlacklist.includes(currentDomain);

						if (wasBlacklisted !== nowBlacklisted) {
							isBlacklisted = nowBlacklisted;
							if (nowBlacklisted === false && !initGesturesCalled) {
								initGestures();
							}
						}
					}
				}
			});
		}
	} catch (e) {
	}


	function initGestures() {
		initGesturesCalled = true;
		const { DEFAULT_GESTURES, SEARCH_ENGINES, DEFAULT_SETTINGS } = window.GestureConstants;

		const CONFIG = {
			DISTANCE_THRESHOLD: DEFAULT_SETTINGS.distanceThreshold,
			SCROLL_AMOUNT: window.innerHeight * 0.75
		};

		const recognizer = new window.GestureRecognizer({
			distanceThreshold: CONFIG.DISTANCE_THRESHOLD
		});

		let isIframe = false;
		try {
			isIframe = window.self !== window.top;
		} catch (e) {
			isIframe = true;
		}

		let i18nMessages = null;
		function msg(key, defaultText) {
			if (i18nMessages && i18nMessages[key]) {
				return i18nMessages[key].message;
			}
			return chrome.i18n.getMessage(key) || defaultText;
		}

		function safeSendMessage(message) {
			try {
				if (chrome.runtime && chrome.runtime.sendMessage) {
					chrome.runtime.sendMessage(message).catch(() => { });
				}
			} catch (e) {
			}
		}

		let ACTION_DEFINITIONS = {};

		function updateDefinitions() {
			ACTION_DEFINITIONS = {
				'none': { name: msg('actionNone', '无操作'), type: 'local' },
				'back': { name: msg('actionBack', '返回'), type: 'background' },
				'forward': { name: msg('actionForward', '前进'), type: 'background' },
				'scrollUp': { name: msg('actionScrollUp', '向上滚动'), type: 'local' },
				'scrollDown': { name: msg('actionScrollDown', '向下滚动'), type: 'local' },
				'scrollToTop': { name: msg('actionScrollToTop', '滚动到顶部'), type: 'local' },
				'scrollToBottom': { name: msg('actionScrollToBottom', '滚动到底部'), type: 'local' },
				'closeTab': { name: msg('actionCloseTab', '关闭标签页'), type: 'background' },
				'closeTabKeepWindow': { name: msg('actionCloseTabKeepWindow', '关闭标签页(保留窗口)'), type: 'background' },
				'closeBrowser': { name: msg('actionCloseBrowser', '关闭浏览器'), type: 'background' },
				'restoreTab': { name: msg('actionRestoreTab', '恢复标签页'), type: 'background' },
				'newTab': { name: msg('actionNewTab', '打开新标签页'), type: 'background' },
				'closeOtherTabs': { name: msg('actionCloseOtherTabs', '关闭其他标签页'), type: 'background' },
				'closeLeftTabs': { name: msg('actionCloseLeftTabs', '关闭左侧标签页'), type: 'background' },
				'closeRightTabs': { name: msg('actionCloseRightTabs', '关闭右侧标签页'), type: 'background' },
				'closeAllTabs': { name: msg('actionCloseAllTabs', '关闭所有标签页'), type: 'background' },
				'switchLeftTab': { name: msg('actionSwitchLeftTab', '切换到左侧标签页'), type: 'background' },
				'switchRightTab': { name: msg('actionSwitchRightTab', '切换到右侧标签页'), type: 'background' },
				'refresh': { name: msg('actionRefresh', '刷新当前标签页'), type: 'background' },
				'refreshAllTabs': { name: msg('actionRefreshAllTabs', '刷新所有标签页'), type: 'background' },
				'stopLoading': { name: msg('actionStopLoading', '停止加载'), type: 'local' },
				'newWindow': { name: msg('actionNewWindow', '新建窗口'), type: 'background' },
				'newIncognito': { name: msg('actionNewIncognito', '新建无痕窗口'), type: 'background' },
				'addToBookmarks': { name: msg('actionAddToBookmarks', '添加到收藏夹'), type: 'background' },
				'toggleFullscreen': { name: msg('actionToggleFullscreen', '切换全屏'), type: 'background' },
				'toggleMaximize': { name: msg('actionToggleMaximize', '窗口最大化/还原'), type: 'background' },
				'minimize': { name: msg('actionMinimize', '窗口最小化'), type: 'background' },
				'openCustomUrl': { name: msg('actionOpenCustomUrl', '打开自定义网址'), type: 'background' },
				'copyUrl': { name: msg('actionCopyUrl', '复制当前网址'), type: 'local' },
				'copyTitle': { name: msg('actionCopyTitle', '复制页面标题'), type: 'local' },
				...({
					'openDownloads': { name: msg('actionOpenDownloads', '打开下载页面'), type: 'background' },
					'openHistory': { name: msg('actionOpenHistory', '打开历史记录'), type: 'background' },
					'openExtensions': { name: msg('actionOpenExtensions', '打开扩展管理'), type: 'background' },
				}),
				'printPage': { name: msg('actionPrintPage', '打印页面'), type: 'local' },
				'duplicateTab': { name: msg('actionDuplicateTab', '复制当前标签页'), type: 'background' },
				'toggleMuteTab': { name: msg('actionToggleMuteTab', '静音/取消静音当前标签页'), type: 'background' },
				'toggleMuteAllTabs': { name: msg('actionToggleMuteAllTabs', '静音/取消静音全部标签页'), type: 'background' },
			};
		}

		function getDragHint(type, pattern) {
			if (!SETTINGS.enableAdvancedSettings) {
				if (pattern !== '→') return ''; 
				const basicHints = {
					'text': '→ ' + msg('dragActionSearch', '🔍 搜索引擎'),
					'link': '→ ' + msg('dragActionOpenTabLink', '🔗 打开链接'),
					'image': '→ ' + msg('dragActionOpenTabImage', '🖼️ 打开图片')
				};
				return basicHints[type] || '';
			}


			const getAction = (gestures) => {
				if (Array.isArray(gestures)) {
					const found = gestures.find(g => g.direction === pattern);
					return found ? (found.action || 'none') : 'none';
				}
				const cfg = gestures?.[pattern];
				if (typeof cfg === 'object' && cfg !== null) {
					return cfg.action || 'none';
				}
				return cfg || 'none';
			};

			let action = 'none';
			if (type === 'text') {
				action = getAction(SETTINGS.textDragGestures);
			} else if (type === 'link') {
				action = getAction(SETTINGS.linkDragGestures);
			} else if (type === 'image') {
				action = getAction(SETTINGS.imageDragGestures);
			}

			let actionHint = '';
			if (action === 'openTab') {
				if (type === 'link') {
					actionHint = msg('dragActionOpenTabLink', '🔗 打开链接');
				} else if (type === 'image') {
					actionHint = msg('dragActionOpenTabImage', '🖼️ 打开图片');
				} else {
					actionHint = msg('dragActionOpenTab', '📑 新标签页打开');
				}
			} else {
				const actionNames = {
					'search': msg('dragActionSearch', '🔍 搜索引擎'),
					'copy': msg('dragActionCopy', '📋 复制'),
					'copyLink': msg('dragActionCopyLink', '🔗 复制链接'),
					'saveImage': msg('dragActionSaveImage', '💾 保存图片'),
					'copyImageUrl': msg('dragActionCopyImageUrl', '📋 复制图片地址'),
					'imageSearch': msg('dragActionImageSearch', '🔍 图片搜索'),
					'none': ''
				};
				actionHint = actionNames[action] || '';
			}
			return actionHint ? `${pattern} ${actionHint}` : '';
		}

		let SETTINGS = {
			enableGesture: DEFAULT_SETTINGS.enableGesture,
			enableHUD: DEFAULT_SETTINGS.enableHUD,
			enableTrail: DEFAULT_SETTINGS.enableTrail,
			showTrailOrigin: DEFAULT_SETTINGS.showTrailOrigin,
			enableTrailSmooth: DEFAULT_SETTINGS.enableTrailSmooth,
			searchEngine: DEFAULT_SETTINGS.searchEngine,
			customSearchUrl: DEFAULT_SETTINGS.customSearchUrl,
			gestures: { ...DEFAULT_GESTURES },
			customGestures: {}, 
			enableGestureCustomization: DEFAULT_SETTINGS.enableGestureCustomization,
			enableAdvancedSettings: DEFAULT_SETTINGS.enableAdvancedSettings,
			scrollAmount: DEFAULT_SETTINGS.scrollAmount,
			distanceThreshold: DEFAULT_SETTINGS.distanceThreshold,
			scrollSmoothness: DEFAULT_SETTINGS.scrollSmoothness,
			enableTextDrag: DEFAULT_SETTINGS.enableTextDrag,
			enableImageDrag: DEFAULT_SETTINGS.enableImageDrag,
			enableLinkDrag: DEFAULT_SETTINGS.enableLinkDrag,
			enableDrag: DEFAULT_SETTINGS.enableTextDrag || DEFAULT_SETTINGS.enableImageDrag || DEFAULT_SETTINGS.enableLinkDrag, 
			hudBgColor: DEFAULT_SETTINGS.hudBgColor,
			hudBgOpacity: DEFAULT_SETTINGS.hudBgOpacity,
			hudTextColor: DEFAULT_SETTINGS.hudTextColor,
			trailColor: DEFAULT_SETTINGS.trailColor,
			trailWidth: DEFAULT_SETTINGS.trailWidth,
			newTabPosition: DEFAULT_SETTINGS.newTabPosition,
			newTabActive: DEFAULT_SETTINGS.newTabActive,
			textDragGestures: DEFAULT_SETTINGS.textDragGestures,
			linkDragGestures: DEFAULT_SETTINGS.linkDragGestures,
			imageDragGestures: DEFAULT_SETTINGS.imageDragGestures,
		};

		function getGestureAction(pattern) {
			if (!SETTINGS.enableGestureCustomization) {
				return DEFAULT_GESTURES[pattern];
			}

			const custom = SETTINGS.customGestures?.[pattern];
			if (custom === null) return null;  
			if (custom !== undefined) return custom;  

			if (SETTINGS.gestures && SETTINGS.gestures[pattern]) {
				return SETTINGS.gestures[pattern];
			}

			return DEFAULT_GESTURES[pattern];  
		}

		function getActionName(pattern) {
			const action = getGestureAction(pattern);
			if (action && ACTION_DEFINITIONS[action] && action !== 'none') {
				return `${pattern} ${ACTION_DEFINITIONS[action].name}`;
			}
			return pattern;
		}

		function loadSettings() {
			try {
				if (!chrome.storage || !chrome.storage.sync) return;
				chrome.storage.sync.get(null, async (items) => {
					if (chrome.runtime.lastError) return; 
					if (items) {
						const { blacklist, ...otherSettings } = items;
						SETTINGS = { ...SETTINGS, ...otherSettings };
					}

					if (!SETTINGS.gestures || Object.keys(SETTINGS.gestures).length === 0) {
						SETTINGS.gestures = DEFAULT_GESTURES;
					}

					if (SETTINGS.language && SETTINGS.language !== 'auto') {
						try {
							const url = chrome.runtime.getURL(`_locales/${SETTINGS.language}/messages.json`);
							const response = await fetch(url);
							i18nMessages = await response.json();
						} catch (e) {
						}
					} else {
						i18nMessages = null;
					}

					SETTINGS.enableDrag = SETTINGS.enableTextDrag || SETTINGS.enableImageDrag || SETTINGS.enableLinkDrag;

					updateDefinitions();

					if (window.GestureRecognizer && recognizer && recognizer.updateConfig) {
						recognizer.updateConfig({ distanceThreshold: SETTINGS.distanceThreshold });
					}

					if (SETTINGS.enableTrail || SETTINGS.enableHUD) {
						const currentLang = (SETTINGS.language && SETTINGS.language !== 'auto')
							? SETTINGS.language.replace('_', '-') 
							: chrome.i18n.getUILanguage();

						const rtlLangs = ['ar', 'he', 'fa', 'ps', 'ur', 'yi', 'sd', 'ug', 'ku'];
						const isRtl = rtlLangs.some(l => currentLang === l || currentLang.startsWith(l + '-'));

						visualizer.updateSettings({
							hudBgColor: SETTINGS.hudBgColor,
							hudBgOpacity: SETTINGS.hudBgOpacity,
							hudTextColor: SETTINGS.hudTextColor,
							trailColor: SETTINGS.trailColor,
							trailWidth: SETTINGS.trailWidth,
							showTrailOrigin: SETTINGS.showTrailOrigin,
							enableInputStabilization: SETTINGS.enableTrailSmooth,
							enablePathInterpolation: SETTINGS.enableTrailSmooth,
							lang: currentLang,
							isRtl: isRtl
						});
					}
				});
			} catch (e) {
			}
		}

		try {
			if (chrome.storage && chrome.storage.onChanged) {
				chrome.storage.onChanged.addListener((changes, namespace) => {
					if (namespace === 'sync') {
						const keys = Object.keys(changes);
						if (keys.length === 1 && keys[0] === 'blacklist') return;

						loadSettings();
					}
				});
			}
		} catch (e) {
		}

		loadSettings();


		try {
			chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
				if (request.action === 'ping') {
					sendResponse({ pong: true });
					return;
				}

				if (request.action === 'gestureStateUpdate') {
					isRemoteGestureActive = request.active;
				}

				if (request.action === 'gestureHudUpdate' && !isIframe) {
					const d = request.data;
					switch (d.type) {
						case 'hide': visualizer.hide(); break;
						case 'updateAction': visualizer.updateAction(d.text); break;
					}
				}

				if (request.action === 'gestureScrollUpdate' && !isIframe) {
					handleScroll(request.data.action, true);
				}

				if (request.action === 'showDownloadError' && !isIframe) {
					visualizer.showToast(msg('downloadErrorHotlink', 'Image save failed. The website may have hotlink protection. Please right-click the image and select "Save image as..."'), 5000);
				}
			});
		} catch (e) {
		}

		let gestureState = {
			isRightButton: false,
			isDrag: false,
			selectedText: '',
			dragElement: null,
			dragType: null,
			parentLink: null,
			preventContextMenu: false,
			skipFirstDragOver: false  
		};

		let isRemoteGestureActive = false;

		let preventContextMenuTimeoutId = null;

		let lastPointerType = 'mouse';

		class RelayGestureVisualizer extends window.GestureVisualizer {
			updateAction(text) {
				if (isIframe) {
					safeSendMessage({ action: 'gestureHudUpdate', data: { type: 'updateAction', text: text } });
				} else {
					super.updateAction(text);
				}
			}

			hide() {
				super.hide();

				if (isIframe) {
					safeSendMessage({ action: 'gestureHudUpdate', data: { type: 'hide' } });
				}
			}
		}

		const visualizer = new RelayGestureVisualizer();

		const isMacOrLinux = /Mac|Linux/i.test(navigator.platform);
		let lastRightClickTime = 0;
		const doubleClickDelay = 500; 

		document.addEventListener('contextmenu', (e) => {
			if (!SETTINGS.enableGesture || isBlacklisted) return;

			if (e.target.closest('[data-gesture-ignore]')) return;

			if (isMacOrLinux) {
				const now = Date.now();
				if (recognizer.isActive()) {
					e.preventDefault();
					e.stopPropagation();
					return false;
				}
				if (now - lastRightClickTime < doubleClickDelay) {
					lastRightClickTime = 0; 
					gestureState.isRightButton = false; 
					recognizer.reset();
					return; 
				} else {
					lastRightClickTime = now;
					e.preventDefault();
					e.stopPropagation();
					return false;
				}
			} else {
				if (gestureState.preventContextMenu || isRemoteGestureActive) {
					e.preventDefault();
					e.stopPropagation();
					return false;
				}
			}
		}, true);

		document.addEventListener('pointerdown', (e) => {
			if (e.button === 0) {
				lastPointerType = e.pointerType; 
			}
		}, true);

		document.addEventListener('pointerdown', (e) => {
			if (!SETTINGS.enableGesture || isBlacklisted) return;

			if ((e.pointerType === 'mouse') && e.button === 2) {
				if (e.target.closest('[data-gesture-ignore]')) return;

				gestureState.isRightButton = true;
				gestureState.isDrag = false;
				gestureState.preventContextMenu = false;
				if (preventContextMenuTimeoutId) {
					clearTimeout(preventContextMenuTimeoutId);
					preventContextMenuTimeoutId = null;
				}
				recognizer.start(e.clientX, e.clientY, e.timeStamp);

				try {
					const target = document.documentElement || document.body;
					if (target && target.setPointerCapture) {
						target.setPointerCapture(e.pointerId);
					}
				} catch (err) {
					console.warn('FlowMouse: setPointerCapture failed', err);
				}


			}
		}, true);

		document.addEventListener('pointermove', (e) => {
			if (!SETTINGS.enableGesture || isBlacklisted) return;
			if (!gestureState.isRightButton) return;

			const result = recognizer.move(e.clientX, e.clientY, e.timeStamp);

			let currentPoints = [];
			if (SETTINGS.enableTrail) {
				if (e.getCoalescedEvents) {
					const events = e.getCoalescedEvents();
					if (events.length > 0) {
						currentPoints = events.map(evt => ({ x: evt.clientX, y: evt.clientY, timestamp: evt.timeStamp }));
					}
				}
				if (currentPoints.length === 0) {
					currentPoints = [{ x: e.clientX, y: e.clientY, timestamp: e.timeStamp }];
				}
			}

			if (result.activated) {
				gestureState.preventContextMenu = true;
				safeSendMessage({ action: 'gestureStateUpdate', active: true });
				if (SETTINGS.enableTrail) {
					visualizer.updateSettings({
						minCutoff: 5.0,
						beta: 0.01,
						dcutoff: 1.0
					});
					visualizer.show();
					
					const preTrail = result.preActivationTrail || [{ x: recognizer.startX, y: recognizer.startY, timestamp: recognizer.startTimestamp }];
					const merged = [...preTrail, ...currentPoints];
					merged.sort((a, b) => a.timestamp - b.timestamp);
					visualizer.addPoints(merged);
				}
			} else if (recognizer.isActive() && SETTINGS.enableTrail) {
				visualizer.addPoints(currentPoints);
			}

			if (!recognizer.isActive()) return;

			if (result.directionChanged && SETTINGS.enableHUD) {
				const actionName = getActionName(result.pattern);
				visualizer.updateAction(actionName);
			}
		}, true);

		document.addEventListener('pointerup', (e) => {
			if (!SETTINGS.enableGesture || isBlacklisted) return;
			if (gestureState.isRightButton) {
				if (recognizer.isActive()) {
					e.preventDefault();
					e.stopPropagation();
					executeGesture(recognizer.getPattern());
					lastRightClickTime = 0;
				}

				resetState();
				preventContextMenuTimeoutId = setTimeout(() => {
					gestureState.preventContextMenu = false;
					preventContextMenuTimeoutId = null;
					safeSendMessage({ action: 'gestureStateUpdate', active: false });
				}, 50);
			}
		}, true);

		document.addEventListener('mousedown', (e) => {
			if (!SETTINGS.enableDrag || isBlacklisted) return;
			if (e.button !== 0) return;

			let target = e.target;
			let depth = 0;
			let hasModified = false;

			while (target && target !== document.body && depth < 5) {
				if (target.getAttribute && target.getAttribute('draggable') === 'false') {
					let shouldForce = false;

					if (target.tagName === 'IMG') {
						shouldForce = true;
					}
					else if (target.tagName === 'A' && target.href) {
						if (!target.querySelector('input, textarea, select, button')) {
							shouldForce = true;
						}
					}
					else if (window.getSelection().rangeCount > 0 && window.getSelection().containsNode(target, true)) {
						shouldForce = true;
					}

					if (shouldForce) {
						target.setAttribute('draggable', 'true');
						target.setAttribute('data-flowmouse-modified', 'true'); 
						hasModified = true;
					}
				}
				target = target.parentElement;
				depth++;
			}

			if (hasModified) {
				document.addEventListener('mouseup', restoreDraggable, true);
				document.addEventListener('dragend', restoreDraggable, true);
			}
		}, true);

		function restoreDraggable() {
			document.removeEventListener('mouseup', restoreDraggable, true);
			document.removeEventListener('dragend', restoreDraggable, true);

			const modified = document.querySelectorAll('[data-flowmouse-modified="true"]');
			modified.forEach(el => {
				el.setAttribute('draggable', 'false'); 
				el.removeAttribute('data-flowmouse-modified');
			});
		}

		document.addEventListener('dragstart', (e) => {
			if (!SETTINGS.enableDrag || isBlacklisted) return;
			let dragContent = null;
			let dragElement = null;
			let dragType = null;

			const path = e.composedPath();

			let targetImg = path.find(el => el.tagName === 'IMG');

			

			if (SETTINGS.enableImageDrag && targetImg) {
				dragContent = targetImg.src || targetImg.currentSrc;
				dragElement = targetImg;
				dragType = 'image';
				const parentLink = path.find(el => el.tagName === 'A' && el.href);
				if (parentLink) {
					gestureState.parentLink = parentLink.href;
				} else {
					gestureState.parentLink = null;
				}
				window.getSelection().removeAllRanges();
			}

			if (!dragContent && SETTINGS.enableTextDrag) {
				const selection = window.getSelection();
				const text = selection.toString().trim();

				const isShadowDOM = path.length > 0 && path[0] !== e.target;

				if (text) {
					if (isShadowDOM) {
						dragContent = text;
						dragType = 'text';
					} else if (selection.rangeCount > 0) {
						const range = selection.getRangeAt(0);
						const rect = range.getBoundingClientRect();
						const padding = 20;
						if (e.clientX >= rect.left - padding && e.clientX <= rect.right + padding &&
							e.clientY >= rect.top - padding && e.clientY <= rect.bottom + padding) {
							dragContent = text;
							dragType = 'text';
						}
					}
				}
			}

			if (!dragContent && SETTINGS.enableLinkDrag) {
				const targetLink = path.find(el => el.tagName === 'A' && el.href);
				if (targetLink) {
					let rawHref = targetLink.getAttribute('href');

					if (rawHref) {
						try {
							const absoluteUrl = new URL(rawHref, document.baseURI).href;

							if (absoluteUrl.startsWith('http') || absoluteUrl.startsWith('ftp') || absoluteUrl.startsWith('file') || absoluteUrl.startsWith('chrome-extension:') || absoluteUrl.startsWith('moz-extension:')) {
								dragContent = absoluteUrl;
								dragType = 'link';
								window.getSelection().removeAllRanges();
							}
						} catch (err) {
						}
					}
				}
			}

			if (dragContent) {
				gestureState.isDrag = true;
				gestureState.isRightButton = false;
				gestureState.selectedText = dragContent;
				gestureState.dragElement = dragElement;
				gestureState.dragType = dragType;
				recognizer.start(e.clientX, e.clientY, e.timeStamp);
				if (lastPointerType === 'touch' || lastPointerType === 'pen') {
					gestureState.skipFirstDragOver = true;
				}
			}
		});

		document.addEventListener('dragover', (e) => {
			if (!SETTINGS.enableDrag || isBlacklisted) return;
			if (!gestureState.isDrag) return;

			if (gestureState.skipFirstDragOver) {
				gestureState.skipFirstDragOver = false;
				return;
			}

			const result = recognizer.move(e.clientX, e.clientY, e.timeStamp);

			const currentPoint = { x: e.clientX, y: e.clientY, timestamp: e.timeStamp };

			if (result.activated) {
				if (SETTINGS.enableTrail) {
					visualizer.updateSettings({
						minCutoff: 1.0,
						beta: 0.007,
						dcutoff: 1.0
					});
					visualizer.show();
					
					const preTrail = result.preActivationTrail || [{ x: recognizer.startX, y: recognizer.startY, timestamp: recognizer.startTimestamp }];
					const merged = [...preTrail, currentPoint];
					merged.sort((a, b) => a.timestamp - b.timestamp);
					visualizer.addPoints(merged);
				}
			} else if (recognizer.isActive() && SETTINGS.enableTrail) {
				visualizer.addPoints([currentPoint]);
			}

			if (!recognizer.isActive()) return;

			e.preventDefault();

			if (result.directionChanged && SETTINGS.enableHUD) {
				if (['→', '←', '↑', '↓'].includes(result.pattern)) {
					const hint = getDragHint(gestureState.dragType, result.pattern);
					visualizer.updateAction(hint);
				} else {
					visualizer.updateAction('');
				}
			}
		});

		document.addEventListener('dragenter', (e) => {
			if (!SETTINGS.enableDrag || isBlacklisted) return;
			if (!gestureState.isDrag) return;
			if (!recognizer.isActive()) return;
			e.preventDefault();
		}, true);

		document.addEventListener('dragleave', (e) => {
			if (!SETTINGS.enableDrag || isBlacklisted) return;
			if (gestureState.isDrag && e.relatedTarget === null) {
				resetState();
			}
		}, true);

		document.addEventListener('dragend', (e) => {
			if (!SETTINGS.enableDrag || isBlacklisted) return;
			resetState();
		});

		document.addEventListener('drop', (e) => {
			if (!SETTINGS.enableDrag || isBlacklisted) return;
			try {
				if (gestureState.isDrag && recognizer.isActive()) {
					e.preventDefault();
					executeDragGesture(gestureState, recognizer.getPattern(), e.dataTransfer);
				}
			} catch (error) {
			} finally {
				resetState();
			}
		});

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				if (gestureState.isRightButton || gestureState.isDrag) {
					if (gestureState.isRightButton && recognizer.isActive()) {
						e.preventDefault();
						e.stopPropagation();
					}
					if (gestureState.isRightButton) {
						safeSendMessage({ action: 'gestureStateUpdate', active: false });
					}

					resetState();
				}
			}
		}, true);

		function resetState() {
			visualizer.hide();
			if (SETTINGS.enableHUD) visualizer.updateAction('');
			recognizer.reset();
			gestureState.isRightButton = false;
			gestureState.isDrag = false;
			gestureState.selectedText = '';
			gestureState.dragElement = null;
			gestureState.dragType = null;
			gestureState.skipFirstDragOver = false;
		}

		function getScrollTarget(forceTargetWindow = false) {
			if (forceTargetWindow) return window;

			const root = document.scrollingElement || document.documentElement;
			const isRootScrollable = root.scrollHeight > window.innerHeight &&
				getComputedStyle(root).overflowY !== 'hidden' &&
				(!document.body || getComputedStyle(document.body).overflowY !== 'hidden');

			if (!isRootScrollable) {
				let el = document.elementFromPoint(recognizer.startX, recognizer.startY);
				while (el && el !== root && el !== document.body) {
					const s = window.getComputedStyle(el);
					if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
						return el;
					}
					el = el.parentElement;
				}
			}
			return window;
		}

		function checkScrollFeasibility(action) {
			const tolerance = 1; 
			const target = getScrollTarget(); 
			const isWindow = target === window;
			const root = document.scrollingElement || document.documentElement;

			const currentScrollTop = isWindow ? window.scrollY : target.scrollTop;
			const maxScrollTop = isWindow ? (root.scrollHeight - window.innerHeight) : (target.scrollHeight - target.clientHeight);

			if (action === 'scrollUp' || action === 'scrollToTop') {
				return currentScrollTop > tolerance; 
			} else if (action === 'scrollDown' || action === 'scrollToBottom') {
				return currentScrollTop < maxScrollTop - tolerance; 
			}
			return true; 
		}

		function handleScroll(action, forceTargetWindow = false) {
			const target = getScrollTarget(forceTargetWindow);
			const isWindow = target === window;
			const root = document.scrollingElement || document.documentElement;

			const containerHeight = isWindow ? window.innerHeight : target.clientHeight;
			const scrollAmount = containerHeight * ((SETTINGS.scrollAmount || 75) / 100);

			if (action === 'scrollUp' || action === 'scrollDown') {
				const direction = action === 'scrollUp' ? -1 : 1;
				const delta = scrollAmount * direction;
				const smoothness = SETTINGS.scrollSmoothness || 'system';

				if (smoothness === 'custom') {
					smoothScrollBy(target, 0, delta);
				} else {
					target.scrollBy({ top: delta, left: 0, behavior: smoothness === 'none' ? 'instant' : 'smooth' });
				}
			} else if (action === 'scrollToTop') {
				target.scrollTo({ top: 0, behavior: 'instant' });
			} else if (action === 'scrollToBottom') {
				const fullHeight = isWindow ? root.scrollHeight : target.scrollHeight;
				target.scrollTo({ top: fullHeight, behavior: 'instant' });
			}
		}

		let scrollRafId = null;
		function smoothScrollBy(target, dx, dy) {
			if (scrollRafId) cancelAnimationFrame(scrollRafId);

			const isWindow = target === window;
			const root = document.scrollingElement || document.documentElement;

			const startX = isWindow ? window.scrollX : target.scrollLeft;
			const startY = isWindow ? window.scrollY : target.scrollTop;

			const maxScrollX = isWindow ? (root.scrollWidth - window.innerWidth) : (target.scrollWidth - target.clientWidth);
			const maxScrollY = isWindow ? (root.scrollHeight - window.innerHeight) : (target.scrollHeight - target.clientHeight);

			let targetX = startX + dx;
			let targetY = startY + dy;

			targetX = Math.max(0, Math.min(targetX, maxScrollX));
			targetY = Math.max(0, Math.min(targetY, maxScrollY));

			if (startX === targetX && startY === targetY) return;

			const realDx = targetX - startX;
			const realDy = targetY - startY;

			const startTime = performance.now();

			const intendedDist = Math.sqrt(dx * dx + dy * dy);
			const realDist = Math.sqrt(realDx * realDx + realDy * realDy);

			let duration = 500; 
			if (intendedDist > 0 && realDist < intendedDist) {
				duration = Math.max(16, duration * (realDist / intendedDist)); 
			}

			function step(currentTime) {
				const elapsed = currentTime - startTime;

				if (elapsed > duration) {
					if (isWindow) {
						window.scrollTo(targetX, targetY);
					} else {
						target.scrollLeft = targetX;
						target.scrollTop = targetY;
					}
					scrollRafId = null;
					return;
				}

				const progress = elapsed / duration;
				const ease = 1 - Math.pow(1 - progress, 3);

				const currentX = startX + realDx * ease;
				const currentY = startY + realDy * ease;

				if (isWindow) {
					window.scrollTo(currentX, currentY);
				} else {
					target.scrollLeft = currentX;
					target.scrollTop = currentY;
				}

				scrollRafId = requestAnimationFrame(step);
			}

			scrollRafId = requestAnimationFrame(step);
		}

		function executeGesture(pattern) {
			const action = getGestureAction(pattern);

			if (!action || action === 'none') {
				return;
			}

			const actionDef = ACTION_DEFINITIONS[action];
			if (!actionDef) {
				return;
			}

			if (actionDef.type === 'local') {
				switch (action) {
					case 'scrollUp':
					case 'scrollDown':
					case 'scrollToTop':
					case 'scrollToBottom':
						if (isIframe) {
							if (!checkScrollFeasibility(action)) {
								safeSendMessage({ action: 'gestureScrollUpdate', data: { action } });
								break; 
							}
						}
						handleScroll(action);
						break;
					case 'stopLoading': window.stop(); break;
					case 'copyUrl':
						fallbackCopy(location.href);
						break;
					case 'copyTitle':
						fallbackCopy(document.title);
						break;
					case 'printPage':
						window.print();
						break;
				}
			} else {
				if (action === 'openCustomUrl') {
					safeSendMessage({ action: action, pattern: pattern });
				} else {
					safeSendMessage({ action: action });
				}
			}
		}

		function fallbackCopy(text) {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text).catch(err => {
					manualCopy(text);
				});
			} else {
				manualCopy(text);
			}
		}

		function manualCopy(text) {
			try {
				const textarea = document.createElement('textarea');
				textarea.value = text;
				textarea.style.position = 'fixed';
				textarea.style.left = '-9999px';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			} catch (err) {
			}
		}

		function tryParseAsUrl(text) {
			if (!text || typeof text !== 'string') return null;
			text = text.trim();
			if (!text) return null;

			const protocolRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
			if (protocolRegex.test(text)) {
				return text;
			}

			const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/;
			if (ipRegex.test(text)) {
				return 'http://' + text;
			}

			const localhostRegex = /^localhost(:\d+)?(\/.*)?$/i;
			if (localhostRegex.test(text)) {
				return 'http://' + text;
			}

			const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)*(:\d+)?(\/.*)?$/;
			const commonTlds = /\.(com|cn|net|org|gov|edu|io|co|cc|me|tv|info|biz|xyz|top|vip|club|shop|site|online|tech|app|dev|ai|uk|de|fr|jp|kr|ru|br|in|au|ca|hk|tw|sg)\b/i;
			if (domainRegex.test(text) && commonTlds.test(text)) {
				return 'http://' + text;
			}

			return null;
		}

		function executeDragGesture(state, pattern, dataTransfer) {
			if (!['→', '←', '↑', '↓'].includes(pattern)) {
				return; 
			}

			const { selectedText: content, dragType, parentLink, dragElement } = state;

			if (!SETTINGS.enableAdvancedSettings) {
				if (pattern !== '→') return;

				if (dragType === 'text') {
					if (SETTINGS.autoDetectUrl) {
						const url = tryParseAsUrl(content);
						if (url) {
							safeSendMessage({ action: 'openTabAtPosition', url: url, position: 'right', active: true });
							return;
						}
					}
					if (SETTINGS.searchEngine === 'system') {
						safeSendMessage({ action: 'systemSearch', query: content, position: 'right', active: true });
					} else {
						let searchUrl = '';
						if (SETTINGS.searchEngine === 'custom' && SETTINGS.customSearchUrl) {
							searchUrl = SETTINGS.customSearchUrl.replace('%s', encodeURIComponent(content));
						} else {
							const baseUrl = (SEARCH_ENGINES[SETTINGS.searchEngine] || SEARCH_ENGINES['google']).url;
							searchUrl = `${baseUrl}${encodeURIComponent(content)}`;
						}
						safeSendMessage({ action: 'openTabAtPosition', url: searchUrl, position: 'right', active: true });
					}
				} else if (dragType === 'link') {
					safeSendMessage({ action: 'openTabAtPosition', url: content, position: 'right', active: true });
				} else if (dragType === 'image') {
					if (SETTINGS.preferLink && parentLink) {
						safeSendMessage({ action: 'openTabAtPosition', url: parentLink, position: 'right', active: true });
					} else {
						safeSendMessage({ action: 'openTabAtPosition', url: content, position: 'right', active: true });
					}
				}
				return;
			}

			const getGestureConfig = (gestures, dir) => {
				if (Array.isArray(gestures)) {
					const found = gestures.find(g => g.direction === dir);
					return found || { action: 'none', position: 'right', active: true };
				}
				const cfg = gestures?.[dir];
				if (typeof cfg === 'object' && cfg !== null) {
					return cfg;
				}
				return { action: cfg || 'none', position: 'right', active: true };
			};

			let config;
			if (dragType === 'text') {
				config = getGestureConfig(SETTINGS.textDragGestures, pattern);
			} else if (dragType === 'link') {
				config = getGestureConfig(SETTINGS.linkDragGestures, pattern);
			} else if (dragType === 'image') {
				config = getGestureConfig(SETTINGS.imageDragGestures, pattern);
			} else {
				return;
			}

			const action = config.action || 'none';
			if (action === 'none') return;

			const position = config.position || 'right';
			const active = config.active !== false;
			const engine = config.engine || 'google';
			const customUrl = config.url || '';
			const autoDetectUrl = config.autoDetectUrl === true;  
			const preferLink = config.preferLink === true;  

			switch (action) {
				case 'search':
					if (autoDetectUrl && dragType === 'text') {
						const url = tryParseAsUrl(content);
						if (url) {
							safeSendMessage({
								action: 'openTabAtPosition',
								url: url,
								position: position,
								active: active
							});
							break;
						}
					}
					if (engine === 'system') {
						safeSendMessage({
							action: 'systemSearch',
							query: content,
							position: position,
							active: active
						});
					} else {
						let searchUrl = '';
						if (engine === 'custom' && customUrl) {
							searchUrl = customUrl.replace('%s', encodeURIComponent(content));
						} else {
							const baseUrl = (SEARCH_ENGINES[engine] || SEARCH_ENGINES['google']).url;
							searchUrl = `${baseUrl}${encodeURIComponent(content)}`;
						}
						safeSendMessage({
							action: 'openTabAtPosition',
							url: searchUrl,
							position: position,
							active: active
						});
					}
					break;

				case 'copy':
					fallbackCopy(content);
					break;

				case 'openTab':
					let targetUrl = content;
					if (dragType === 'image' && preferLink && parentLink) {
						targetUrl = parentLink;
					}
					safeSendMessage({
						action: 'openTabAtPosition',
						url: targetUrl,
						position: position,
						active: active
					});
					break;

				case 'copyLink':
					fallbackCopy(content);
					break;

				case 'saveImage':
					if (content.startsWith('data:')) {
						safeSendMessage({ action: 'saveImage', url: content });
						break;
					}

					if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
						const file = dataTransfer.files[0];
						const reader = new FileReader();
						reader.onload = () => {
							safeSendMessage({ 
								action: 'saveImage', 
								url: reader.result,
								filename: file.name
							});
						};
						reader.readAsDataURL(file);
						break;
					}

					const waitForImageLoad = (img, timeout = 60000) => {
						return new Promise((resolve, reject) => {
							if (!img || img.tagName !== 'IMG' || img.complete) {
								resolve();
								return;
							}

							let settled = false;
							const cleanup = () => {
								img.removeEventListener('load', onLoad);
								img.removeEventListener('error', onError);
							};
							const onLoad = () => {
								if (settled) return;
								settled = true;
								cleanup();
								resolve();
							};
							const onError = () => {
								if (settled) return;
								settled = true;
								cleanup();
								reject(new Error('load'));
							};

							img.addEventListener('load', onLoad);
							img.addEventListener('error', onError);

							setTimeout(() => {
								if (settled) return;
								settled = true;
								cleanup();
								reject(new Error('timeout'));
							}, timeout);
						});
					};

					waitForImageLoad(dragElement)
						.then(() => {
							safeSendMessage({ 
								action: 'saveImage', 
								url: content,
								origin: window.location.origin
							});
						})
						.catch((err) => {
							const toastMsg = err.message === 'timeout'
								? msg('saveImageTimeout', 'Image save failed: loading timed out.')
								: msg('saveImageLoadError', 'Image save failed: failed to load image.');
							visualizer.showToast(toastMsg, 5000);
						});
					break;

				case 'copyImageUrl':
					fallbackCopy(content);
					break;

				case 'imageSearch':
					{
						const { IMAGE_SEARCH_ENGINES } = window.GestureConstants;
						let searchUrl = '';
						let engineConfig = IMAGE_SEARCH_ENGINES['google']; 
						
						if (engine && IMAGE_SEARCH_ENGINES[engine]) {
							engineConfig = IMAGE_SEARCH_ENGINES[engine];
						}
						
                        if (engine === 'custom' && config.url) {
                            searchUrl = config.url.replace('%s', encodeURIComponent(content));
                        } else {
						    searchUrl = engineConfig.url + encodeURIComponent(content);
                        }

						safeSendMessage({
							action: 'openTabAtPosition',
							url: searchUrl,
							position: position,
							active: active
						});
					}
					break;
			}
		}
	}
})();