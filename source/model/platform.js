/*jslint sloppy: true */
/*global enyo, preware, navigator, window */

// Differences between LuneOS and legacy (Palm/HP) webOS 2.x/3.x.
enyo.singleton({
    name: "preware.Platform",
    // legacy webOS user agents contain "webOS/2.2.4" (phones) or "hpwOS/3.0.5" (TouchPad)
    isLegacy: /hpwOS\/|webOS\/[1-3]\./.test(navigator.userAgent),
    // legacy webOS uses the package manager service installed by the original Preware.
    serviceName: function () {
        return this.isLegacy ? "org.webosinternals.ipkgservice" : "org.webosports.service.ipkg";
    },
    // The TouchPad has no gesture area, so the toolbar grabber is always shown and tapping it goes back.
    alwaysShowGrabber: function () {
        return this.isLegacy;
    }
});

// The legacy WebKit (534.6) intermittently fails to paint composited layers holding
// long lists (the package list panel stays blank), so don't use 3D acceleration there.
if (preware.Platform.isLegacy) {
    enyo.dom.accelerando = false;
}
