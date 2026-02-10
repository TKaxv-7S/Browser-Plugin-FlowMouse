(function () {
	'use strict';

	const isFirefox = false;

	let translations = {};
	let currentLang = 'en';
	let initPromise = null;

	const SUPPORTED_LANGUAGES = {
		"en": { name: "English", enName: "English" },
		"zh_CN": { name: "简体中文", enName: "Chinese (Simplified)" },
		"zh_TW": { name: "繁體中文", enName: "Chinese (Traditional)" },
		"id": { name: "Bahasa Indonesia", enName: "Indonesian" },
		"ms": { name: "Bahasa Melayu", enName: "Malay" },
		"cs": { name: "Čeština", enName: "Czech" },
		"da": { name: "Dansk", enName: "Danish" },
		"de": { name: "Deutsch", enName: "German" },
		"es": { name: "Español (España)", enName: "Spanish" },
		"es_419": { name: "Español (Latinoamérica)", enName: "Spanish (Latin America)" },
		"fil": { name: "Filipino", enName: "Filipino" },
		"fr": { name: "Français", enName: "French" },
		"hr": { name: "Hrvatski", enName: "Croatian" },
		"it": { name: "Italiano", enName: "Italian" },
		"hu": { name: "Magyar", enName: "Hungarian" },
		"nl": { name: "Nederlands", enName: "Dutch" },
		"no": { name: "Norsk", enName: "Norwegian" },
		"pl": { name: "Polski", enName: "Polish" },
		"pt_BR": { name: "Português (Brasil)", enName: "Portuguese (Brazil)" },
		"pt_PT": { name: "Português (Portugal)", enName: "Portuguese (Portugal)" },
		"ro": { name: "Română", enName: "Romanian" },
		"sk": { name: "Slovenčina", enName: "Slovak" },
		"fi": { name: "Suomi", enName: "Finnish" },
		"sv": { name: "Svenska", enName: "Swedish" },
		"vi": { name: "Tiếng Việt", enName: "Vietnamese" },
		"tr": { name: "Türkçe", enName: "Turkish" },
		"el": { name: "Ελληνικά", enName: "Greek" },
		"bg": { name: "Български", enName: "Bulgarian" },
		"ru": { name: "Русский", enName: "Russian" },
		"sr": { name: "Српски", enName: "Serbian" },
		"uk": { name: "Українська", enName: "Ukrainian" },
		"ar": { name: "العربية", enName: "Arabic", dir: "rtl" },
		"fa": { name: "فارسی", enName: "Persian", dir: "rtl" },
		"he": { name: "עברית", enName: "Hebrew", dir: "rtl" },
		"bn": { name: "বাংলা", enName: "Bengali" },
		"hi": { name: "हिन्दी", enName: "Hindi" },
		"th": { name: "ไทย", enName: "Thai" },
		"ja": { name: "日本語", enName: "Japanese" },
		"ko": { name: "한국어", enName: "Korean" }
	};

	function getSupportedLanguages() {
		return SUPPORTED_LANGUAGES;
	}

	function getHtmlLang() {
		return currentLang.replace('_', '-');
	}

	function getDir(lang) {
		const targetLang = lang || currentLang;
		if (SUPPORTED_LANGUAGES[targetLang] && SUPPORTED_LANGUAGES[targetLang].dir) {
			return SUPPORTED_LANGUAGES[targetLang].dir;
		}
		return 'ltr';
	}

	async function loadTranslations(lang) {
		if (!SUPPORTED_LANGUAGES[lang]) {
			return false;
		}
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
		let message;
		if (translations[key] && translations[key].message) {
			message = translations[key].message;
		} else {
			message = chrome.i18n.getMessage(key, substitutions) || key;
		}
		if (message.indexOf('%browserName%') !== -1) {
			message = message.replaceAll("%browserName%", getBrowserName());
		}
		return message;
	}

	function applyI18n() {
		if (currentLang) {
			document.documentElement.lang = getHtmlLang();
			document.documentElement.dir = getDir();
		}

		document.querySelectorAll('[data-i18n]').forEach(el => {
			const key = el.getAttribute('data-i18n');
			const message = getMessage(key);
			if (message && message !== key) {
				el.innerHTML = message;
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
		
		let i18nLoadStyle = document.getElementById('i18n-load-style');
		if (i18nLoadStyle) {
			i18nLoadStyle.remove();
		}
	}

	function getSystemTheme() {
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			return 'dark';
		}
		return 'light';
	}

	function applyTheme(theme, skipSave = false) {
		let actualTheme = theme;
		if (theme === 'auto') {
			actualTheme = getSystemTheme();
		}
		document.body.setAttribute('data-theme', actualTheme || 'dark');
		
		try {
			if (!skipSave) {
				localStorage.setItem('flowmouse_theme', theme);
			}
		} catch (e) {
		}
	}

	function getCurrentLanguage() {
		return currentLang;
	}

	let browserType;
	function getBrowserType() {
		if (browserType) return browserType;
		{
			const userAgent = navigator.userAgent.toLowerCase();
			if (userAgent.indexOf('edg/') > -1) {
				browserType = 'edge';
			} else {
				browserType = 'chrome';
			}
			return browserType;
		}
	}

	let browserName;
	function getBrowserName() {
		if (browserName) return browserName;
		const browserType = getBrowserType();
		switch (browserType) {
			case 'firefox':
				browserName = 'Firefox';
				break;
			case 'edge':
				browserName = 'Edge';
				break;
			default:
				browserName = 'Chrome';
				break;
		}
		return browserName;
	}

	const STORE_LINKS = {
		chrome: 'https://chromewebstore.google.com/',
		edge: 'https://microsoftedge.microsoft.com/addons/',
		firefox: 'https://addons.mozilla.org/',
	};

	const FLOWMOUSE_STORE_LINKS = {
		chrome: 'https://chromewebstore.google.com/detail/fnldhkfidchnjiokpoemdhoejmaojkgp/reviews/my-review?utm_source=item-share-cb',
		edge: null,
		firefox: null,
	};

	function getBrowserInfo() {
		const browserType = getBrowserType();
		const browserName = getBrowserName();
		
		let storeNameKey;
		switch (browserType) {
			case 'firefox':
				storeNameKey = 'storeNameFirefox';
				break;
			case 'edge':
				storeNameKey = 'storeNameEdge';
				break;
			default:
				storeNameKey = 'storeNameChrome';
				break;
		}
		const storeName = getMessage(storeNameKey);

		return {
			browserType,
			browserName,
			storeLink: STORE_LINKS[browserType],
			flowmouseStoreLink: FLOWMOUSE_STORE_LINKS[browserType],
			storeName
		};
	}

	async function init() {
		let cachedTheme
		try {
			cachedTheme = localStorage.getItem('flowmouse_theme');
			if (cachedTheme) {
				applyTheme(cachedTheme, true);
			}
		} catch (e) {
		}

		const items = await chrome.storage.sync.get({ language: 'auto', theme: 'auto' });
		
		if (items.theme !== cachedTheme) {
			applyTheme(items.theme);
		}

		let lang = items.language;
		if (lang === 'auto') {
			const uiLang = chrome.i18n.getUILanguage();
			lang = uiLang.replace('-', '_');
			
			if (lang === 'zh') {
				lang = 'zh_CN';
			}
		}

		let loaded = await loadTranslations(lang);

		if (!loaded && lang.includes('_')) {
			const baseLang = lang.split('_')[0];
			loaded = await loadTranslations(baseLang);
		}
		
		if (!loaded) {
			loaded = await loadTranslations('en');
		}

		applyI18n();

		updateVersionFromManifest();
	}

	async function waitForInit() {
		if (!initPromise) {
			throw new Error('i18n not initialized');
		}
		await initPromise;
		return;
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
		getSupportedLanguages,
		getHtmlLang,
		getDir,
		applyTheme,
		init,
		loadTranslations,
		waitForInit,
		isFirefox,
		getBrowserName,
		getBrowserInfo,
	};

	initPromise = init();
})();