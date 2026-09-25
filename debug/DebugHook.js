// DEVELOPMENT ONLY - not included in release builds (see build-legacy.sh --debug).
// Relaunch the app with {"pw2eval": "<js>"} to evaluate JS in the app context;
// the result is written to the system log prefixed with PW2EVAL.
/*global enyo, console, window */
enyo.kind({
    name: "preware.DebugHook",
    kind: "Component",
    components: [{kind: "Signals", onrelaunch: "relaunch"}],
    relaunch: function (inSender, inEvent) {
        var params = inEvent || {}, result;
        if (typeof params === "string") {
            try { params = JSON.parse(params); } catch (e) { params = {}; }
        }
        if (params.pw2eval) {
            try {
                /*jslint evil: true */
                result = eval(params.pw2eval);
                console.log("PW2EVAL OK: " + (typeof result === "object" ? JSON.stringify(result) : String(result)));
            } catch (err) {
                console.error("PW2EVAL ERR: " + err + " " + (err.stack || ""));
            }
        }
    }
});
window.pw2debugHook = new preware.DebugHook();
