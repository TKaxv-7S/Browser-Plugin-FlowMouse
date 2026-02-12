class LowPassFilter {
	constructor() {
		this.hasLast = false;
		this.lastOut = 0;
	}

	filter(value, alpha) {
		if (!this.hasLast) {
			this.hasLast = true;
			this.lastOut = value;
			return value;
		}
		this.lastOut = alpha * value + (1.0 - alpha) * this.lastOut;
		return this.lastOut;
	}
	
	lastValue() { return this.lastOut; }
	reset() { this.hasLast = false; }
}

class OneEuroFilter {
	constructor(minCutoff = 1.0, beta = 0.007, dcutoff = 1.0) {
		this.minCutoff = minCutoff;
		this.beta = beta;
		this.dcutoff = dcutoff;
		
		this.xFilter = new LowPassFilter();
		this.yFilter = new LowPassFilter();
		this.dxFilter = new LowPassFilter();
		this.dyFilter = new LowPassFilter();
		
		this.lastTime = null;
		this.timeOffset = null;
	}

	reset() {
		this.xFilter.reset();
		this.yFilter.reset();
		this.dxFilter.reset();
		this.dyFilter.reset();
		this.lastTime = null;
		this.timeOffset = null;
	}

	alpha(cutoff, freq) {
		const te = 1.0 / freq;
		const tau = 1.0 / (2 * Math.PI * cutoff);
		return 1.0 / (1.0 + tau / te);
	}

	filter(x, y, timestamp = null) {
		const now = performance.now();
		
		let effectiveTime;
		if (timestamp != null) {
			this.timeOffset = timestamp - now;
			effectiveTime = timestamp;
		} else {
			if (this.timeOffset === null) {
				this.timeOffset = 0;
			}
			effectiveTime = now + this.timeOffset;
		}

		if (this.lastTime === null) {
			this.lastTime = effectiveTime;
			return { 
				x: this.xFilter.filter(x, 1), 
				y: this.yFilter.filter(y, 1) 
			};
		}

		const dt = (effectiveTime - this.lastTime) / 1000.0;
		this.lastTime = effectiveTime;

		const freq = (dt > 0.00001) ? (1.0 / dt) : 60.0;

		const prevX = this.xFilter.lastValue();
		const prevY = this.yFilter.lastValue();
		
		const dx = (x - prevX) * freq;
		const dy = (y - prevY) * freq;

		const dAlpha = this.alpha(this.dcutoff, freq);
		const edx = this.dxFilter.filter(dx, dAlpha);
		const edy = this.dyFilter.filter(dy, dAlpha);

		const speed = Math.sqrt(edx * edx + edy * edy);
		const cutoff = this.minCutoff + this.beta * speed;
		
		const posAlpha = this.alpha(cutoff, freq);
		const newX = this.xFilter.filter(x, posAlpha);
		const newY = this.yFilter.filter(y, posAlpha);

		return { x: newX, y: newY };
	}
}

class GestureVisualizer {
	constructor() {
		this.canvas = null;
		this.ctx = null;
		this.trail = [];
		this.hud = null;

		this.container = null;
		this.shadow = null;
		this.fontStyle = null;

		this.animationFrameId = null;
		this.isDrawScheduled = false;

		this.settings = {
			hudBgColor: '#000000',
			hudBgOpacity: 70,
			hudTextColor: '#ffffff',
			trailColor: '#4285f4',
			trailWidth: 5,
			showTrailOrigin: true,
			showRawTrail: false,
			lang: '',
			isRtl: false,
			duplicatePointLimit: 8,
			enablePathInterpolation: true,

			enableInputStabilization: true,
			stabilizationCatchUpDelay: 25,      
			stabilizationCatchUpThreshold: 0.5, 

			minCutoff: 1.0, 
			beta: 0.007,    
			dcutoff: 1.0,   
		};
		
		this.lagTimer = null;

		this.filter = new OneEuroFilter(
			this.settings.minCutoff, 
			this.settings.beta, 
			this.settings.dcutoff
		);

		this.lastPointInput = null;
		this.duplicatePointCount = 0;
	}

