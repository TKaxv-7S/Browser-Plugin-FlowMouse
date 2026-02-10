(function () {
	'use strict';

	let currentDomain = '';
	let blacklist = [];
	let isRestrictedPage = false;
	let currentTabId = null;

	const elements = {};

	function msg(key) {
		if (window.i18n && window.i18n.getMessage) {
			return window.i18n.getMessage(key);
		}
		return chrome.i18n.getMessage(key) || key;
	}

	function init() {
		elements.enableTrail = document.getElementById('enableTrail');
		elements.enableHUD = document.getElementById('enableHUD');
		elements.trailRow = document.getElementById('trailRow');
		elements.hudRow = document.getElementById('hudRow');
		elements.gesturesInfo = document.getElementById('gesturesInfo');
		elements.currentDomain = document.getElementById('currentDomain');
		elements.blacklistStatus = document.getElementById('blacklistStatus');
		elements.toggleBlacklist = document.getElementById('toggleBlacklist');
		elements.openOptions = document.getElementById('openOptions');
		elements.needRefreshNotice = document.getElementById('needRefreshNotice');
		elements.restrictedNotice = document.getElementById('restrictedNotice');
		elements.refreshPageBtn = document.getElementById('refreshPageBtn');
		elements.learnMoreBtn = document.getElementById('learnMoreBtn');

		elements.enableTrail.addEventListener('change', saveQuickSettings);
		elements.enableHUD.addEventListener('change', saveQuickSettings);
		elements.toggleBlacklist.addEventListener('click', toggleBlacklist);
		elements.openOptions.addEventListener('click', () => {
			chrome.runtime.openOptionsPage();
			window.close();
		});

		if (elements.refreshPageBtn) {
			elements.refreshPageBtn.addEventListener('click', () => {
				if (currentTabId) {
					chrome.tabs.reload(currentTabId);
					window.close();
				}
			});
		}
		if (elements.learnMoreBtn) {
			elements.learnMoreBtn.addEventListener('click', async () => {
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
				window.close();
			});
		}

		renderGestureIcons();

		window.i18n.waitForInit().then(loadAll);

		updateVersionFromManifest();
	}

	function renderGestureIcons() {
		if (!window.GestureConstants || !window.GestureConstants.arrowsToSvg) return;
		document.querySelectorAll('.gesture-pattern').forEach(el => {
			el.innerHTML = window.GestureConstants.arrowsToSvg(el.textContent);
		});
	}

	function updateVersionFromManifest() {
		const manifest = chrome.runtime.getManifest();
		const version = manifest.version;
		document.querySelectorAll('.version-from-manifest').forEach(el => {
			el.textContent = `v${version}`;
		});
	}

	function loadAll() {
		chrome.storage.sync.get(null, (items) => {
			const gestureEnabled = items.enableGesture !== false;
			elements.enableTrail.checked = items.enableTrail !== false;
			elements.enableHUD.checked = items.enableHUD !== false;

			updateGestureUI(gestureEnabled);

			blacklist = Array.isArray(items.blacklist) ? items.blacklist : [];

			let theme = items.theme || 'auto';
			if (theme === 'auto') {
				theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			}
			document.body.setAttribute('data-theme', theme);

			loadCurrentSite();
		});
	}

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

	function showNeedRefreshNotice() {
		if (elements.gesturesInfo) elements.gesturesInfo.style.display = 'none';
		if (elements.needRefreshNotice) elements.needRefreshNotice.classList.add('show');
		if (elements.restrictedNotice) elements.restrictedNotice.classList.remove('show');
	}

	function showRestrictedNotice() {
		if (elements.gesturesInfo) elements.gesturesInfo.style.display = 'none';
		if (elements.needRefreshNotice) elements.needRefreshNotice.classList.remove('show');
		if (elements.restrictedNotice) elements.restrictedNotice.classList.add('show');
	}

	function loadCurrentSite() {
		chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
			if (tabs[0] && tabs[0].url) {
				currentTabId = tabs[0].id;
				const url = tabs[0].url;

				if (isRestrictedUrl(url)) {
					isRestrictedPage = true;
					elements.currentDomain.textContent = msg('popupRestricted');
					elements.currentDomain.className = 'domain not-available';
					elements.toggleBlacklist.disabled = true;
					elements.toggleBlacklist.textContent = msg('popupNotAvailable');
					showRestrictedNotice();
					return;
				}

				let hostname = '';
				try {
					const urlObj = new URL(url);
					hostname = urlObj.hostname;
					currentDomain = hostname;
					
					if (url.startsWith(chrome.runtime.getURL(''))) {
						elements.currentDomain.textContent = msg('extName');
					} else {
						elements.currentDomain.textContent = currentDomain;
					}
				} catch (e) {
					elements.currentDomain.textContent = '-';
				}

				if (blacklist.includes(currentDomain)) {
					updateBlacklistUI();
					return;
				}

				const loaded = await isContentScriptLoaded(currentTabId);
				if (!loaded) {
					showNeedRefreshNotice();
					elements.toggleBlacklist.disabled = true;
					elements.toggleBlacklist.textContent = msg('popupNotAvailable');
					return;
				}
			}
		});
	}

	function updateBlacklistUI() {
		if (isRestrictedPage || !currentDomain) return;

		const isBlacklisted = blacklist.includes(currentDomain);

		if (isBlacklisted) {
			elements.blacklistStatus.textContent = ` (${msg('popupDisabled')})`;
			elements.blacklistStatus.className = 'blacklisted';
			elements.toggleBlacklist.textContent = msg('popupRemoveBlacklist');
			elements.toggleBlacklist.classList.add('btn-danger');
			elements.toggleBlacklist.classList.remove('btn-secondary');
		} else {
			elements.blacklistStatus.textContent = '';
			elements.blacklistStatus.className = '';
			elements.toggleBlacklist.textContent = msg('popupAddBlacklist');
			elements.toggleBlacklist.classList.remove('btn-danger');
			elements.toggleBlacklist.classList.add('btn-secondary');
		}
	}

	function updateGestureUI(enabled) {
		const opacity = enabled ? '1' : '0.5';
		const pointerEvents = enabled ? 'auto' : 'none';

		if (elements.trailRow) {
			elements.trailRow.style.opacity = opacity;
			elements.trailRow.style.pointerEvents = pointerEvents;
		}
		if (elements.hudRow) {
			elements.hudRow.style.opacity = opacity;
			elements.hudRow.style.pointerEvents = pointerEvents;
		}
		if (elements.gesturesInfo) {
			elements.gesturesInfo.style.opacity = opacity;
		}
	}

	function saveQuickSettings() {
		chrome.storage.sync.set({
			enableTrail: elements.enableTrail.checked,
			enableHUD: elements.enableHUD.checked,
			lastSyncTime: new Date().toISOString()
		});
	}

	function toggleBlacklist() {
		if (!currentDomain || isRestrictedPage) return;

		elements.toggleBlacklist.disabled = true;
		elements.toggleBlacklist.textContent = '...';

		const isBlacklisted = blacklist.includes(currentDomain);
		if (isBlacklisted) {
			blacklist = blacklist.filter(d => d !== currentDomain);
		} else {
			blacklist.push(currentDomain);
		}

		chrome.storage.sync.set({
			blacklist: blacklist,
			lastSyncTime: new Date().toISOString()
		}, () => {
			if (chrome.runtime.lastError) {
				elements.toggleBlacklist.disabled = false;
				updateBlacklistUI();
				return;
			}

			updateBlacklistUI();
			elements.toggleBlacklist.disabled = false;
		});
	}

	init();
})();