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
    // The TouchPad has no gesture area, so a back button is needed when only one panel fits.
    // Phones running legacy webOS have a gesture area, but a button does not hurt there either.
    needsBackButton: function () {
        return this.isLegacy;
    }
});