	init() {
		if (this.container) return;

		this.container = document.createElement('div');

		this.#updateContainerLang(this.settings.lang);

		this.container.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			z-index: 2147483647;
			display: block !important;
			background: transparent !important;
			margin: 0 !important;
			padding: 0 !important;
		`;

		this.shadow = this.container.attachShadow({ mode: 'closed' });

		this.fontStyle = document.createElement('style');
		this.fontStyle.textContent = this.#generateFontStyleCss(this.settings.lang);
		this.shadow.appendChild(this.fontStyle);

		this.canvas = document.createElement('canvas');
		this.canvas.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			display: none;
		`;

		this.resizeHandler = () => {
			if (!this.canvas) return;
			const dpr = window.devicePixelRatio || 1;
			const width = document.documentElement.clientWidth;
			const height = document.documentElement.clientHeight;

			this.canvas.width = width * dpr;
			this.canvas.height = height * dpr;
			this.canvas.style.width = width + 'px';
			this.canvas.style.height = height + 'px';
			this.ctx = this.canvas.getContext('2d');
			this.ctx.scale(dpr, dpr);
		};

		this.resizeHandler();

		this.shadow.appendChild(this.canvas);

		this.hud = document.createElement('div');
		this.updateHudStyle();
		this.shadow.appendChild(this.hud);

		if (document.body) {
			document.body.appendChild(this.container);
		} else {
			document.documentElement.appendChild(this.container);
		}

		void this.hud.offsetHeight;

		window.addEventListener('resize', this.resizeHandler);
	}

