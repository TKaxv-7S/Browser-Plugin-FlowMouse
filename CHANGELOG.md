## FlowMouse Changelog

### v1.3 (2026-03-17)

**New Features:**
- **Added support for Firefox and Edge browsers**
- **Added mouse wheel gestures: Hold right mouse button and scroll up/down**
- **Added special gestures: Hold right mouse button and left-click / Hold left mouse button and right-click**
- **Expert Mode: Added command chains, allowing multiple actions to be executed in a single gesture**
- Support displaying the option to disable/enable gestures in the right-click context menu
- New color picker, supporting adjustments for gesture text/line opacity, blur, disabling shadows, etc.
- Expert Mode: Support adjusting gesture turning tolerance settings
- Added new gestures:
  - **Simulate Keystrokes**
  - Send Custom Events (Thanks to @g9wp)
  - Switch to First Tab / Switch to Last Tab
  - Pin/Unpin Current Tab
  - Close Window
  - Copy Page Title along with Current URL

**Gesture Improvements:**
- Support adjusting scroll distance and animation for each scroll gesture individually
- Optimized continuous scroll animations; support setting continuous scroll acceleration
- Gestures for switching to the left/right/first/last tab can now be configured to move the current tab instead
- New gesture action selection interface
- Support adjusting settings for certain gesture commands individually

**Drag & Drop Improvements:**
- **Dragging in the same direction supports executing multiple actions, such as multi-engine reverse image search / multi-engine search, etc.**
- **Support for custom drag-and-drop gestures**
- **Support opening pages in an Incognito/Private window when dragging**
- Support dragging to copy link text

**Interface & More Improvements:**
- **Brand new Logo design (Thanks to @Ps出来的小赵)**
- **Refactored code significantly to optimize performance and fix bugs**
- **New settings interface design**
- **Redesigned gesture recording process**
- Improved the design of the extension button popup
- Added reset buttons for specific options in the settings interface
- Improved language selection menu design
- Fixed an issue on macOS/Linux where gestures might affect the web page's right-click context menu
- Fixed an issue in Chrome where right-clicking on Bing web pages might break links
- Improved support for some third-party Android browsers
- Other minor improvements


### v1.2 (2026-02-10)

**New Features:**
- **Interactive tutorial displayed upon first installation**
- **Improved localization, supporting 39 languages**
- **Added prompts for pages with restricted gestures (can be partially disabled in settings)**
- Added new gestures:
    - Mute/Unmute Current Tab
    - Mute/Unmute All Tabs
    - Close Tab (Keep Window)
    - Close Tabs to the Left
    - Close Browser
    - Refresh All Tabs
- Gesture recognition uses a dynamic threshold algorithm to reduce misinterpretation
- Gesture trails use a smoothing algorithm for better visual experience
- Support for using gestures and drag-and-drop within the FlowMouse settings page
- Support for using ESC to interrupt gestures and drag-and-drop

**Gesture Improvements:**
- **Improved gesture experience on websites using iframes**
- Advanced Settings: Support for using system (high-performance) scroll animation; support for disabling animation
- Advanced Settings: Support adjusting gesture recognition trigger distance
- Fixed issue where scrolling gestures did not work on some websites
- Support searching with the browser's default search engine, and added more search engines

**Drag & Drop Improvements:**
- Optimized Super Drag: automatically cancel drag when the mouse leaves the window
- **Advanced Settings: Support prioritizing opening links when dragging text or images containing links**
- Advanced Settings: Support opening dragged targets in the current tab
- Fixed drag-and-drop issues on websites like Bilibili
- Fixed dragging of relative URL paths
- Fixed issue where drag-to-copy gestures failed on HTTP protocol pages
- Adapted for press-and-drag on touch screens and stylus pens

**Interface & More Improvements:**
- **New interface design for settings page; adjusted feature layout**
- **Clearer gesture arrow design**
- Optimized settings sync; supports syncing more settings (using "Export Configuration" is recommended for local backups)
- Reduced default permission requests; request permissions on demand when selecting "Save Image" or "Add Bookmark" gestures
- Fixed layout and font errors in gesture hint boxes on some websites
- Gesture hint boxes now use Shadow DOM to avoid interference from website styles
- Improved support for RTL languages
- Refactored code significantly to optimize performance and fix bugs
- Other minor improvements


### v1.1 (2025-12-24)

**Fixes & Optimizations:**
- **System Compatibility**: **Fixed right-click menu conflict on Mac and Linux; changed to double-click to call out the context menu to ensure mouse gestures work**.
    > Note: Due to macOS system characteristics, when dragging text, you must select the text, hold the left button briefly, and then drag; otherwise, the search may not trigger.
- **Default Experience Optimization**:
    - **Re-adjusted default gesture mapping to align with Edge browser, reducing the learning curve**.
    - New tab opening position changed from "Far Right" to **Right of Current Tab**.
    - Removed smooth scrolling animation for "Scroll to Top/Bottom" to significantly improve response speed.
- **Bug Fixes**:
    - Fixed issue where `localhost` domains could not be added to the blacklist.
    - Fixed issue where dragging left accidentally triggered "Create Split View," causing functionality failure.
- **Recognition Optimization**: Optimized gesture matching rules; gestures must strictly match the trajectory to respond, effectively preventing false positives.
- **Other**: Multiple detail experience optimizations.

**New Features:**
- **Global Switch**: Added a global "Enable/Disable" switch for **Mouse Gestures** (Super Drag is unaffected).
- **More Gesture Actions**: Added "Maximize/Restore Window", "Minimize Window", "Open Custom URL", "Copy Current URL", and other practical operations.
- **Advanced Settings** (Built for power users):
    - **Custom Scrolling**: Supports customizing scroll distance for "Scroll Up/Down" gestures.
    - **Visual Tweaks**: Supports enabling/disabling the display of the gesture trail origin point.
    - **Custom Gestures**: Supports drawing and adding custom mouse gestures (default supports 4-way combinations ↑↓←→).
    - **Super Drag Enhancements**:
        - Fully supports 4-way (↑↓←→) dragging and foreground/background opening settings for text, images, and links.
        - **Text**: Added "Copy Text".
        - **Images**: Added "Save Image", "Copy Image Address", "Custom Image Search".
        - **Links**: Added "Copy Link".