(function () {
    'use strict';
    let currentDomain = '';
    let blacklist = [];
    let isRestrictedPage = false;
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
        elements.currentDomain = document.getElementById('currentDomain');
        elements.blacklistStatus = document.getElementById('blacklistStatus');
        elements.toggleBlacklist = document.getElementById('toggleBlacklist');
        elements.openOptions = document.getElementById('openOptions');
        elements.enableTrail.addEventListener('change', saveQuickSettings);
        elements.enableHUD.addEventListener('change', saveQuickSettings);
        elements.toggleBlacklist.addEventListener('click', toggleBlacklist);
        elements.openOptions.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
            window.close();
        });
        waitForI18n().then(() => {
            loadAll();
        });
    }
    function waitForI18n() {
        return new Promise((resolve) => {
            if (window.i18n && window.i18n.getMessage) {
                setTimeout(resolve, 50);
            } else {
                const checkInterval = setInterval(() => {
                    if (window.i18n && window.i18n.getMessage) {
                        clearInterval(checkInterval);
                        setTimeout(resolve, 50);
                    }
                }, 20);
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 500);
            }
        });
    }
    function loadAll() {
        chrome.storage.sync.get(null, (items) => {
            elements.enableTrail.checked = items.enableTrail !== false;
            elements.enableHUD.checked = items.enableHUD !== false;
            blacklist = Array.isArray(items.blacklist) ? items.blacklist : [];
            let theme = items.theme || 'auto';
            if (theme === 'auto') {
                theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.body.setAttribute('data-theme', theme);
            loadCurrentSite();
        });
    }
    function loadCurrentSite() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                try {
                    const url = new URL(tabs[0].url);
                    if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:' ||
                        url.protocol === 'edge:' || url.protocol === 'about:' ||
                        url.protocol === 'file:') {
                        isRestrictedPage = true;
                        elements.currentDomain.textContent = msg('popupRestricted');
                        elements.currentDomain.className = 'domain not-available';
                        elements.toggleBlacklist.disabled = true;
                        elements.toggleBlacklist.textContent = msg('popupNotAvailable');
                        return;
                    }
                    currentDomain = url.hostname;
                    elements.currentDomain.textContent = currentDomain;
                    updateBlacklistUI();
                } catch (e) {
                    elements.currentDomain.textContent = '-';
                    elements.currentDomain.className = 'domain not-available';
                    elements.toggleBlacklist.disabled = true;
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
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    setTimeout(() => {
                        chrome.tabs.reload(tabs[0].id);
                        window.close();
                    }, 200);
                }
            });
        });
    }
    document.addEventListener('DOMContentLoaded', init);
})();
