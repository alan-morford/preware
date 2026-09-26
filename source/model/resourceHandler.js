/*jslint sloppy: true */
/*global enyo, preware, $L, PalmSystem, console */

// Makes Preware the application that opens .ipk files (from the browser, email, app
// catalogs...), like the original Preware's resourceHandler.js. On legacy webOS and on
// LuneOS, whose application manager (LunaAppManager) keeps the same handler list.
//
// check() looks at the current handlers and returns (to the callback) what to ask the user:
//   {action: "add"}                    Preware is not a handler for .ipk files at all
//   {action: "activate", active: name} Preware is a handler, but not the default one
//   false                              nothing to do
// fix() then registers Preware and/or makes it the default handler.
enyo.singleton({
    name: "preware.ResourceHandler",
    extension: "ipk",
    mime: "application/vnd.webos.ipk",
    appManager: "palm://com.palm.applicationManager",

    //the package to install from launch parameters: {type: "install", file: ...} or,
    //when opened as the .ipk handler, {target: ...}.
    launchFile: function (params) {
        if (!params) {
            return false;
        }
        if (params.type && params.type.toLowerCase() === "install" && params.file) {
            return params.file;
        }
        return params.target || false;
    },
    appId: function () {
        // PalmSystem.identifier is "<app id> <process id>"
        return window.PalmSystem ? PalmSystem.identifier.split(" ")[0] : "";
    },
    call: function (method, params, callback) {
        var request = new enyo.ServiceRequest({service: this.appManager, method: method});
        request.response(function (inSender, inResponse) { callback(inResponse); });
        request.error(function (inSender, inError) { callback(inError); });
        request.go(params || {});
    },
    //get the handlers for the ipk mime type, callback(resourceHandlers or false)
    listHandlers: function (callback) {
        this.call("listAllHandlersForMime", {mime: this.mime}, function (payload) {
            callback(payload && payload.returnValue ? payload.resourceHandlers : false);
        });
    },
    //the entry for this app in the handler list, or false.
    ourHandler: function (handlers) {
        var i, id = this.appId();
        if (!handlers) {
            return false;
        }
        if (handlers.activeHandler && handlers.activeHandler.appId === id) {
            return handlers.activeHandler;
        }
        for (i = 0; handlers.alternates && i < handlers.alternates.length; i += 1) {
            if (handlers.alternates[i].appId === id) {
                return handlers.alternates[i];
            }
        }
        return false;
    },
    check: function (callback) {
        if (!window.PalmSystem) {
            callback(false);
            return;
        }
        this.listHandlers(function (handlers) {
            var ours = this.ourHandler(handlers), active = handlers && handlers.activeHandler;
            if (!ours) {
                callback({action: "add"});
            } else if (!active || active.appId !== this.appId()) {
                callback({action: "activate", active: active ? active.appId : $L("None")});
            } else {
                callback(false);
            }
        }.bind(this));
    },
    //register this app for .ipk files (if needed) and make it the default handler.
    //The application manager only accepts these calls from the package manager service.
    fix: function (callback) {
        callback = callback || function () {};
        this.listHandlers(function (handlers) {
            if (this.ourHandler(handlers)) {
                this.activate(handlers, callback);
                return;
            }
            preware.IPKGService.addResource(function (payload) {
                if (!payload || !payload.returnValue) {
                    console.error("ResourceHandler: addResource failed: " + JSON.stringify(payload));
                    callback(false);
                    return;
                }
                this.listHandlers(function (newHandlers) {
                    this.activate(newHandlers, callback);
                }.bind(this));
            }.bind(this), this.extension, this.mime, this.appId());
        }.bind(this));
    },
    activate: function (handlers, callback) {
        var ours = this.ourHandler(handlers);
        if (!ours) {
            callback(false);
            return;
        }
        if (handlers.activeHandler && handlers.activeHandler.appId === this.appId()) {
            callback(true);
            return;
        }
        preware.IPKGService.swapResource(function (payload) {
            callback(!!(payload && payload.returnValue));
        }, this.mime, ours.index);
    }
});
