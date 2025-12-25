class GestureVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.trail = [];
        this.hud = null;
        this.settings = {
            hudBgColor: '#000000',
            hudBgOpacity: 70,
            hudTextColor: '#ffffff',
            trailColor: '#4285f4',
            trailWidth: 5
        };
    }
    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity 0.1s;
        `;
        const updateSize = () => {
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
        updateSize();
        if (document.body) {
            document.body.appendChild(this.canvas);
        } else {
            document.documentElement.appendChild(this.canvas);
        }
        this.hud = document.createElement('div');
        this.updateHudStyle();
        if (document.body) {
            document.body.appendChild(this.hud);
        } else {
            document.documentElement.appendChild(this.hud);
        }
        window.addEventListener('resize', updateSize);
    }
    updateHudStyle() {
        if (!this.hud) return;
        const bgOpacity = this.settings.hudBgOpacity / 100;
        const hexToRgb = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `${r}, ${g}, ${b}`;
        };
        this.hud.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(${hexToRgb(this.settings.hudBgColor)}, ${bgOpacity});
            color: ${this.settings.hudTextColor};
            padding: 15px 30px;
            border-radius: 10px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 24px;
            font-weight: bold;
            pointer-events: none;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity 0.2s, transform 0.2s;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            backdrop-filter: blur(5px);
        `;
    }
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        this.updateHudStyle();
    }
    show() {
        if (!this.canvas) this.init();
        this.canvas.style.opacity = '1';
        this.trail = [];
    }
    hide() {
        if (this.canvas) {
            this.canvas.style.opacity = '0';
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        if (this.hud) {
            this.hud.style.opacity = '0';
            this.hud.style.transform = 'translate(-50%, -40%)';
        }
        this.trail = [];
    }
    addPoint(x, y) {
        this.trail.push({ x, y });
        this.draw();
    }
    updateAction(text) {
        if (!this.hud) this.init();
        if (text) {
            this.hud.textContent = text;
            this.hud.style.opacity = '1';
            this.hud.style.transform = 'translate(-50%, -50%)';
        } else {
            this.hud.style.opacity = '0';
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
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
        }
        const originRadius = Math.max(width * 1.2, 4);
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(this.trail[0].x, this.trail[0].y, originRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    cleanup() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.hud && this.hud.parentNode) {
            this.hud.parentNode.removeChild(this.hud);
        }
    }
}
window.GestureVisualizer = GestureVisualizer;
