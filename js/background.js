const GLOBAL_MUTE_KEY = 'flowmouse_global_mute_state';

chrome.tabs.onCreated.addListener((tab) => {
	chrome.storage.session.get([GLOBAL_MUTE_KEY], (items) => {
		if (items[GLOBAL_MUTE_KEY]) {
			if (tab.id) {
				chrome.tabs.update(tab.id, { muted: true });
			}
		}
	});
});

function asyncMessageHandler(asyncHandler) {
	return (message, sender, sendResponse) => {
		asyncHandler(message, sender)
			.then(sendResponse)
			.catch((error) => sendResponse({ success: false, error: error.message }));
		return true; 
	};
}

chrome.runtime.onMessage.addListener(asyncMessageHandler(async (request, sender) => {
	switch (request.action) {
		case 'back':
			if (sender.tab?.id) {
				await chrome.tabs.goBack(sender.tab.id).catch(() => { });
			}
			break;

		case 'forward':
			if (sender.tab?.id) {
				await chrome.tabs.goForward(sender.tab.id).catch(() => { });
			}
			break;

		case 'refresh':
			if (sender.tab?.id) {
				await chrome.tabs.reload(sender.tab.id);
			}
			break;

		case 'closeTab':
			if (sender.tab?.id) {
				await chrome.tabs.remove(sender.tab.id);
			}
			break;

		case 'closeTabKeepWindow': {
			if (sender.tab?.id) {
				const tabs = await chrome.tabs.query({ currentWindow: true });
				if (tabs.length === 1) {
					await chrome.tabs.create({ active: true });
					await chrome.tabs.remove(sender.tab.id);
				} else {
					await chrome.tabs.remove(sender.tab.id);
				}
			}
			break;
		}

		case 'closeBrowser': {
			const windows = await chrome.windows.getAll({});
			for (const win of windows) {
				await chrome.windows.remove(win.id);
			}
			break;
		}

		case 'restoreTab':
			await chrome.sessions.restore(null).catch(() => { });
			break;

		case 'openTab':
			if (sender.tab) {
				await chrome.tabs.create({
					url: request.url || undefined,
					active: true,
					index: sender.tab.index + 1,
					openerTabId: sender.tab.id  
				});
			} else {
				await chrome.tabs.create({ url: request.url || undefined, active: true });
			}
			break;

		case 'newTab':
			await chrome.tabs.create({ active: true });
			break;

		case 'openTabAtPosition': {
			if (sender.tab) {
				const position = request.position || 'right';
				const active = request.active !== false;

				if (position === 'current') {
					await chrome.tabs.update(sender.tab.id, { url: request.url, active: active });
					return;
				}

				const tabs = await chrome.tabs.query({ currentWindow: true });
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

				await chrome.tabs.create({
					url: request.url,
					active: active,
					index: newIndex,
					openerTabId: sender.tab.id
				});
			} else {
				await chrome.tabs.create({ url: request.url, active: request.active !== false });
			}
			break;
		}

		case 'systemSearch': {
			if (chrome.search?.query && sender.tab) {
				const position = request.position || 'right';
				const active = request.active !== false;

				if (position === 'current') {
					chrome.search.query({ text: request.query, tabId: sender.tab.id });
				} else {
					const tabs = await chrome.tabs.query({ currentWindow: true });
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

					const newTab = await chrome.tabs.create({
						active: active,
						index: newIndex,
						openerTabId: sender.tab.id
					});
					if (newTab) {
						chrome.search.query({ text: request.query, tabId: newTab.id });
					}
				}
			}
			break;
		}

		case 'saveImage':
			if (request.url) {
				requestPermission(['downloads', 'pageCapture'], sender.tab?.windowId ?? null).then(async (granted) => {
					if (!granted) return;

					if (request.url.startsWith('data:')) {
						{
							await chrome.downloads.download({
								url: request.url,
								filename: request.filename || null,
								saveAs: false
							});
						}
						return;
					}

					const imageUrl = request.url;

					{
						const sourceTabId = sender.tab?.id ?? null;
						if (!sourceTabId) {
							return;
						}

						const MHTML_MAX_RETRIES = 2;   
						const MHTML_RETRY_DELAY = 500;  
						try {
							let mhtmlBlob;
							for (let i = 0; i <= MHTML_MAX_RETRIES; i++) {
								try {
									mhtmlBlob = await chrome.pageCapture.saveAsMHTML({ tabId: sourceTabId });
									if (mhtmlBlob) break;
								} catch (e) {
									if (i >= MHTML_MAX_RETRIES) throw e; 
									await new Promise(r => setTimeout(r, MHTML_RETRY_DELAY));
								}
							}
							const mhtmlText = await mhtmlBlob.text();

							const resource = findResourceInMhtml(mhtmlText, imageUrl);

							if (resource && resource.dataUrl) {
								const filename = getFilename(imageUrl, resource.type);
								await chrome.downloads.download({
									url: resource.dataUrl,
									filename: filename,
									saveAs: false
								});
							} else {
								notifyDownloadError(sourceTabId);
							}
						} catch (e) {
							console.error('MHTML capture failed:', e);
							notifyDownloadError(sourceTabId);
						}
					}
				});
			}
			break;

		case 'closeOtherTabs': {
			if (sender.tab) {
				const tabs = await chrome.tabs.query({ currentWindow: true });
				const tabsToRemove = tabs
					.filter(tab => tab.id !== sender.tab.id)
					.map(tab => tab.id);

				if (tabsToRemove.length > 0) {
					await chrome.tabs.remove(tabsToRemove);
				}
			}
			break;
		}

		case 'closeRightTabs': {
			if (sender.tab) {
				const tabs = await chrome.tabs.query({ currentWindow: true });
				const tabsToRemove = tabs
					.filter(tab => tab.index > sender.tab.index)
					.map(tab => tab.id);

				if (tabsToRemove.length > 0) {
					await chrome.tabs.remove(tabsToRemove);
				}
			}
			break;
		}

		case 'closeLeftTabs': {
			if (sender.tab) {
				const tabs = await chrome.tabs.query({ currentWindow: true });
				const tabsToRemove = tabs
					.filter(tab => tab.index < sender.tab.index)
					.map(tab => tab.id);

				if (tabsToRemove.length > 0) {
					await chrome.tabs.remove(tabsToRemove);
				}
			}
			break;
		}

		case 'refreshAllTabs': {
			const tabs = await chrome.tabs.query({ currentWindow: true });
			for (const tab of tabs) {
				await chrome.tabs.reload(tab.id);
			}
			break;
		}

		case 'closeAllTabs': {
			const tabs = await chrome.tabs.query({ currentWindow: true });
			await chrome.tabs.create({ active: true });
			const tabsToRemove = tabs.map(tab => tab.id);
			if (tabsToRemove.length > 0) {
				await chrome.tabs.remove(tabsToRemove);
			}
			break;
		}

		case 'switchLeftTab': {
			if (sender.tab) {
				const tabs = await chrome.tabs.query({ currentWindow: true });
				const currentIndex = sender.tab.index;
				const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
				await chrome.tabs.update(tabs[prevIndex].id, { active: true });
			}
			break;
		}

		case 'switchRightTab': {
			if (sender.tab) {
				const tabs = await chrome.tabs.query({ currentWindow: true });
				const currentIndex = sender.tab.index;
				const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
				await chrome.tabs.update(tabs[nextIndex].id, { active: true });
			}
			break;
		}

		case 'newWindow':
			await chrome.windows.create({});
			break;

		case 'newIncognito':
			await chrome.windows.create({ incognito: true });
			break;

		case 'addToBookmarks':
			if (sender.tab) {
				requestPermission(['bookmarks'], sender.tab.windowId).then(async (granted) => {
					if (!granted) return;
					await chrome.bookmarks.create({
						title: sender.tab.title,
						url: sender.tab.url
					});
				});
			}
			break;

		case 'toggleFullscreen': {
			const win = await chrome.windows.getCurrent();
			if (win.state === 'fullscreen') {
				const storageKey = `flowmouse_fullscreen_prev_state_${win.id}`;
				const items = await chrome.storage.session.get([storageKey]);
				const prevState = items[storageKey] || 'normal';
				await chrome.windows.update(win.id, { state: prevState });
				await chrome.storage.session.remove(storageKey);
			} else {
				const storageKey = `flowmouse_fullscreen_prev_state_${win.id}`;
				await chrome.storage.session.set({ [storageKey]: win.state });
				await chrome.windows.update(win.id, { state: 'fullscreen' });
			}
			break;
		}

		case 'toggleMaximize': {
			const win = await chrome.windows.getCurrent();
			const newState = win.state === 'maximized' ? 'normal' : 'maximized';
			await chrome.windows.update(win.id, { state: newState });
			break;
		}

		case 'minimize': {
			const win = await chrome.windows.getCurrent();
			await chrome.windows.update(win.id, { state: 'minimized' });
			break;
		}

		case 'openCustomUrl': {
			const items = await chrome.storage.sync.get(['customGestureUrls']);
			const urls = items.customGestureUrls || {};
			let url = urls[request.pattern];
			if (url) {
				const protocolRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

				url = url.trim();

				if (!protocolRegex.test(url)) {
					url = 'http://' + url;
				}

				await chrome.tabs.create({ url: url, active: true });
			}
			break;
		}

		case 'openDownloads':
			{
				await chrome.tabs.create({ url: 'chrome://downloads', active: true });
			}
			break;

		case 'openHistory':
			{
				await chrome.tabs.create({ url: 'chrome://history', active: true });
			}
			break;

		case 'openExtensions':
			{
				await chrome.tabs.create({ url: 'chrome://extensions', active: true });
			}
			break;

		case 'duplicateTab':
			if (sender.tab?.id) {
				await chrome.tabs.duplicate(sender.tab.id);
			}
			break;

		case 'toggleMuteTab': {
			if (sender.tab?.id) {
				const tab = await chrome.tabs.get(sender.tab.id);
				await chrome.tabs.update(tab.id, { muted: !tab.mutedInfo.muted });
			}
			break;
		}

		case 'toggleMuteAllTabs': {
			const sessionItems = await chrome.storage.session.get([GLOBAL_MUTE_KEY]);
			const isMuted = sessionItems[GLOBAL_MUTE_KEY];
			const newState = !isMuted;

			await chrome.storage.session.set({ [GLOBAL_MUTE_KEY]: newState });
			const tabs = await chrome.tabs.query({});
			for (const tab of tabs) {
				await chrome.tabs.update(tab.id, { muted: newState });
			}
			break;
		}

		case 'gestureStateUpdate':
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					action: 'gestureStateUpdate',
					active: request.active
				}).catch(() => {
				});
			}
			break;

		case 'gestureHudUpdate':
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					action: 'gestureHudUpdate',
					data: request.data
				}).catch(() => {
				});
			}
			break;

		case 'gestureScrollUpdate':
			if (sender.tab?.id) {
				await chrome.tabs.sendMessage(sender.tab.id, {
					action: 'gestureScrollUpdate',
					data: request.data
				}).catch(() => {
				});
			}
			break;
	}
}));

chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === 'install') {
		chrome.tabs.create({
			url: chrome.runtime.getURL('pages/tutorial.html'),
			active: true
		});
	}

	if (details.reason === 'update' && details.previousVersion) {
		if (details.previousVersion.startsWith('1.0')) {
			chrome.storage.sync.get(['enableGestureCustomization'], (items) => {
				if (!items.enableGestureCustomization) {
					chrome.storage.sync.remove('gestures');
				}
			});
		}

		if (details.previousVersion.startsWith('1.1')) {
			chrome.storage.sync.get(['imageDragGestures'], (items) => {
				const gestures = items.imageDragGestures;
				if (Array.isArray(gestures)) {
					let changed = false;
					const newGestures = gestures.map(g => {
						if (g.action === 'customSearch') {
							changed = true;
							return {
								...g,
								action: 'imageSearch',
								engine: 'custom',
							};
						}
						return g;
					});

					if (changed) {
						chrome.storage.sync.set({ imageDragGestures: newGestures });
					}
				}
			});
		}
	}

	
});


const MENU_ID_REFRESH = 'flowmouse-need-refresh';
const MENU_ID_RESTRICTED = 'flowmouse-restricted';

function isRestrictedUrl(url) {
	if (!url) return true;

	if (url.startsWith(chrome.runtime.getURL(''))) {
		return false;
	}

	const restrictedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'about:', 'edge:', 'file:', 'view-source:', 'devtools:'];
	for (const protocol of restrictedProtocols) {
		if (url.startsWith(protocol)) return true;
	}

	{
		if (url.startsWith('https://chrome.google.com/webstore') ||
			url.startsWith('https://chromewebstore.google.com') ||
			url.startsWith('https://microsoftedge.microsoft.com/addons')) {
			return true;
		}
	}

	return false;
}