	static #hexToRgb(hex) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `${r}, ${g}, ${b}`;
	};

	updateHudStyle() {
		if (!this.hud) return;
		const bgOpacity = this.settings.hudBgOpacity / 100;

		this.hud.style.cssText = `
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -40%);
			background-color: rgba(${GestureVisualizer.#hexToRgb(this.settings.hudBgColor)}, ${bgOpacity});
			color: ${this.settings.hudTextColor};
			padding-inline: 27px var(--hud-padding-end, 30px);
			padding-block: 15px 16px;
			border-radius: 10px;
			font-size: 24px;
			line-height: 32px;
			font-weight: 600;
			pointer-events: none;
			opacity: 0;
			transition: opacity 0.2s, transform 0.2s;
			text-align: center;
			box-shadow: 0 4px 15px rgba(0,0,0,0.3);
			backdrop-filter: blur(5px);
		`;
	}

	updateSettings(settings) {
		this.settings = { ...this.settings, ...settings };
		if (this.container && (settings.lang !== undefined || settings.isRtl !== undefined)) {
			this.#updateContainerLang(this.settings.lang);
		}
		this.updateHudStyle();
	}

	#updateContainerLang(_lang) {
		const lang = _lang || '';
		if (this.container) {
			this.container.lang = lang;
			this.container.dir = this.settings.isRtl ? 'rtl' : 'ltr';
		}
		if (this.fontStyle) {
			this.fontStyle.textContent = this.#generateFontStyleCss(lang);
		}
	}

	#generateFontStyleCss(lang) {
		const baseFontFamily = "'Segoe UI',sans-serif";
		let fontFamily = baseFontFamily;
		let extraRules = '';

		switch (lang) {
			case 'ja':
				extraRules = 'font-variant-east-asian:proportional-width;';
				break;
		}

		return `:host{font-family:${fontFamily} !important;${extraRules}}`;
	}

	show() {
		if (this.container && !this.container.isConnected) {
			this.cleanup();
		}
		if (!this.canvas) this.init();
		this.trail = [];
		
		this.filter.minCutoff = this.settings.minCutoff;
		this.filter.beta = this.settings.beta;
		this.filter.dcutoff = this.settings.dcutoff;
		
		this.filter.reset();
		this.lastPointInput = null;
		this.duplicatePointCount = 0;
		this.canvas.style.display = 'block';
	}

	hide() {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
			this.isDrawScheduled = false;
		}
		if (this.lagTimer) {
			clearTimeout(this.lagTimer);
			this.lagTimer = null;
		}
		if (this.canvas) {
			this.canvas.style.display = 'none';
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}
		if (this.hud) {
			this.hud.style.opacity = '0';
			this.hud.style.transform = 'translate(-50%, -40%)';
		}
		this.trail = [];
	}

	addPoint(x, y, timestamp = null) {
		if (this.lastPointInput && this.lastPointInput.x === x && this.lastPointInput.y === y) {
			this.duplicatePointCount++;
		} else {
			this.duplicatePointCount = 1;
			this.lastPointInput = { x, y };
		}

		if (this.duplicatePointCount >= this.settings.duplicatePointLimit) return;

		if (this.lagTimer) {
			clearTimeout(this.lagTimer);
			this.lagTimer = null;
		}

		if (this.settings.enableInputStabilization) {
			const filtered = this.filter.filter(x, y, timestamp);
			this.trail.push({ x: filtered.x, y: filtered.y, rawX: x, rawY: y });
			this.scheduleDraw();
			this.lagTimer = setTimeout(() => this.catchUp(), this.settings.stabilizationCatchUpDelay);
		} else {
			this.trail.push({ x, y, rawX: x, rawY: y });
			this.scheduleDraw();
		}
	}

	addPoints(points) {
		const validPoints = [];
		for (const p of points) {
			if (this.lastPointInput && this.lastPointInput.x === p.x && this.lastPointInput.y === p.y) {
				this.duplicatePointCount++;
			} else {
				this.duplicatePointCount = 1;
				this.lastPointInput = { x: p.x, y: p.y };
			}
			if (this.duplicatePointCount < this.settings.duplicatePointLimit) {
				validPoints.push(p);
			}
		}

		if (validPoints.length === 0) return;

		if (this.lagTimer) {
			clearTimeout(this.lagTimer);
			this.lagTimer = null;
		}

		if (this.settings.enableInputStabilization) {
			for (const p of validPoints) {
				const filtered = this.filter.filter(p.x, p.y, p.timestamp);
				this.trail.push({ x: filtered.x, y: filtered.y, rawX: p.x, rawY: p.y });
			}
			this.scheduleDraw();
			this.lagTimer = setTimeout(() => this.catchUp(), this.settings.stabilizationCatchUpDelay);
		} else {
			for (const p of validPoints) {
				this.trail.push({ x: p.x, y: p.y, rawX: p.x, rawY: p.y });
			}
			this.scheduleDraw();
		}
	}

	catchUp() {
		if (!this.trail.length || !this.settings.enableInputStabilization) return;

		const last = this.trail[this.trail.length - 1];
		const dx = last.rawX - last.x;
		const dy = last.rawY - last.y;

		const threshold = this.settings.stabilizationCatchUpThreshold;
		if (dx * dx + dy * dy < threshold * threshold) return;

		this.addPoint(last.rawX, last.rawY);
	}

	updateAction(text) {
		if (!this.hud) this.init();
		if (text) {
			this.hud.innerHTML = '\u200B' + window.GestureConstants.arrowsToSvg(text);
			
			const hasOnlyArrows = /^[↑↓←→]+$/.test(text);
			this.hud.style.setProperty('--hud-padding-end', hasOnlyArrows ? '27px' : '30px');
			
			this.hud.style.opacity = '1';
			this.hud.style.transform = 'translate(-50%, -50%)';
		} else {
			this.hud.style.opacity = '0';
		}
	}

	showToast(message, duration = 3000) {
		if (!this.container) this.init();
		const bgOpacity = this.settings.hudBgOpacity / 100;

		const toast = document.createElement('div');
		toast.style.cssText = `
			position: absolute;
			bottom: 20%;
			left: 50%;
			transform: translateX(-50%) translateY(20px);
			background-color: rgba(${GestureVisualizer.#hexToRgb(this.settings.hudBgColor)}, ${bgOpacity});
			color: ${this.settings.hudTextColor};
			padding: 12px 24px;
			border-radius: 8px;
			font-size: 14px;
			line-height: 1.5;
			max-width: 80%;
			text-align: center;
			opacity: 0;
			transition: opacity 0.3s, transform 0.3s;
			box-shadow: 0 4px 15px rgba(0,0,0,0.3);
			pointer-events: none;
		`;
		toast.textContent = message;

		this.shadow.appendChild(toast);

		void toast.offsetWidth;

		requestAnimationFrame(() => {
			toast.style.opacity = '1';
			toast.style.transform = 'translateX(-50%) translateY(0)';
		});

		setTimeout(() => {
			toast.style.opacity = '0';
			toast.style.transform = 'translateX(-50%) translateY(20px)';
			setTimeout(() => {
				if (toast.parentNode) {
					toast.parentNode.removeChild(toast);
				}
			}, 300);
		}, duration);
	}

	scheduleDraw() {
		if (!this.isDrawScheduled) {
			this.isDrawScheduled = true;
			this.animationFrameId = requestAnimationFrame(() => {
				try {
					this.draw();
				} finally {
					this.isDrawScheduled = false;
					this.animationFrameId = null;
				}
			});
		}
	}

	draw() {
		if (!this.ctx) return;

		const ctx = this.ctx;
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (this.trail.length < 1) return;

		const width = this.settings.trailWidth;
		const color = this.settings.trailColor;

		ctx.save();
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;

		if (this.trail.length >= 2) {
			ctx.beginPath();
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			if (this.trail.length < 3 || !this.settings.enablePathInterpolation) {
				ctx.moveTo(this.trail[0].x, this.trail[0].y);
				for (let i = 1; i < this.trail.length; i++) {
					ctx.lineTo(this.trail[i].x, this.trail[i].y);
				}
			} else {
				ctx.moveTo(this.trail[0].x, this.trail[0].y);
				let i;
				for (i = 1; i < this.trail.length - 2; i++) {
					const xc = (this.trail[i].x + this.trail[i + 1].x) / 2;
					const yc = (this.trail[i].y + this.trail[i + 1].y) / 2;
					ctx.quadraticCurveTo(this.trail[i].x, this.trail[i].y, xc, yc);
				}
				ctx.quadraticCurveTo(
					this.trail[i].x, 
					this.trail[i].y, 
					this.trail[i + 1].x, 
					this.trail[i + 1].y
				);
			}
			ctx.stroke();
		}
		
		if (this.settings.showRawTrail && this.trail.length >= 2) {
			ctx.beginPath();
			ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
			ctx.lineWidth = 1;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			ctx.moveTo(this.trail[0].rawX, this.trail[0].rawY);
			for (let i = 1; i < this.trail.length; i++) {
				ctx.lineTo(this.trail[i].rawX, this.trail[i].rawY);
			}
			ctx.stroke();
		}

		if (this.settings.showTrailOrigin) {
			const originRadius = Math.max(width * 1.2, 4);

			ctx.beginPath();
			ctx.fillStyle = color;
			ctx.arc(this.trail[0].x, this.trail[0].y, originRadius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}

	cleanup() {
		this.hide(); 

		if (this.resizeHandler) {
			window.removeEventListener('resize', this.resizeHandler);
			this.resizeHandler = null;
		}

		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}

		this.ctx = null;
		this.canvas = null;
		this.hud = null;
		this.container = null;
		this.shadow = null;
	}
}

window.GestureVisualizer = GestureVisualizer;