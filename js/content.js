(function () {
    'use strict';

    const currentDomain = location.hostname;

    try {
        if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get({ blacklist: [] }, (items) => {
                if (chrome.runtime.lastError) return;
                if (items.blacklist.includes(currentDomain)) {
                    return;
                }
                initGestures();
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
                        const newBlacklist = changes.blacklist.newValue || [];
                        if (newBlacklist.includes(currentDomain)) {
                            location.reload();
                        }
                    }

                }
            });
        }
    } catch (e) {
    }

    function initGestures() {
        const { DEFAULT_GESTURES, SEARCH_ENGINES, DEFAULT_SETTINGS } = window.GestureConstants;

        const CONFIG = {
            DISTANCE_THRESHOLD: 30,
            SCROLL_AMOUNT: window.innerHeight * 0.75
        };

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
                    chrome.runtime.sendMessage(message);
                }
            } catch (e) {
            }
        }

        let ACTION_DEFINITIONS = {};

        function updateDefinitions() {
            ACTION_DEFINITIONS = {
                'none': { name: msg('actionNone', '无操作'), type: 'local' },
                'back': { name: msg('actionBack', '返回'), type: 'local' },
                'forward': { name: msg('actionForward', '前进'), type: 'local' },
                'scrollUp': { name: msg('actionScrollUp', '向上滚动'), type: 'local' },
                'scrollDown': { name: msg('actionScrollDown', '向下滚动'), type: 'local' },
                'scrollToTop': { name: msg('actionScrollToTop', '滚动到顶部'), type: 'local' },
                'scrollToBottom': { name: msg('actionScrollToBottom', '滚动到底部'), type: 'local' },
                'closeTab': { name: msg('actionCloseTab', '关闭标签页'), type: 'background' },
                'restoreTab': { name: msg('actionRestoreTab', '恢复标签页'), type: 'background' },
                'newTab': { name: msg('actionNewTab', '打开新标签页'), type: 'background' },
                'closeOtherTabs': { name: msg('actionCloseOtherTabs', '关闭其他标签页'), type: 'background' },
                'closeRightTabs': { name: msg('actionCloseRightTabs', '关闭右侧标签页'), type: 'background' },
                'closeAllTabs': { name: msg('actionCloseAllTabs', '关闭所有标签页'), type: 'background' },
                'switchLeftTab': { name: msg('actionSwitchLeftTab', '切换到左边标签页'), type: 'background' },
                'switchRightTab': { name: msg('actionSwitchRightTab', '切换到右边标签页'), type: 'background' },
                'refresh': { name: msg('actionRefresh', '刷新'), type: 'local' },
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
                'openDownloads': { name: msg('actionOpenDownloads', '打开下载页面'), type: 'background' },
                'openHistory': { name: msg('actionOpenHistory', '打开历史记录'), type: 'background' },
                'openExtensions': { name: msg('actionOpenExtensions', '打开扩展管理'), type: 'background' },
                'printPage': { name: msg('actionPrintPage', '打印页面'), type: 'local' },
                'duplicateTab': { name: msg('actionDuplicateTab', '复制当前标签页'), type: 'background' }
            };
        }

        function getDragHint(type, pattern) {
            if (!SETTINGS.enableAdvancedSettings) {
                if (pattern !== '→') return '';
                const basicHints = {
                    'text': '→ 🔍 ' + msg('dragActionSearchText', '搜索'),
                    'link': '→ 🔗 ' + msg('dragActionOpenTabText', '新标签打开'),
                    'image': '→ 🖼️ ' + msg('dragActionOpenTabText', '新标签打开')
                };
                return basicHints[type] || '';
            }

            const actionNames = {
                'search': msg('dragActionSearch', '🔍 搜索引擎'),
                'copy': msg('dragActionCopy', '📋 复制'),
                'openTab': msg('dragActionOpenTab', '📑 新标签打开'),
                'copyLink': msg('dragActionCopyLink', '🔗 复制链接'),
                'saveImage': msg('dragActionSaveImage', '💾 保存图片'),
                'copyImageUrl': msg('dragActionCopyImageUrl', '📋 复制图片地址'),
                'customSearch': msg('dragActionCustomSearch', '🔍 自定义搜索'),
                'none': ''
            };

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

            let actionHint = actionNames[action] || '';
            if (action === 'openTab' && actionHint) {
                if (type === 'link') {
                    actionHint = actionHint.replace('📑', '🔗');
                } else if (type === 'image') {
                    actionHint = actionHint.replace('📑', '🖼️');
                }
            }
            return actionHint ? `${pattern} ${actionHint}` : '';
        }

        let SETTINGS = {
            enableGesture: DEFAULT_SETTINGS.enableGesture,
            enableHUD: DEFAULT_SETTINGS.enableHUD,
            enableTrail: DEFAULT_SETTINGS.enableTrail,
            showTrailOrigin: DEFAULT_SETTINGS.showTrailOrigin,
            searchEngine: DEFAULT_SETTINGS.searchEngine,
            customSearchUrl: DEFAULT_SETTINGS.customSearchUrl,
            gestures: { ...DEFAULT_GESTURES },
            customGestures: {},
            enableGestureCustomization: DEFAULT_SETTINGS.enableGestureCustomization,
            enableAdvancedSettings: DEFAULT_SETTINGS.enableAdvancedSettings,
            scrollAmount: DEFAULT_SETTINGS.scrollAmount,
            enableTextDrag: DEFAULT_SETTINGS.enableTextDrag,
            enableImageDrag: DEFAULT_SETTINGS.enableImageDrag,
            enableLinkDrag: DEFAULT_SETTINGS.enableLinkDrag,
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
            imageSearchUrl: DEFAULT_SETTINGS.imageSearchUrl
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

                    updateDefinitions();

                    if (SETTINGS.enableTrail || SETTINGS.enableHUD) {
                        visualizer.updateSettings({
                            hudBgColor: SETTINGS.hudBgColor,
                            hudBgOpacity: SETTINGS.hudBgOpacity,
                            hudTextColor: SETTINGS.hudTextColor,
                            trailColor: SETTINGS.trailColor,
                            trailWidth: SETTINGS.trailWidth,
                            showTrailOrigin: SETTINGS.showTrailOrigin
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

        let gestureState = {
            active: false,
            isRightButton: false,
            isDrag: false,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            currentX: 0,
            currentY: 0,
            pattern: [],
            points: [],
            selectedText: '',
            dragType: null,
            preventContextMenu: false
        };

        const visualizer = new window.GestureVisualizer();

        const isMacOrLinux = /Mac|Linux/i.test(navigator.platform);
        let lastRightClickTime = 0;
        const doubleClickDelay = 500;

        document.addEventListener('contextmenu', (e) => {
            if (isMacOrLinux) {
                const now = Date.now();
                if (gestureState.active) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                if (now - lastRightClickTime < doubleClickDelay) {
                    lastRightClickTime = 0;
                    gestureState.isRightButton = false;
                    gestureState.active = false;
                    return;
                } else {
                    lastRightClickTime = now;
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            } else {
                if (gestureState.preventContextMenu) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        }, true);

        let scrollRafId = null;
        function smoothScroll(amount) {
            if (scrollRafId) cancelAnimationFrame(scrollRafId);
            const startY = window.scrollY;
            const startTime = performance.now();
            const duration = 500;

            function step(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                window.scrollTo(0, startY + amount * ease);

                if (progress < 1) {
                    scrollRafId = requestAnimationFrame(step);
                } else {
                    scrollRafId = null;
                }
            }
            scrollRafId = requestAnimationFrame(step);
        }

        document.addEventListener('mousedown', (e) => {
            if (!SETTINGS.enableGesture) return;

            if (e.button === 2) {
                gestureState.active = false;
                gestureState.isRightButton = true;
                gestureState.isDrag = false;
                gestureState.startX = e.clientX;
                gestureState.startY = e.clientY;
                gestureState.lastX = e.clientX;
                gestureState.lastY = e.clientY;
                gestureState.currentX = e.clientX;
                gestureState.currentY = e.clientY;
                gestureState.pattern = [];
                gestureState.points = [];
                gestureState.preventContextMenu = false;
            }
        }, true);

        document.addEventListener('mousemove', (e) => {
            if (!gestureState.isRightButton) return;

            gestureState.currentX = e.clientX;
            gestureState.currentY = e.clientY;

            const totalDeltaX = gestureState.currentX - gestureState.startX;
            const totalDeltaY = gestureState.currentY - gestureState.startY;
            const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);

            if (!gestureState.active && totalDistance > CONFIG.DISTANCE_THRESHOLD) {
                gestureState.active = true;
                gestureState.preventContextMenu = true;
                if (SETTINGS.enableTrail) {
                    visualizer.show();
                    visualizer.addPoint(gestureState.startX, gestureState.startY);
                }
            }

            if (!gestureState.active) return;

            if (SETTINGS.enableTrail) {
                visualizer.addPoint(gestureState.currentX, gestureState.currentY);
            }
            gestureState.points.push({ x: gestureState.currentX, y: gestureState.currentY });

            const deltaX = gestureState.currentX - gestureState.lastX;
            const deltaY = gestureState.currentY - gestureState.lastY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > CONFIG.DISTANCE_THRESHOLD) {
                const direction = getDirection(deltaX, deltaY);
                if (direction && gestureState.pattern[gestureState.pattern.length - 1] !== direction) {
                    gestureState.pattern.push(direction);
                    if (SETTINGS.enableHUD) {
                        const currentPattern = gestureState.pattern.join('');
                        const actionName = getActionName(currentPattern);
                        visualizer.updateAction(actionName);
                    }
                }
                gestureState.lastX = gestureState.currentX;
                gestureState.lastY = gestureState.currentY;
            }
        }, true);

        document.addEventListener('mouseup', (e) => {
            if (gestureState.isRightButton) {
                if (gestureState.active) {
                    e.preventDefault();
                    e.stopPropagation();
                    executeGesture(gestureState.pattern.join(''));
                    lastRightClickTime = 0;
                }
                resetState();
                setTimeout(() => {
                    gestureState.preventContextMenu = false;
                }, 100);
            }
        }, true);

        document.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;

            let target = e.target;
            let depth = 0;
            while (target && target !== document.body && depth < 5) {
                if (target.getAttribute && target.getAttribute('draggable') === 'false') {
                    if (target.tagName === 'A' || target.tagName === 'IMG' ||
                        (window.getSelection().rangeCount > 0 && window.getSelection().containsNode(target, true))) {
                        target.setAttribute('draggable', 'true');
                        target.setAttribute('data-shoushi-modified', 'true');
                    }
                }
                target = target.parentElement;
                depth++;
            }
        }, true);

        const restoreDraggable = () => {
            const modified = document.querySelectorAll('[data-shoushi-modified="true"]');
            modified.forEach(el => {
                el.setAttribute('draggable', 'false');
                el.removeAttribute('data-shoushi-modified');
            });
        };

        document.addEventListener('mouseup', restoreDraggable, true);
        document.addEventListener('dragend', restoreDraggable, true);

        document.addEventListener('dragstart', (e) => {
            let dragContent = null;
            let dragType = null;

            if (SETTINGS.enableImageDrag && e.target.tagName === 'IMG') {
                dragContent = e.target.src || e.target.currentSrc;
                dragType = 'image';
                window.getSelection().removeAllRanges();
            }

            if (!dragContent && SETTINGS.enableTextDrag) {
                const selection = window.getSelection();
                const text = selection.toString().trim();

                if (text && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;

                    const padding = 5;
                    if (x >= rect.left - padding && x <= rect.right + padding &&
                        y >= rect.top - padding && y <= rect.bottom + padding) {
                        dragContent = text;
                        dragType = 'text';
                    }
                }
            }

            if (!dragContent && SETTINGS.enableLinkDrag) {
                const target = e.target.nodeType === 3 ? e.target.parentElement : e.target;
                const link = target.closest('a');
                if (link && link.href) {
                    dragContent = link.href;
                    dragType = 'link';
                    window.getSelection().removeAllRanges();
                }
            }

            if (dragContent) {
                gestureState.isDrag = true;
                gestureState.isRightButton = false;
                gestureState.selectedText = dragContent;
                gestureState.dragType = dragType;
                gestureState.startX = e.clientX;
                gestureState.startY = e.clientY;
                gestureState.lastX = e.clientX;
                gestureState.lastY = e.clientY;
                gestureState.pattern = [];
                gestureState.points = [];
                gestureState.active = false;
                visualizer.setSvgMode(true);
            }
        });

        document.addEventListener('dragover', (e) => {
            if (!gestureState.isDrag) return;

            gestureState.currentX = e.clientX;
            gestureState.currentY = e.clientY;

            const totalDeltaX = gestureState.currentX - gestureState.startX;
            const totalDeltaY = gestureState.currentY - gestureState.startY;
            const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);

            if (!gestureState.active && totalDistance > CONFIG.DISTANCE_THRESHOLD) {
                gestureState.active = true;
                if (SETTINGS.enableTrail) {
                    visualizer.show();
                    visualizer.addPoint(gestureState.startX, gestureState.startY);
                }
            }

            if (!gestureState.active) return;

            if (SETTINGS.enableTrail) {
                visualizer.addPoint(gestureState.currentX, gestureState.currentY);
            }

            const deltaX = gestureState.currentX - gestureState.lastX;
            const deltaY = gestureState.currentY - gestureState.lastY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > CONFIG.DISTANCE_THRESHOLD) {
                const direction = getDirection(deltaX, deltaY);
                if (direction && gestureState.pattern[gestureState.pattern.length - 1] !== direction) {
                    gestureState.pattern.push(direction);
                    const currentPattern = gestureState.pattern.join('');
                    if (SETTINGS.enableHUD) {
                        if (['→', '←', '↑', '↓'].includes(currentPattern)) {
                            const hint = getDragHint(gestureState.dragType, currentPattern);
                            visualizer.updateAction(hint);
                        } else {
                            visualizer.updateAction('');
                        }
                    }
                }
                gestureState.lastX = gestureState.currentX;
                gestureState.lastY = gestureState.currentY;
            }
        });

        document.addEventListener('dragend', (e) => {
            if (gestureState.isDrag && gestureState.active) {
                executeTextDragGesture(gestureState.pattern.join(''), gestureState.selectedText);
            }
            resetState();
        });

        document.addEventListener('drop', (e) => {
            if (gestureState.isDrag && gestureState.active) {
                e.preventDefault();
            }
        });

        function resetState() {
            visualizer.hide();
            if (SETTINGS.enableHUD) visualizer.updateAction('');
            gestureState.active = false;
            gestureState.isRightButton = false;
            gestureState.isDrag = false;
            gestureState.pattern = [];
            gestureState.points = [];
            gestureState.selectedText = '';
            gestureState.dragType = null;
        }

        function getDirection(deltaX, deltaY) {
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            if (absDeltaX > absDeltaY) {
                return deltaX > 0 ? '→' : '←';
            } else {
                return deltaY > 0 ? '↓' : '↑';
            }
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
                    case 'scrollUp': {
                        const scrollDist = window.innerHeight * ((SETTINGS.scrollAmount || 75) / 100);
                        smoothScroll(-scrollDist);
                        break;
                    }
                    case 'scrollDown': {
                        const scrollDist = window.innerHeight * ((SETTINGS.scrollAmount || 75) / 100);
                        smoothScroll(scrollDist);
                        break;
                    }
                    case 'scrollToTop': window.scrollTo({ top: 0 }); break;
                    case 'scrollToBottom': window.scrollTo({ top: document.body.scrollHeight }); break;
                    case 'back': history.back(); break;
                    case 'forward': history.forward(); break;
                    case 'refresh': location.reload(); break;
                    case 'stopLoading': window.stop(); break;
                    case 'copyUrl':
                        navigator.clipboard.writeText(location.href);
                        break;
                    case 'copyTitle':
                        navigator.clipboard.writeText(document.title);
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

        function executeTextDragGesture(pattern, content) {
            if (!['→', '←', '↑', '↓'].includes(pattern)) {
                return;
            }

            const dragType = gestureState.dragType;

            if (!SETTINGS.enableAdvancedSettings) {
                if (pattern !== '→') return;

                if (dragType === 'text') {
                    let searchUrl = '';
                    if (SETTINGS.searchEngine === 'custom' && SETTINGS.customSearchUrl) {
                        searchUrl = SETTINGS.customSearchUrl.replace('%s', encodeURIComponent(content));
                    } else {
                        const baseUrl = SEARCH_ENGINES[SETTINGS.searchEngine] || SEARCH_ENGINES['google'];
                        searchUrl = `${baseUrl}${encodeURIComponent(content)}`;
                    }
                    safeSendMessage({ action: 'openTabAtPosition', url: searchUrl, position: 'right', active: true });
                } else if (dragType === 'link') {
                    safeSendMessage({ action: 'openTabAtPosition', url: content, position: 'right', active: true });
                } else if (dragType === 'image') {
                    safeSendMessage({ action: 'openTabAtPosition', url: content, position: 'right', active: true });
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

            switch (action) {
                case 'search':
                    let searchUrl = '';
                    if (engine === 'custom' && customUrl) {
                        searchUrl = customUrl.replace('%s', encodeURIComponent(content));
                    } else {
                        const baseUrl = SEARCH_ENGINES[engine] || SEARCH_ENGINES['google'];
                        searchUrl = `${baseUrl}${encodeURIComponent(content)}`;
                    }
                    safeSendMessage({
                        action: 'openTabAtPosition',
                        url: searchUrl,
                        position: position,
                        active: active
                    });
                    break;

                case 'copy':
                    navigator.clipboard.writeText(content).catch(() => {
                        const textarea = document.createElement('textarea');
                        textarea.value = content;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    });
                    break;

                case 'openTab':
                    safeSendMessage({
                        action: 'openTabAtPosition',
                        url: content,
                        position: position,
                        active: active
                    });
                    break;

                case 'copyLink':
                    navigator.clipboard.writeText(content).catch(() => {
                        const textarea = document.createElement('textarea');
                        textarea.value = content;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    });
                    break;

                case 'saveImage':
                    safeSendMessage({ action: 'saveImage', url: content });
                    break;

                case 'copyImageUrl':
                    navigator.clipboard.writeText(content).catch(() => {
                        const textarea = document.createElement('textarea');
                        textarea.value = content;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    });
                    break;

                case 'customSearch':
                    if (customUrl) {
                        safeSendMessage({
                            action: 'openTabAtPosition',
                            url: customUrl.replace('%s', encodeURIComponent(content)),
                            position: position,
                            active: active
                        });
                    }
                    break;
            }
        }
    }
})();