async function isContentScriptLoaded(tabId) {
	try {
		const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
		return response && response.pong === true;
	} catch (e) {
		return false;
	}
}

function getMsg(key, fallback) {
	try {
		const msg = chrome.i18n.getMessage(key);
		return msg || fallback;
	} catch (e) {
		return fallback;
	}
}

function removeAllMenus() {
	chrome.contextMenus.remove(MENU_ID_REFRESH, () => { chrome.runtime.lastError; });
	chrome.contextMenus.remove(MENU_ID_RESTRICTED, () => { chrome.runtime.lastError; });
}

function createRefreshMenu() {
	removeAllMenus();
	const title = chrome.i18n.getMessage('menuNeedRefresh');
	chrome.contextMenus.create({
		id: MENU_ID_REFRESH,
		title: title,
		contexts: ['all']
	}, () => { chrome.runtime.lastError; });
}

function createRestrictedMenu() {
	removeAllMenus();
	const title = chrome.i18n.getMessage('menuRestricted');
	chrome.contextMenus.create({
		id: MENU_ID_RESTRICTED,
		title: title,
		contexts: ['all']
	}, () => { chrome.runtime.lastError; });
}

function updateBadge(tabId, status) {
	if (status === 'normal') {
		chrome.action.setBadgeText({ tabId: tabId, text: '' });
	} else if (status === 'restricted') {
		chrome.action.setBadgeText({ tabId: tabId, text: '!' });
		chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#FFA500' }); 
	} else if (status === 'needRefresh') {
		chrome.action.setBadgeText({ tabId: tabId, text: '!' });
		chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#4285f4' }); 
	}
}

