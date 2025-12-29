# FlowMouse

A Chrome mouse gesture extension pursuing ultimate smoothness and privacy protection. Through natural mouse swipes, help you control the browser seamlessly and truly enter a focused and efficient "Flow" state. The extension is **fully open-source**.

## ✨ Core Features
- **Local First, Privacy First**: All operations are performed locally. **Zero network requests, zero data collection, zero information uploads**. Thoroughly guarding your browsing privacy.
- **Custom Gestures, Unlimited Freedom**: Besides 16 default gestures, supports defining custom gestures for more actions.
- **Super Drag, Double Efficiency**:
  - **Drag Text** → Google Search by default, supports foreground/background opening of custom search engines or copying text.
  - **Drag Link** → Open in new tab, supports foreground/background opening or copying link.
  - **Drag Image** → View in new tab, supports foreground/background viewing, saving image, copying image URL and custom search.
- **Intuitive Settings, Customization at Will**: Provides clear visual settings page, supports customizing gesture trail color, width and operation hints.
- **Multi-language Support**: Fully adapted for Simplified Chinese and English interfaces.

## ⚠️ Notes
- Existing pages **must be refreshed** after installing or enabling the extension to use gestures.
- Browser built-in pages (New Tab, Settings, Extensions, Chrome Web Store, etc.) **do not support mouse gestures** due to security restrictions.
- Gestures and trails might be affected on pages with multiple iframe windows (currently no solution).

## 🚀 Installation
### Method 1: Load Unpacked Extension
1. Download and unzip the installation package of this extension.
2. Enter `chrome://extensions/` in the Chrome address bar and visit it.
3. Turn on **"Developer mode"** in the upper right corner of the page.
4. Click **"Load unpacked"** in the upper left corner.
5. Select the unzipped `FlowMouse` folder to complete the installation.

## 🔧 Basic Usage
1. **Mouse Gestures**: Hold **Right Mouse Button** and drag to draw a trail, release to trigger action.
2. **Super Drag**: Hold **Left Mouse Button** and drag text, link, or image to trigger search or open actions (default supports rightward).

## 📖 Default Gestures Guide
All gestures can be modified or customized in Options page.

| Gesture | Action | Gesture | Action |
|:---:|:---|:---:|:---|
| `←` | Back | `→` | Forward |
| `↑` | Scroll Up | `↓` | Scroll Down |
| `↓→` | Close Current Tab | `←↑` | Reopen Closed Tab |
| `→↑` | Open New Tab | `→↓` | Reload Page |
| `↑←` | Switch to Left Tab | `↑→` | Switch to Right Tab |
| `↓←` | Stop Loading | `←↓` | Close All Tabs |
| `↑↓` | Scroll to Bottom | `↓↑` | Scroll to Top |
| `←→` | Close Current Tab | `→←` | Reopen Closed Tab |

## 📝 Changelog

### v1.1 (2025-12-24)
**Fixes & Improvements:**
- **System Compatibility**: **Resolved right-click menu conflicts on Mac and Linux; context menu is now triggered by double-click to ensure mouse gestures work correctly**.
    > Note: Due to macOS system characteristics, when dragging text, you need to select the text first, press and hold the left button for a short pause before dragging, otherwise the search may not be triggered.
- **Default Experience Optimization**:
    - **Re-mapped default gestures to align with Microsoft Edge to reduce the learning curve**.
    - Changed default new tab opening position from "far right" to **"right of current tab"**.
    - Removed smooth scrolling animation for "Scroll Up/Down" to significantly improve response speed.
- **Bug Fixes**:
    - Fixed issue where `localhost` domains could not be added to the blacklist.
    - Fixed issue where dragging left triggered "Split View" and caused functionality failure.
- **Recognition Optimization**: Optimized gesture matching rules to require exact trajectory matches, effectively preventing accidental triggers.
- **Other**: Various detailed experience optimizations.

**New Features:**
- **Global Switch**: Added a global "Enable/Disable" switch for **Mouse Gestures** (Super Drag is unaffected).
- **More Actions**: Support for "Maximize/Restore Window", "Minimize Window", "Open Custom URL", "Copy Current URL", and more.
- **Advanced Settings** (Power User Features):
    - **Custom Scroll**: Customize scroll distance for "Scroll Up/Down" gestures.
    - **Visual Tweaks**: Toggle the display of the gesture trail origin point.
    - **Custom Gestures**: Draw and add your own custom gesture patterns (supports ↑↓←→ 4-direction combinations).
    - **Enhanced Super Drag**:
        - Full 4-direction dragging support (↑↓←→) for Text, Images, and Links with foreground/background opening options.
        - **Text Actions**: Added "Copy Text".
        - **Image Actions**: Added "Save Image", "Copy Image URL", "Custom Image Search".
        - **Link Actions**: Added "Copy Link".

## 🔒 Privacy Commitment
**FlowMouse solemnly promises:**
- **This extension is an open-source project with code hosted on GitHub. Contributions and code review are welcome.**
- **No collection** of your browsing history, bookmarks, or usage habits.
- **No uploading** of any local data to any server.
- **No embedding** of any third-party analytics or advertising codes.
All personal configurations are saved only in your browser's local storage and will never leave your device.

---

## 💡 Origin Story

For many years, I have been a loyal user of CrxMouse; it truly greatly improved my operational efficiency. However, a persistent annoyance accompanied my long-term usage: it frequently prompted requests for "advanced feature" permissions—essentially seeking access to my visited URL history. Out of a commitment to privacy, I never consented.

Until a few months ago, a version update of CrxMouse led to anomalies when I visited the 52PoJie forum: users couldn't log in, couldn't rate posts, and pages wouldn't even auto-redirect after replying. Through troubleshooting, I quickly confirmed the root cause was the JavaScript injected by the plugin. Many other users in the forum reported similar issues, assuming it was a website problem, when in fact it was a plugin compatibility issue.

I hoped the plugin author would fix it quickly. Unfortunately, despite two subsequent updates, the issue persisted. After waiting for over a month with no progress, I realized I might need to find an alternative. However, there were few similar plugins on the market, and their functions hardly met my needs.

So, I decided to do it myself. And thus, FlowMouse was born.

Here, I still want to thank CrxMouse. Not only did it bring me efficiency improvements for many years, but the problems it exposed directly catalyzed the development of this new plugin. I also want to thank the Edge browser. Aside from the few core gestures I use frequently, the remaining gestures in FlowMouse were complemented by referencing Edge's common gestures. I've always envied the smooth performance and excellent compatibility of Edge's native gestures—after all, native support is indeed much better than drawing trails via JavaScript.

FlowMouse hopes to continue the convenience of gesture operations while placing greater emphasis on privacy protection and stable compatibility. This is a small project born from actual needs and returning to user experience. If you have encountered similar troubles, perhaps this can offer you a new choice.

---

**FlowMouse · Make browsing smoother, make operations follow your heart.**

---

### 👨‍💻 Author Info
- **Author**: Hmily[LCG]
- **Website**: [https://www.52pojie.cn/thread-2080303-1-1.html](https://www.52pojie.cn/thread-2080303-1-1.html)
- **GitHub**: [https://github.com/Hmily-LCG/FlowMouse](https://github.com/Hmily-LCG/FlowMouse)
- **Email**: Service@52pojie.cn
- Welcome to report issues and suggestions via email.
