(function () {
    'use strict';

    let translations = {};
    let currentLang = 'zh_CN';

    async function loadTranslations(lang) {
        try {
            const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
            const response = await fetch(url);
            if (response.ok) {
                translations = await response.json();
                currentLang = lang;
                return true;
            }
        } catch (e) {
            console.warn('Failed to load translations for:', lang);
        }
        return false;
    }

    function getMessage(key, substitutions) {
        if (translations[key] && translations[key].message) {
            return translations[key].message;
        }
        return chrome.i18n.getMessage(key, substitutions) || key;
    }

    function applyI18n() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const message = getMessage(key);
            if (message && message !== key) {
                el.textContent = message;
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const message = getMessage(key);
            if (message && message !== key) {
                el.placeholder = message;
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const message = getMessage(key);
            if (message && message !== key) {
                el.title = message;
            }
        });

        const titleEl = document.querySelector('title[data-i18n]');
        if (titleEl) {
            const key = titleEl.getAttribute('data-i18n');
            const message = getMessage(key);
            if (message && message !== key) {
                document.title = message;
            }
        }
    }

    function getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    function applyTheme(theme) {
        let actualTheme = theme;
        if (theme === 'auto') {
            actualTheme = getSystemTheme();
        }
        document.body.setAttribute('data-theme', actualTheme || 'dark');
    }

    function getCurrentLanguage() {
        return currentLang;
    }

    async function init() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ language: 'auto', theme: 'auto' }, async (items) => {
                applyTheme(items.theme);

                let lang = items.language;
                if (lang === 'auto') {
                    const uiLang = chrome.i18n.getUILanguage();
                    lang = uiLang.startsWith('zh') ? 'zh_CN' : 'en';
                }

                const loaded = await loadTranslations(lang);
                if (!loaded && lang !== 'zh_CN') {
                    await loadTranslations('zh_CN');
                }

                applyI18n();

                updateVersionFromManifest();

                resolve();
            });
        });
    }

    function updateVersionFromManifest() {
        try {
            const manifest = chrome.runtime.getManifest();
            const version = manifest.version;
            document.querySelectorAll('.version-from-manifest').forEach(el => {
                if (el.textContent.startsWith('v') || el.textContent.startsWith('V')) {
                    el.textContent = `v${version}`;
                } else {
                    el.textContent = version;
                }
            });
        } catch (e) {
        }
    }

    window.i18n = {
        getMessage,
        applyI18n,
        getCurrentLanguage,
        applyTheme,
        init,
        loadTranslations
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