async function updateMenuForTab(tab) {
	const tabId = tab.id;
	const url = tab.url;
	const status = tab.status;

	const items = await chrome.storage.sync.get(['showRestrictedNotice', 'blacklist']);
	if (items.showRestrictedNotice === false) {
		removeAllMenus();
		updateBadge(tabId, 'normal');
		return;
	}

	try {
		if (url) {
			const urlObj = new URL(url);
			const hostname = urlObj.hostname;
			if (items.blacklist && items.blacklist.includes(hostname)) {
				removeAllMenus();
				updateBadge(tabId, 'normal');
				return;
			}
		}
	} catch (e) {
	}

	if (isRestrictedUrl(url)) {
		createRestrictedMenu();
		updateBadge(tabId, 'restricted');
	} else {
		const loaded = await isContentScriptLoaded(tabId);
		if (loaded) {
			removeAllMenus();
			updateBadge(tabId, 'normal');
		} else {
			if (status === 'loading') {
				removeAllMenus();
				updateBadge(tabId, 'normal');
				return;
			}

			createRefreshMenu();
			updateBadge(tabId, 'needRefresh');
		}
	}
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if ((changeInfo.status === 'loading' || changeInfo.status === 'complete') && tab.active) {
		updateMenuForTab(tab);
	}
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
	try {
		const tab = await chrome.tabs.get(activeInfo.tabId);
		updateMenuForTab(tab);
	} catch (e) {
	}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === MENU_ID_REFRESH) {
		if (tab && tab.id) {
			chrome.tabs.reload(tab.id);
		}
	} else if (info.menuItemId === MENU_ID_RESTRICTED) {
		const optionsUrl = chrome.runtime.getURL('pages/options.html');
		const targetUrl = optionsUrl + '#restricted-notice';

		const tabs = await chrome.tabs.query({});
		const existingTab = tabs.find(t => t.url && t.url.startsWith(optionsUrl));

		if (existingTab) {
			await chrome.tabs.update(existingTab.id, { url: targetUrl, active: true });
			await chrome.windows.update(existingTab.windowId, { focused: true });
		} else {
			chrome.tabs.create({ url: targetUrl });
		}
	}
});

chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === 'sync') {
		if (changes.showRestrictedNotice || changes.language) {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs[0]) {
					updateMenuForTab(tabs[0].id, tabs[0].url);
				}
			});
		}
	}
});

