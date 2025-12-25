(function () {
    'use strict';
    const { DEFAULT_GESTURES, ACTION_KEYS, DEFAULT_SETTINGS } = window.GestureConstants;
    let currentSettings = { ...DEFAULT_SETTINGS };
    let saveTimeout = null;
    const elements = {};
    function msg(key) {
        if (window.i18n && window.i18n.getMessage) {
            return window.i18n.getMessage(key);
        }
        return chrome.i18n.getMessage(key) || key;
    }
    function init() {
        elements.theme = document.getElementById('theme');
        elements.language = document.getElementById('language');
        elements.enableTrail = document.getElementById('enableTrail');
        elements.enableHUD = document.getElementById('enableHUD');
        elements.trailSettings = document.getElementById('trailSettings');
        elements.hudSettings = document.getElementById('hudSettings');
        elements.enableTextDrag = document.getElementById('enableTextDrag');
        elements.textDragSettings = document.getElementById('textDragSettings');
        elements.enableImageDrag = document.getElementById('enableImageDrag');
        elements.enableLinkDrag = document.getElementById('enableLinkDrag');
        elements.searchEngine = document.getElementById('searchEngine');
        elements.customSearchUrl = document.getElementById('customSearchUrl');
        elements.trailColor = document.getElementById('trailColor');
        elements.trailWidth = document.getElementById('trailWidth');
        elements.hudBgColor = document.getElementById('hudBgColor');
        elements.hudBgOpacity = document.getElementById('hudBgOpacity');
        elements.hudTextColor = document.getElementById('hudTextColor');
        elements.enableGestureCustomization = document.getElementById('enableGestureCustomization');
        elements.gestureGridContainer = document.getElementById('gestureGridContainer');
        elements.gestureGrid = document.getElementById('gestureGrid');
        elements.blacklistInput = document.getElementById('blacklistInput');
        elements.blacklistList = document.getElementById('blacklistList');
        elements.status = document.getElementById('status');
        elements.syncText = document.getElementById('syncText');
        elements.syncTime = document.getElementById('syncTime');
        document.getElementById('resetSettings').addEventListener('click', resetSettings);
        document.getElementById('exportSettings').addEventListener('click', exportSettings);
        document.getElementById('importSettings').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', importSettings);
        document.getElementById('addDomain').addEventListener('click', addDomainFromInput);
        document.getElementById('syncUpload').addEventListener('click', syncUpload);
        document.getElementById('syncDownload').addEventListener('click', syncDownload);
        elements.blacklistInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addDomainFromInput();
        });
        bindAutoSaveEvents();
        loadSettings();
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                if (changes.blacklist) {
                    currentSettings.blacklist = changes.blacklist.newValue || [];
                    renderBlacklist();
                }
                if (changes.enableTrail !== undefined) {
                    elements.enableTrail.checked = changes.enableTrail.newValue;
                    updateUIState();
                }
                if (changes.enableHUD !== undefined) {
                    elements.enableHUD.checked = changes.enableHUD.newValue;
                    updateUIState();
                }
            }
        });
    }
    function bindAutoSaveEvents() {
        elements.theme.addEventListener('change', () => {
            applyTheme(elements.theme.value);
            autoSave();
        });
        elements.language.addEventListener('change', () => {
            autoSave();
            setTimeout(() => location.reload(), 300);
        });
        const toggles = ['enableTrail', 'enableHUD', 'enableTextDrag', 'enableImageDrag',
            'enableLinkDrag', 'enableGestureCustomization'];
        toggles.forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                updateUIState();
                autoSave();
            });
        });
        const inputs = ['trailColor', 'trailWidth', 'hudBgColor', 'hudBgOpacity',
            'hudTextColor', 'searchEngine', 'customSearchUrl'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('change', autoSave);
            if (el.type === 'number' || el.type === 'text') {
                el.addEventListener('input', debounceAutoSave);
            }
        });
        elements.searchEngine.addEventListener('change', () => {
            elements.customSearchUrl.style.display = elements.searchEngine.value === 'custom' ? 'block' : 'none';
        });
    }
    function applyTheme(theme) {
        if (window.i18n && window.i18n.applyTheme) {
            window.i18n.applyTheme(theme);
        } else {
            let actualTheme = theme;
            if (theme === 'auto') {
                actualTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.body.setAttribute('data-theme', actualTheme);
        }
    }
    function updateUIState() {
        elements.trailSettings.classList.toggle('show', elements.enableTrail.checked);
        elements.hudSettings.classList.toggle('show', elements.enableHUD.checked);
        elements.textDragSettings.classList.toggle('show', elements.enableTextDrag.checked);
        elements.gestureGridContainer.style.display = elements.enableGestureCustomization.checked ? 'block' : 'none';
    }
    function debounceAutoSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(autoSave, 500);
    }
    function autoSave() {
        const gestures = {};
        elements.gestureGrid.querySelectorAll('select').forEach(select => {
            gestures[select.dataset.pattern] = select.value;
        });
        const now = new Date().toISOString();
        const settings = {
            theme: elements.theme.value,
            language: elements.language.value,
            enableTrail: elements.enableTrail.checked,
            enableHUD: elements.enableHUD.checked,
            enableTextDrag: elements.enableTextDrag.checked,
            enableImageDrag: elements.enableImageDrag.checked,
            enableLinkDrag: elements.enableLinkDrag.checked,
            searchEngine: elements.searchEngine.value,
            customSearchUrl: elements.customSearchUrl.value,
            trailColor: elements.trailColor.value,
            trailWidth: parseInt(elements.trailWidth.value) || 5,
            hudBgColor: elements.hudBgColor.value,
            hudBgOpacity: parseInt(elements.hudBgOpacity.value) || 70,
            hudTextColor: elements.hudTextColor.value,
            enableGestureCustomization: elements.enableGestureCustomization.checked,
            gestures: gestures,
            blacklist: currentSettings.blacklist || [],
            lastSyncTime: now
        };
        chrome.storage.sync.set(settings, () => {
            currentSettings = settings;
            updateSyncStatus(now);
            showStatus(msg('autoSaved') || '✓ 已自动保存');
        });
    }
    function updateSyncStatus(timeStr) {
        if (timeStr) {
            const date = new Date(timeStr);
            const timeDisplay = date.toLocaleTimeString();
            elements.syncTime.textContent = timeDisplay;
        }
    }
    function loadSettings() {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
            currentSettings = { ...DEFAULT_SETTINGS, ...items };
            if (!currentSettings.gestures || Object.keys(currentSettings.gestures).length === 0) {
                currentSettings.gestures = { ...DEFAULT_GESTURES };
            }
            applySettingsToUI();
        });
    }
    function applySettingsToUI() {
        elements.theme.value = currentSettings.theme || 'dark';
        elements.language.value = currentSettings.language || 'auto';
        applyTheme(currentSettings.theme || 'dark');
        elements.enableTrail.checked = currentSettings.enableTrail;
        elements.enableHUD.checked = currentSettings.enableHUD;
        elements.enableTextDrag.checked = currentSettings.enableTextDrag;
        elements.enableImageDrag.checked = currentSettings.enableImageDrag;
        elements.enableLinkDrag.checked = currentSettings.enableLinkDrag;
        elements.searchEngine.value = currentSettings.searchEngine;
        elements.customSearchUrl.value = currentSettings.customSearchUrl || '';
        elements.customSearchUrl.style.display = currentSettings.searchEngine === 'custom' ? 'block' : 'none';
        elements.trailColor.value = currentSettings.trailColor;
        elements.trailWidth.value = currentSettings.trailWidth;
        elements.hudBgColor.value = currentSettings.hudBgColor;
        elements.hudBgOpacity.value = currentSettings.hudBgOpacity;
        elements.hudTextColor.value = currentSettings.hudTextColor;
        elements.enableGestureCustomization.checked = currentSettings.enableGestureCustomization;
        updateUIState();
        generateGestureGrid();
        renderBlacklist();
        if (currentSettings.lastSyncTime) {
            updateSyncStatus(currentSettings.lastSyncTime);
        }
    }
    function generateGestureGrid() {
        const gestures = currentSettings.gestures || DEFAULT_GESTURES;
        const patterns = Object.keys(DEFAULT_GESTURES);
        let html = '';
        patterns.forEach(pattern => {
            const currentAction = gestures[pattern] || DEFAULT_GESTURES[pattern];
            html += `
        <div class="gesture-item">
          <div class="gesture-pattern">${pattern}</div>
          <select data-pattern="${pattern}">
            ${Object.entries(ACTION_KEYS).map(([value, key]) =>
                `<option value="${value}" ${currentAction === value ? 'selected' : ''}>${msg(key) || value}</option>`
            ).join('')}
          </select>
        </div>
      `;
        });
        elements.gestureGrid.innerHTML = html;
        elements.gestureGrid.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', autoSave);
        });
    }
    function renderBlacklist() {
        const blacklist = currentSettings.blacklist || [];
        if (blacklist.length === 0) {
            elements.blacklistList.innerHTML = `<span class="empty-list">${msg('emptyBlacklist') || '暂无黑名单'}</span>`;
            return;
        }
        let html = '';
        blacklist.forEach((domain, index) => {
            html += `
        <div class="blacklist-tag">
          <span>${domain}</span>
          <button class="delete-btn" data-index="${index}">×</button>
        </div>
      `;
        });
        elements.blacklistList.innerHTML = html;
        elements.blacklistList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                currentSettings.blacklist.splice(index, 1);
                renderBlacklist();
                autoSave();
            });
        });
    }
    function addDomainFromInput() {
        const domain = elements.blacklistInput.value.trim().toLowerCase();
        if (!domain) return;
        if (!domain.includes('.')) {
            showStatus(msg('invalidDomain') || '请输入有效的域名', 'error');
            return;
        }
        if (!currentSettings.blacklist) {
            currentSettings.blacklist = [];
        }
        if (currentSettings.blacklist.includes(domain)) {
            showStatus(msg('domainExists') || '该域名已在黑名单中', 'error');
            return;
        }
        currentSettings.blacklist.push(domain);
        elements.blacklistInput.value = '';
        renderBlacklist();
        autoSave();
    }
    function resetSettings() {
        if (confirm(msg('resetConfirm') || '确定要恢复所有设置为默认值吗？')) {
            chrome.storage.sync.clear(() => {
                currentSettings = { ...DEFAULT_SETTINGS };
                applySettingsToUI();
                showStatus(msg('resetDone') || '已恢复默认设置');
            });
        }
    }
    function exportSettings() {
        const dataStr = JSON.stringify(currentSettings, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mouse-gesture-settings.json';
        a.click();
        URL.revokeObjectURL(url);
        showStatus(msg('exportDone') || '配置已导出');
    }
    function importSettings(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                const merged = { ...DEFAULT_SETTINGS, ...imported };
                chrome.storage.sync.set(merged, () => {
                    currentSettings = merged;
                    applySettingsToUI();
                    showStatus(msg('importDone') || '配置已导入');
                });
            } catch (err) {
                showStatus(msg('importFailed') || '导入失败', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
    function syncUpload() {
        autoSave();
        showStatus(msg('syncUploaded') || '配置已上传到云端');
    }
    function syncDownload() {
        chrome.storage.sync.get(null, (items) => {
            if (items && Object.keys(items).length > 0) {
                currentSettings = { ...DEFAULT_SETTINGS, ...items };
                applySettingsToUI();
                showStatus(msg('syncDownloaded') || '已从云端下载配置');
            } else {
                showStatus(msg('syncDownloaded') || '云端无配置或已是最新');
            }
        });
    }
    function showStatus(message, type = 'success') {
        elements.status.textContent = message;
        elements.status.style.background = type === 'error' ? '#ea4335' : '#34a853';
        elements.status.classList.add('show');
        setTimeout(() => {
            elements.status.classList.remove('show');
        }, 1500);
    }
    document.addEventListener('DOMContentLoaded', () => {
        const waitForI18n = () => {
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
        };
        waitForI18n().then(init);
    });
})();
