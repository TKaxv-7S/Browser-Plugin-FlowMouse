(async function () {
	if (window.i18n && window.i18n.waitForInit) {
		await window.i18n.waitForInit();
	}

	const params = new URLSearchParams(window.location.search);
	const permissionsParam = params.get('permissions');
	let permissions = null;

	const titleEl = document.getElementById('title');
	const descEl = document.getElementById('description');
	const grantBtn = document.getElementById('grantBtn');
	const cancelBtn = document.getElementById('cancelBtn');
	const iconBookmarks = document.getElementById('icon-bookmarks');
	const iconDownloads = document.getElementById('icon-downloads');

	document.title = window.i18n.getMessage('permissionTitle') || 'FlowMouse Permission';

	if (permissionsParam === 'bookmarks') {
		const titleText = window.i18n.getMessage('permissionBookmarksTitle') || 'Manage Bookmarks';
		titleEl.textContent = titleText;
		descEl.textContent = window.i18n.getMessage('permissionBookmarksDesc') || 'To add pages to your bookmarks, FlowMouse needs access to your bookmarks.';
		iconBookmarks.style.display = 'block';
		permissions = permissionsParam.split(',');
	}
	
	if (permissionsParam === 'downloads,pageCapture') {
		const titleText = window.i18n.getMessage('permissionDownloadsPageCaptureTitle') || 'Save Images';
		titleEl.textContent = titleText;
		descEl.textContent = window.i18n.getMessage('permissionDownloadsPageCaptureDesc') || 'To save images, FlowMouse needs to access to the page and your downloads.';
		iconDownloads.style.display = 'block';
		permissions = permissionsParam.split(',');
	}
	
	if (!permissions) {
		descEl.textContent = 'Unknown permission requested.';
		grantBtn.disabled = true;
	} else {
		grantBtn.addEventListener('click', () => {
			if (!permissions) return;

			chrome.permissions.request({
				permissions: permissions
			}, (granted) => {
				if (granted) {
					window.close();
				}
			});
		});
	}

	cancelBtn.addEventListener('click', () => {
		window.close();
	});
})();