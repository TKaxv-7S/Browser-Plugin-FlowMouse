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
        elements.enableGesture = document.getElementById('enableGesture');
        elements.gestureSettingsGroup = document.getElementById('gestureSettingsGroup');
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
        elements.gestureMappingSection = document.getElementById('gestureMappingSection');
        elements.gestureGrid = document.getElementById('gestureGrid');
        elements.blacklistInput = document.getElementById('blacklistInput');
        elements.blacklistList = document.getElementById('blacklistList');
        elements.status = document.getElementById('status');
        elements.syncText = document.getElementById('syncText');
        elements.syncTime = document.getElementById('syncTime');
        elements.enableAdvancedSettings = document.getElementById('enableAdvancedSettings');
        elements.scrollAmount = document.getElementById('scrollAmount');
        elements.scrollAmountValue = document.getElementById('scrollAmountValue');
        elements.showTrailOrigin = document.getElementById('showTrailOrigin');
        elements.gestureCanvas = document.getElementById('gestureCanvas');
        elements.drawnPattern = document.getElementById('drawnPattern');
        elements.customGestureAction = document.getElementById('customGestureAction');
        elements.clearCanvas = document.getElementById('clearCanvas');
        elements.addCustomGesture = document.getElementById('addCustomGesture');
        elements.gestureModal = document.getElementById('gestureModal');
        elements.openGestureDrawer = document.getElementById('openGestureDrawer');
        elements.closeGestureModal = document.getElementById('closeGestureModal');
        elements.directionHints = document.getElementById('directionHints');
        elements.newTabPosition = document.getElementById('newTabPosition');
        elements.newTabActive = document.getElementById('newTabActive');
        elements.textDragTable = document.getElementById('textDragTable');
        elements.linkDragTable = document.getElementById('linkDragTable');
        elements.imageDragTable = document.getElementById('imageDragTable');
        elements.imageSearchUrl = document.getElementById('imageSearchUrl');
        elements.imageSearchUrlContainer = document.getElementById('imageSearchUrlContainer');
        elements.advancedDragSettings = document.getElementById('advancedDragSettings');

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

        updateVersionFromManifest();

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

        const isMacOrLinux = /Mac|Linux/i.test(navigator.platform);
        const macLinuxNotice = document.getElementById('macLinuxNotice');
        if (isMacOrLinux && macLinuxNotice) {
            macLinuxNotice.style.display = 'block';
        }

        const isMac = /Mac/i.test(navigator.platform);
        const macTextDragNotice = document.getElementById('macTextDragNotice');
        if (isMac && macTextDragNotice) {
            macTextDragNotice.style.display = 'block';
        }

        initGestureCanvas();
    }

    let canvasState = {
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        pattern: [],
        trail: [],
        ctx: null,
        distanceThreshold: 30
    };

    function initGestureCanvas() {
        if (!elements.gestureCanvas) return;

        canvasState.ctx = elements.gestureCanvas.getContext('2d');
        const canvas = elements.gestureCanvas;
        const ctx = canvasState.ctx;

        if (elements.customGestureAction) {
            let optionsHtml = '';
            Object.entries(ACTION_KEYS).forEach(([value, key]) => {
                optionsHtml += `<option value="${value}">${msg(key) || value}</option>`;
            });
            elements.customGestureAction.innerHTML = optionsHtml;
        }

        if (elements.openGestureDrawer) {
            elements.openGestureDrawer.addEventListener('click', () => {
                openGestureModal();
            });
        }

        if (elements.closeGestureModal) {
            elements.closeGestureModal.addEventListener('click', closeGestureModal);
        }

        if (elements.gestureModal) {
            elements.gestureModal.querySelector('.modal-overlay')?.addEventListener('click', closeGestureModal);
        }

        if (elements.customGestureAction) {
            elements.customGestureAction.addEventListener('change', (e) => {
                if (e.target.value === 'openCustomUrl') {
                    let currentUrl = e.target.dataset.customUrl || '';
                    const url = prompt(msg('enterCustomUrl') || '请输入完整网址（建议包含协议，如 https://）：', currentUrl);

                    if (url === null) {
                        e.target.value = 'none';
                        return;
                    }

                    e.target.dataset.customUrl = url.trim();
                    const option = e.target.querySelector('option[value="openCustomUrl"]');
                    if (option) {
                        const baseLabel = msg('actionOpenCustomUrl') || '打开自定义网址';
                        option.textContent = url.trim() ? `${baseLabel} (${url.length > 20 ? url.substring(0, 20) + '...' : url})` : baseLabel;
                    }
                }
            });
        }

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return;
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            canvasState.isDrawing = true;
            canvasState.lastX = e.clientX - rect.left;
            canvasState.lastY = e.clientY - rect.top;
            canvasState.pattern = [];
            canvasState.trail = [{ x: canvasState.lastX, y: canvasState.lastY }];
            clearCanvas();
            updatePatternDisplay();
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!canvasState.isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            canvasState.trail.push({ x, y });

            const trailColor = currentSettings.trailColor || '#4285f4';
            const trailWidth = parseInt(currentSettings.trailWidth || 5);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (canvasState.trail.length >= 2) {
                ctx.beginPath();
                ctx.strokeStyle = trailColor;
                ctx.lineWidth = trailWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.moveTo(canvasState.trail[0].x, canvasState.trail[0].y);
                for (let i = 1; i < canvasState.trail.length; i++) {
                    ctx.lineTo(canvasState.trail[i].x, canvasState.trail[i].y);
                }
                ctx.stroke();
            }

            if (currentSettings.showTrailOrigin !== false && canvasState.trail.length > 0) {
                const originRadius = Math.max(trailWidth * 1.2, 4);
                ctx.beginPath();
                ctx.fillStyle = trailColor;
                ctx.arc(canvasState.trail[0].x, canvasState.trail[0].y, originRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            const dx = x - canvasState.lastX;
            const dy = y - canvasState.lastY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > canvasState.distanceThreshold) {
                const dir = getDrawingDirection(dx, dy);
                if (dir && canvasState.pattern[canvasState.pattern.length - 1] !== dir) {
                    canvasState.pattern.push(dir);
                    updatePatternDisplay();
                }
                canvasState.lastX = x;
                canvasState.lastY = y;
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                canvasState.isDrawing = false;
            }
        });

        canvas.addEventListener('mouseleave', () => {
            canvasState.isDrawing = false;
        });

        if (elements.clearCanvas) {
            elements.clearCanvas.addEventListener('click', () => {
                clearCanvas();
                canvasState.pattern = [];
                updatePatternDisplay();
            });
        }

        if (elements.addCustomGesture) {
            elements.addCustomGesture.addEventListener('click', addCustomGestureHandler);
        }
    }

    function getDrawingDirection(dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? '→' : '←';
        } else {
            return dy > 0 ? '↓' : '↑';
        }
    }

    function clearCanvas() {
        if (canvasState.ctx && elements.gestureCanvas) {
            canvasState.ctx.clearRect(0, 0, elements.gestureCanvas.width, elements.gestureCanvas.height);
        }
    }

    function openGestureModal() {
        if (!elements.gestureModal) return;

        clearCanvas();
        canvasState.pattern = [];
        updatePatternDisplay();

        updateDirectionHints();

        elements.gestureModal.style.display = 'flex';
    }

    function closeGestureModal() {
        if (elements.gestureModal) {
            elements.gestureModal.style.display = 'none';
        }
    }

    function updateDirectionHints() {
    }

    function updatePatternDisplay() {
        if (elements.drawnPattern) {
            elements.drawnPattern.textContent = canvasState.pattern.length > 0 ? canvasState.pattern.join('') : '-';
        }
    }

    function addCustomGestureHandler() {
        const pattern = canvasState.pattern.join('');
        if (!pattern) {
            alert(msg('pleaseDrawGesture') || '请先绘制手势');
            return;
        }

        const existingAction = (currentSettings.gestures && currentSettings.gestures[pattern]) || null;
        if (existingAction && existingAction !== 'none') {
            const confirmMsg = (msg('gestureOverwriteConfirm') || `手势 ${pattern} 已存在，是否覆盖？`).replace('%pattern%', pattern);
            if (!confirm(confirmMsg)) {
                return;
            }
        }

        const action = elements.customGestureAction ? elements.customGestureAction.value : 'none';
        const customUrl = elements.customGestureAction ? (elements.customGestureAction.dataset.customUrl || '') : '';

        if (!currentSettings.customGestures) {
            currentSettings.customGestures = {};
        }
        currentSettings.customGestures[pattern] = action;

        if (customUrl) {
            if (!currentSettings.customGestureUrls) {
                currentSettings.customGestureUrls = {};
            }
            currentSettings.customGestureUrls[pattern] = customUrl;
        }

        if (!currentSettings.gestures) {
            currentSettings.gestures = { ...DEFAULT_GESTURES };
        }
        currentSettings.gestures[pattern] = action;

        chrome.storage.sync.set({
            customGestures: currentSettings.customGestures,
            gestures: currentSettings.gestures,
            customGestureUrls: currentSettings.customGestureUrls
        }, () => {
            showStatus(msg('gestureAdded') || `✓ 手势 ${pattern} 已添加`);
            closeGestureModal();
            clearCanvas();
            canvasState.pattern = [];
            updatePatternDisplay();
            generateGestureGrid();
        });
    }

    function updateVersionFromManifest() {
        const manifest = chrome.runtime.getManifest();
        const version = manifest.version;
        document.querySelectorAll('.version-from-manifest').forEach(el => {
            el.textContent = `v${version} `;
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

        const toggles = ['enableGesture', 'enableTrail', 'enableHUD', 'enableTextDrag', 'enableImageDrag',
            'enableLinkDrag', 'enableGestureCustomization', 'enableAdvancedSettings', 'showTrailOrigin'];
        toggles.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    updateUIState();
                    autoSave();
                });
            }
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

        if (elements.newTabPosition) {
            elements.newTabPosition.addEventListener('change', autoSave);
        }
        if (elements.newTabActive) {
            elements.newTabActive.addEventListener('change', autoSave);
        }
        if (elements.imageSearchUrl) {
            elements.imageSearchUrl.addEventListener('input', debounceAutoSave);
        }
        if (elements.scrollAmount) {
            elements.scrollAmount.addEventListener('input', () => {
                if (elements.scrollAmountValue) {
                    elements.scrollAmountValue.textContent = elements.scrollAmount.value + '%';
                }
                debounceAutoSave();
            });
        }
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
        const gestureEnabled = elements.enableGesture.checked;

        if (elements.gestureSettingsGroup) {
            elements.gestureSettingsGroup.style.display = gestureEnabled ? 'block' : 'none';
        }
        if (elements.gestureMappingSection) {
            elements.gestureMappingSection.style.display = gestureEnabled ? 'block' : 'none';
        }

        elements.trailSettings.classList.toggle('show', elements.enableTrail.checked);
        elements.hudSettings.classList.toggle('show', elements.enableHUD.checked);
        elements.textDragSettings.classList.toggle('show', elements.enableTextDrag.checked);
        elements.gestureGridContainer.style.display = elements.enableGestureCustomization.checked ? 'block' : 'none';

        const advancedEnabled = elements.enableAdvancedSettings && elements.enableAdvancedSettings.checked;
        document.querySelectorAll('.advanced-setting').forEach(el => {
            el.style.display = advancedEnabled ? '' : 'none';
        });

        const settingsContainer = document.querySelector('.container');
        if (settingsContainer) {
            settingsContainer.classList.toggle('advanced-mode', advancedEnabled);
        }

        if (advancedEnabled) {
            renderDragGestureTables();
        }
    }

    function renderDragGestureTables() {
        const { TEXT_DRAG_ACTIONS, LINK_DRAG_ACTIONS, IMAGE_DRAG_ACTIONS, TAB_POSITIONS } = window.GestureConstants;
        const directions = ['→', '←', '↑', '↓'];

        const renderDirectionSelect = (current, usedDirs) => {
            return directions.map(dir =>
                `<option value="${dir}" ${current === dir ? 'selected' : ''} ${usedDirs.includes(dir) && current !== dir ? 'disabled' : ''}>${dir}</option>`
            ).join('');
        };

        const renderPositionSelect = (current) => {
            return Object.entries(TAB_POSITIONS).map(([value, key]) =>
                `<option value="${value}" ${current === value ? 'selected' : ''}>${msg(key) || value}</option>`
            ).join('');
        };

        const renderEngineSelect = (current) => {
            const engines = [['google', 'Google'], ['bing', 'Bing'], ['baidu', '百度'], ['360', '360搜索'], ['custom', msg('custom') || '自定义']];
            return engines.map(([v, l]) => `<option value="${v}" ${current === v ? 'selected' : ''}>${l}</option>`).join('');
        };

        const renderContainer = (containerId, gestures, actions, type) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            let gestureArray = Array.isArray(gestures) ? gestures :
                (gestures && typeof gestures === 'object' ?
                    Object.entries(gestures).filter(([_, cfg]) => cfg && cfg.action && cfg.action !== 'none')
                        .map(([dir, cfg]) => ({ direction: dir, ...cfg })) :
                    [{ direction: '→', action: type === 'text' ? 'search' : 'openTab', position: 'right', active: true }]);

            if (gestureArray.length === 0) {
                gestureArray = [{ direction: '→', action: type === 'text' ? 'search' : 'openTab', position: 'right', active: true }];
            }

            const usedDirs = gestureArray.map(g => g.direction);

            let html = '';
            gestureArray.forEach((cfg, index) => {
                const action = cfg.action || (type === 'text' ? 'search' : 'openTab');
                const position = cfg.position || 'right';
                const active = cfg.active !== false;
                const engine = cfg.engine || 'google';
                const url = cfg.url || '';
                const direction = cfg.direction || '→';

                const showPosActive = ['openTab', 'search', 'customSearch'].includes(action);
                const showEngine = type === 'text' && action === 'search';
                const showUrl = (type === 'text' && action === 'search' && engine === 'custom') ||
                    (type === 'image' && action === 'customSearch');

                html += `<div class="drag-row" data-index="${index}" data-type="${type}">
                    <select class="direction-select">${renderDirectionSelect(direction, usedDirs)}</select>
                    <select class="position-select" style="${showPosActive ? '' : 'display:none'}">${renderPositionSelect(position)}</select>
                    <label class="active-label" style="${showPosActive ? '' : 'display:none'}"><input type="checkbox" class="active-check" ${active ? 'checked' : ''}>${msg('newTabActive') || '前台'}</label>
                    <select class="action-select">${Object.entries(actions).map(([v, k]) => `<option value="${v}" ${action === v ? 'selected' : ''}>${msg(k) || v}</option>`).join('')}</select>
                    ${type === 'text' ? `<select class="engine-select" style="${showEngine ? '' : 'display:none'}">${renderEngineSelect(engine)}</select>` : ''}
                    <input type="text" class="url-input" placeholder="${type === 'text' ? '%s=搜索词' : '%s=图片地址'}" value="${url}" style="${showUrl ? '' : 'display:none'}">
                    <button type="button" class="drag-delete-btn" ${gestureArray.length <= 1 ? 'style="visibility:hidden"' : ''}>×</button>
                </div>`;
            });
            container.innerHTML = html;

            container.querySelectorAll('.drag-row').forEach(row => {
                const index = parseInt(row.dataset.index);
                const dragType = row.dataset.type;
                const settingsKey = `${dragType}DragGestures`;

                const saveAndRerender = () => {
                    const arr = currentSettings[settingsKey] || [];
                    const dirSelect = row.querySelector('.direction-select');
                    const posSelect = row.querySelector('.position-select');
                    const actSelect = row.querySelector('.action-select');
                    const activeCheck = row.querySelector('.active-check');
                    const engineSelect = row.querySelector('.engine-select');
                    const urlInput = row.querySelector('.url-input');

                    arr[index] = {
                        direction: dirSelect.value,
                        action: actSelect.value,
                        position: posSelect.value,
                        active: activeCheck.checked,
                        engine: engineSelect ? engineSelect.value : 'google',
                        url: urlInput ? urlInput.value : ''
                    };
                    currentSettings[settingsKey] = arr;
                    debounceAutoSave();
                };

                row.querySelector('.direction-select').addEventListener('change', () => { saveAndRerender(); renderContainer(containerId, currentSettings[settingsKey], actions, type); });
                row.querySelector('.position-select').addEventListener('change', saveAndRerender);
                row.querySelector('.active-check').addEventListener('change', saveAndRerender);
                row.querySelector('.action-select').addEventListener('change', (e) => {
                    const action = e.target.value;
                    const posSelect = row.querySelector('.position-select');
                    const activeLabel = row.querySelector('.active-label');
                    const engineSelect = row.querySelector('.engine-select');
                    const urlInput = row.querySelector('.url-input');

                    const showPosActive = ['openTab', 'search', 'customSearch'].includes(action);
                    if (posSelect) posSelect.style.display = showPosActive ? '' : 'none';
                    if (activeLabel) activeLabel.style.display = showPosActive ? '' : 'none';

                    if (dragType === 'text') {
                        if (engineSelect) engineSelect.style.display = action === 'search' ? '' : 'none';
                        if (urlInput) urlInput.style.display = (action === 'search' && engineSelect && engineSelect.value === 'custom') ? '' : 'none';
                    } else if (dragType === 'image') {
                        if (urlInput) urlInput.style.display = action === 'customSearch' ? '' : 'none';
                    }
                    saveAndRerender();
                });
                const engineSelect = row.querySelector('.engine-select');
                if (engineSelect) {
                    engineSelect.addEventListener('change', (e) => {
                        const urlInput = row.querySelector('.url-input');
                        if (urlInput) urlInput.style.display = e.target.value === 'custom' ? '' : 'none';
                        saveAndRerender();
                    });
                }
                const urlInput = row.querySelector('.url-input');
                if (urlInput) {
                    urlInput.addEventListener('input', () => { if (saveTimeout) clearTimeout(saveTimeout); saveTimeout = setTimeout(saveAndRerender, 500); });
                }
                row.querySelector('.drag-delete-btn').addEventListener('click', () => {
                    const arr = currentSettings[settingsKey] || [];
                    if (arr.length > 1) {
                        arr.splice(index, 1);
                        currentSettings[settingsKey] = arr;
                        renderContainer(containerId, arr, actions, type);
                        debounceAutoSave();
                    }
                });
            });
        };

        renderContainer('textDragRows', currentSettings.textDragGestures, TEXT_DRAG_ACTIONS, 'text');
        renderContainer('linkDragRows', currentSettings.linkDragGestures, LINK_DRAG_ACTIONS, 'link');
        renderContainer('imageDragRows', currentSettings.imageDragGestures, IMAGE_DRAG_ACTIONS, 'image');

        document.querySelectorAll('.drag-add-btn').forEach(btn => {
            const type = btn.dataset.type;
            const settingsKey = `${type}DragGestures`;
            const arr = currentSettings[settingsKey] || [];
            btn.style.display = arr.length >= 4 ? 'none' : '';

            btn.onclick = () => {
                const usedDirs = arr.map(g => g.direction);
                const availableDir = directions.find(d => !usedDirs.includes(d));
                if (!availableDir) return;
                arr.push({ direction: availableDir, action: type === 'text' ? 'search' : 'openTab', position: 'right', active: true, engine: 'google', url: '' });
                currentSettings[settingsKey] = arr;
                renderDragGestureTables();
                debounceAutoSave();
            };
        });
    }

    function debounceAutoSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(autoSave, 500);
    }

    function autoSave() {
        const gestures = {};
        const customGestures = {};

        elements.gestureGrid.querySelectorAll('select').forEach(select => {
            const pattern = select.dataset.pattern;
            const action = select.value;
            gestures[pattern] = action;

            if (action !== DEFAULT_GESTURES[pattern]) {
                customGestures[pattern] = action;
            }
        });

        const now = new Date().toISOString();

        const customGestureUrls = {};
        elements.gestureGrid.querySelectorAll('select').forEach(select => {
            const url = select.dataset.customUrl;
            if (url && url.trim()) {
                customGestureUrls[select.dataset.pattern] = url.trim();
            }
        });

        const settings = {
            theme: elements.theme.value,
            language: elements.language.value,
            enableGesture: elements.enableGesture.checked,
            enableTrail: elements.enableTrail.checked,
            showTrailOrigin: elements.showTrailOrigin ? elements.showTrailOrigin.checked : true,
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
            enableAdvancedSettings: elements.enableAdvancedSettings ? elements.enableAdvancedSettings.checked : false,
            scrollAmount: elements.scrollAmount ? parseInt(elements.scrollAmount.value) : 75,
            gestures: gestures,
            customGestures: customGestures,
            customGestureUrls: customGestureUrls,
            newTabPosition: elements.newTabPosition ? elements.newTabPosition.value : 'right',
            newTabActive: elements.newTabActive ? elements.newTabActive.checked : true,
            textDragGestures: currentSettings.textDragGestures || { '→': 'search', '←': 'none', '↑': 'none', '↓': 'none' },
            linkDragGestures: currentSettings.linkDragGestures || { '→': 'openTab', '←': 'none', '↑': 'none', '↓': 'none' },
            imageDragGestures: currentSettings.imageDragGestures || { '→': 'openTab', '←': 'none', '↑': 'none', '↓': 'none' },
            imageSearchUrl: elements.imageSearchUrl ? elements.imageSearchUrl.value : '',
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

        elements.enableGesture.checked = currentSettings.enableGesture !== false;
        elements.enableTrail.checked = currentSettings.enableTrail;
        if (elements.showTrailOrigin) {
            elements.showTrailOrigin.checked = currentSettings.showTrailOrigin !== false;
        }
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
        if (elements.enableAdvancedSettings) {
            elements.enableAdvancedSettings.checked = currentSettings.enableAdvancedSettings || false;
        }
        if (elements.scrollAmount) {
            const scrollVal = currentSettings.scrollAmount || 75;
            elements.scrollAmount.value = scrollVal;
            if (elements.scrollAmountValue) {
                elements.scrollAmountValue.textContent = scrollVal + '%';
            }
        }

        if (elements.newTabPosition) {
            elements.newTabPosition.value = currentSettings.newTabPosition || 'right';
        }
        if (elements.newTabActive) {
            elements.newTabActive.checked = currentSettings.newTabActive !== false;
        }
        if (elements.imageSearchUrl) {
            elements.imageSearchUrl.value = currentSettings.imageSearchUrl || '';
        }

        updateUIState();

        generateGestureGrid();

        renderBlacklist();

        if (currentSettings.lastSyncTime) {
            updateSyncStatus(currentSettings.lastSyncTime);
        }
    }

    function generateGestureGrid() {
        const gestures = currentSettings.gestures || DEFAULT_GESTURES;
        const patterns = Array.from(new Set([
            ...Object.keys(DEFAULT_GESTURES),
            ...Object.keys(gestures)
        ]));

        const GESTURE_DESC_KEYS = {
            '←': 'gestureDesc_L',
            '→': 'gestureDesc_R',
            '↑': 'gestureDesc_U',
            '↓': 'gestureDesc_D',
            '↓→': 'gestureDesc_DR',
            '←↑': 'gestureDesc_LU',
            '→↑': 'gestureDesc_RU',
            '→↓': 'gestureDesc_RD',
            '↑←': 'gestureDesc_UL',
            '↑→': 'gestureDesc_UR',
            '↓←': 'gestureDesc_DL',
            '←↓': 'gestureDesc_LD',
            '↑↓': 'gestureDesc_UD',
            '↓↑': 'gestureDesc_DU',
            '←→': 'gestureDesc_LR',
            '→←': 'gestureDesc_RL'
        };

        const customUrls = currentSettings.customGestureUrls || {};

        let html = '';
        patterns.forEach(pattern => {
            const currentAction = gestures[pattern] || DEFAULT_GESTURES[pattern] || 'none';
            const defaultAction = DEFAULT_GESTURES[pattern] || 'none';
            const isCustom = !DEFAULT_GESTURES[pattern];
            const isModified = !isCustom && currentAction !== defaultAction;
            const descKey = GESTURE_DESC_KEYS[pattern];
            const desc = descKey ? (msg(descKey) || '') : (isCustom ? msg('customGesture') || '自定义' : '');
            const customUrl = customUrls[pattern] || '';

            const getOptionLabel = (value, key) => {
                let label = msg(key) || value;
                if (value === 'openCustomUrl' && customUrl) {
                    label += ` (${customUrl.length > 20 ? customUrl.substring(0, 20) + '...' : customUrl})`;
                }
                return label;
            };

            const actionBtn = isCustom
                ? `<button class="delete-gesture-btn" data-pattern="${pattern}" title="${msg('deleteGesture') || '删除手势'}" style="display: inline-flex">×</button>`
                : `<button class="reset-btn" data-pattern="${pattern}" title="${msg('resetToDefault') || '恢复默认'}" style="display: ${isModified ? 'inline-flex' : 'none'}">↺</button>`;

            html += `
        <div class="gesture-item ${isModified ? 'modified' : ''} ${isCustom ? 'custom' : ''}">
          ${actionBtn}
          <div class="gesture-pattern" title="${pattern} ${desc}">${pattern} <span class="gesture-desc">${desc}</span></div>
          <select data-pattern="${pattern}" data-custom-url="${customUrl}" data-default="${defaultAction}" data-is-custom="${isCustom}">
            ${Object.entries(ACTION_KEYS).map(([value, key]) =>
                `<option value="${value}" ${currentAction === value ? 'selected' : ''}>${getOptionLabel(value, key)}</option>`
            ).join('')}
          </select>
        </div>
        `;
        });

        elements.gestureGrid.innerHTML = html;

        elements.gestureGrid.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', (e) => {
                const pattern = e.target.dataset.pattern;

                if (e.target.value === 'openCustomUrl') {
                    let currentUrl = e.target.dataset.customUrl || '';
                    const url = prompt(msg('enterCustomUrl') || '请输入完整网址（建议包含协议，如 https://）：', currentUrl);

                    if (url === null) {
                        e.target.value = gestures[pattern] || DEFAULT_GESTURES[pattern];
                        return;
                    }

                    e.target.dataset.customUrl = url.trim();
                    const option = e.target.querySelector('option[value="openCustomUrl"]');
                    if (option) {
                        const baseLabel = msg('actionOpenCustomUrl') || '打开自定义网址';
                        option.textContent = url.trim() ? `${baseLabel} (${url.length > 20 ? url.substring(0, 20) + '...' : url})` : baseLabel;
                    }
                }

                const gestureItem = e.target.closest('.gesture-item');
                const resetBtn = gestureItem.querySelector('.reset-btn');
                if (resetBtn) {
                    const isModified = e.target.value !== e.target.dataset.default;
                    resetBtn.style.display = isModified ? 'inline-flex' : 'none';
                    gestureItem.classList.toggle('modified', isModified);
                }

                autoSave();
            });
        });

        elements.gestureGrid.querySelectorAll('.reset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pattern = e.target.dataset.pattern;
                const select = elements.gestureGrid.querySelector(`select[data-pattern="${pattern}"]`);
                if (select) {
                    const defaultAction = select.dataset.default;
                    select.value = defaultAction;
                    e.target.style.display = 'none';
                    select.closest('.gesture-item').classList.remove('modified');
                    autoSave();
                }
            });
        });

        elements.gestureGrid.querySelectorAll('.delete-gesture-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pattern = e.target.dataset.pattern;
                if (!confirm((msg('deleteGestureConfirm') || `确定删除手势 ${pattern} 吗？`).replace('%pattern%', pattern))) {
                    return;
                }

                if (currentSettings.gestures) {
                    delete currentSettings.gestures[pattern];
                }
                if (currentSettings.customGestures) {
                    delete currentSettings.customGestures[pattern];
                }
                if (currentSettings.customGestureUrls) {
                    delete currentSettings.customGestureUrls[pattern];
                }

                chrome.storage.sync.set({
                    gestures: currentSettings.gestures,
                    customGestures: currentSettings.customGestures,
                    customGestureUrls: currentSettings.customGestureUrls
                }, () => {
                    showStatus(msg('gestureDeleted') || `✓ 手势 ${pattern} 已删除`);
                    generateGestureGrid();
                });
            });
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

        if (!domain.includes('.') && domain !== 'localhost') {
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
        a.download = 'FlowMouse-settings.json';
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
        if (!navigator.onLine) {
            showStatus(msg('syncFailed') || '同步失败，请检查网络连接', 'error');
            return;
        }

        const gestures = {};
        elements.gestureGrid.querySelectorAll('select').forEach(select => {
            gestures[select.dataset.pattern] = select.value;
        });

        const now = new Date().toISOString();
        const settings = {
            theme: elements.theme.value,
            language: elements.language.value,
            enableGesture: elements.enableGesture.checked,
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
            if (chrome.runtime.lastError) {
                showStatus(msg('syncFailed') || '同步失败，请检查网络连接', 'error');
            } else {
                currentSettings = settings;
                updateSyncStatus(now);
                showStatus(msg('syncUploaded') || '已上传配置到云端');
            }
        });
    }

    function syncDownload() {
        if (!navigator.onLine) {
            showStatus(msg('syncFailed') || '同步失败，请检查网络连接', 'error');
            return;
        }

        chrome.storage.sync.get(null, (items) => {
            if (chrome.runtime.lastError) {
                showStatus(msg('syncFailed') || '同步失败，请检查网络连接', 'error');
                return;
            }

            if (items && Object.keys(items).length > 0) {
                currentSettings = { ...DEFAULT_SETTINGS, ...items };
                applySettingsToUI();
                showStatus(msg('syncDownloaded') || '已从云端下载配置');
            } else {
                showStatus(msg('syncNoData') || '云端无配置数据');
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