function getFilename(url, mimeType) {
	let filename = null;

	if (url && !url.startsWith('data:')) {
		try {
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			const name = pathname.substring(pathname.lastIndexOf('/') + 1);
			if (name && name.length > 0 && name.length < 255) {
				filename = decodeURIComponent(name);
			}
		} catch (e) {
		}
	}

	if (!filename) {
		filename = 'image';
	}

	if (mimeType) {
		const safeMime = mimeType.split(';')[0].trim().toLowerCase();
		const mimeMap = {
			'image/jpeg': '.jpg',
			'image/jpg': '.jpg',
			'image/png': '.png',
			'image/gif': '.gif',
			'image/webp': '.webp',
			'image/bmp': '.bmp',
			'image/svg+xml': '.svg',
			'image/x-icon': '.ico',
			'image/vnd.microsoft.icon': '.ico',
			'image/avif': '.avif',
			'image/jxl': '.jxl',
			'image/tiff': '.tiff'
		};

		const ext = mimeMap[safeMime];
		if (ext) {
			if (!/\.[a-zA-Z0-9]+$/i.test(filename)) {
				filename += ext;
			}
		} else if (safeMime.startsWith('image/')) {
			const subType = safeMime.split('/')[1];
			if (subType && /^[a-z0-9]+$/i.test(subType) && subType.length < 10) {
				if (!/\.[a-zA-Z0-9]+$/i.test(filename)) {
					filename += '.' + subType;
				}
			}
		}
	}

	return filename;
}

function findResourceInMhtml(mhtmlContent, targetUrl) {
	if (!mhtmlContent || !targetUrl) return null;

	const boundaryMatch = mhtmlContent.match(/Content-Type:\s*multipart\/related;[\s\S]*?boundary="?([^";\r\n]+)"?/i);
	if (!boundaryMatch) return null;

	const boundary = '--' + boundaryMatch[1];

	const parts = mhtmlContent.split(boundary);

	for (const part of parts) {
		if (!part || part.trim() === '--') continue;

		const headerEndIndex = part.indexOf('\r\n\r\n');
		if (headerEndIndex === -1) continue;

		const headersRaw = part.substring(0, headerEndIndex);
		const bodyRaw = part.substring(headerEndIndex + 4);

		const locationMatch = headersRaw.match(/Content-Location:\s*([^\r\n]+)/i);
		if (locationMatch) {
			const location = locationMatch[1].trim();

			if (location === targetUrl) {
				const typeMatch = headersRaw.match(/Content-Type:\s*([^\r\n;]+)/i);
				const encodingMatch = headersRaw.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);

				const type = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';
				const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : 'binary';

				let dataUrl = null;

				if (encoding === 'base64') {
					const cleanBody = bodyRaw.replace(/[\r\n\s]+/g, '');
					dataUrl = `data:${type};base64,${cleanBody}`;
				} else if (encoding === 'quoted-printable') {
					let decoded = bodyRaw.replace(/=(?:\r\n|\r|\n)/g, '');

					decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
						return String.fromCharCode(parseInt(hex, 16));
					});

					const base64 = btoa(decoded);
					dataUrl = `data:${type};base64,${base64}`;
				}

				return {
					type,
					encoding,
					dataUrl
				};
			}
		}
	}

	return null;
}

async function notifyDownloadError(tabId) {
	if (tabId) {
		await chrome.tabs.sendMessage(tabId, { action: 'showDownloadError' }).catch(() => { });
	}
}

async function requestPermission(permissions, windowId) {
	const hasPermission = await chrome.permissions.contains({ permissions: permissions });

	if (hasPermission) {
		return true;
	}

	return new Promise((resolve) => {
		const openPermissionWindow = async (winOptions) => {
			try {
				const popupWindow = await chrome.windows.create({
					url: chrome.runtime.getURL(`pages/permission.html?permissions=${permissions.join(',')}`),
					type: 'popup',
					width: 340,
					height: 380,
					left: winOptions?.left,
					top: winOptions?.top,
					focused: true
				});

				if (!popupWindow) {
					resolve(false);
					return;
				}

				const onRemoved = async (closedWindowId) => {
					if (closedWindowId === popupWindow.id) {
						chrome.windows.onRemoved.removeListener(onRemoved);
						const granted = await chrome.permissions.contains({ permissions: permissions });
						resolve(granted);
					}
				};
				chrome.windows.onRemoved.addListener(onRemoved);
			} catch (e) {
				console.error('Failed to open permission window:', e);
				resolve(false);
			}
		};

		if (windowId) {
			chrome.windows.get(windowId).then((win) => {
				const width = 340;
				const height = 380;
				const left = Math.round(win.left + (win.width - width) / 2);
				const top = Math.round(win.top + (win.height - height) / 2);
				openPermissionWindow({ left, top });
			}).catch(() => {
				openPermissionWindow(null);
			});
		} else {
			openPermissionWindow(null);
		}
	});
}