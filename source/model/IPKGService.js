/*jslint sloppy: true */
/*global enyo, preware, $L, console */

enyo.singleton({
    name: "preware.IPKGService",
    identifier: 'palm://' + preware.Platform.serviceName(),
    log: "",
    logNum: 1,
    doServiceCall: function (callback, method, parameters) {
        if (this.request && this.request.getSubscribe()) {
            this.request.cancel();
        }
        this.request = new enyo.ServiceRequest({
            service: this.identifier,
            method: method,
            subscribe: parameters ? parameters.subscribe : false,
            //these subscriptions only stream the result of one operation, retrying a failed
            //call every 10s would call the callbacks again (and again...).
            resubscribe: false
        });
        var generalSuccess = function (inSender, inResponse) {
                // console.log(JSON.stringify(inSender.request), "IPKService#generalSuccess: " + JSON.stringify(inResponse));
                if (callback) {
                    callback(inResponse);
                }
            },
            generalFailure = function (inSender, inError) {
                console.error("IPKGService#generalFailure: " + JSON.stringify(inError));
                if (callback) {
                    callback(inError);
                }
            };

        //console.log("Complete request: luna-send -n 10 " + this.identifier + "/" + method + " '" + JSON.stringify(parameters)  + "'");
        this.request.response(generalSuccess.bind(this));
        this.request.error(generalFailure.bind(this));
        return this.request.go(parameters);
    },
    //true if the payload says the package manager service is not available.
    isNotRunning: function (payload) {
        return !!payload && payload.errorText === preware.Platform.serviceName() + " is not running.";
    },
    version: function (callback) {
        return this.doServiceCall(callback, "version");
    },
    getMachineName: function (callback) {
        return this.doServiceCall(callback, "getMachineName");
    },
    impersonate: function (callback, id, service, method, params) {
        var parameter = {
                id: id,
                service: service,
                method: method,
                params: params,
                subscribe: params.subscribe ? true : false
            };
        return this.doServiceCall(callback, "impersonate", parameter);
    },
    setAuthParams: function (callback, deviceId, token) {
        var params = { //parameters to the service go as parameters to the go method.
                deviceId: deviceId,
                token: token
            };
        return this.doServiceCall(callback, "setAuthParams", params);
    },
    list_configs: function (callback) {
        return this.doServiceCall(callback, "getConfigs");
    },
    setConfigState: function (callback, config, enabled) {
        var params = {
            config: config,
            enabled: enabled
        };
        return this.doServiceCall(callback, "setConfigState", params);
    },
    extractControl: function (callback, filename, url) {
        var params = {
            filename: filename,
            url: url,
            subscribe: true
        };
        return this.doServiceCall(callback, "extractControl", params);
    },
    update: function (callback) {
        return this.doServiceCall(callback, "update", {subscribe: true});
    },
    getDirListing: function (callback, dir) {
        return this.doServiceCall(callback, "getDirListing", {directory: dir});
    },
    downloadFeed: function (callback, gzipped, feed, url) {
        var params = {
            subscribe: true,
            gzipped: gzipped,
            feed: feed,
            url: url
        };
        return this.doServiceCall(callback, "downloadFeed", params);
    },
    getListFile: function (callback, feed) {
        var params = {
            subscribe: true,
            feed: feed
        };
        return this.doServiceCall(callback, "getListFile", params);
    },
    getStatusFile: function (callback) {
        var params = {
            subscribe: true
        };
        return this.doServiceCall(callback, "getStatusFile", params);
    },
    install: function (callback, pkg, filename, url) {
        var params = {
            subscribe: true,
            filename: filename,
            pkg: pkg, 
            url: url
        };
        return this.doServiceCall(callback, preware.PrefCookie.get().avoidBugs ? "installSvc" : "installCli", params);
    },
    replace: function (callback, pkg, filename, url) {
        var params = {
            pkg: pkg,
            "package": pkg, //name used by the legacy org.webosinternals.ipkgservice
            subscribe: true,
            filename: filename,
            url: url
        };
        return this.doServiceCall(callback, preware.PrefCookie.get().avoidBugs ? "replaceSvc" : "replaceCli", params);
    },
    remove: function (callback, pkg) {
        var params = {
            pkg: pkg,
            "package": pkg, //name used by the legacy org.webosinternals.ipkgservice
            subscribe: true
        };
        return this.doServiceCall(callback, "remove", params);
    },
    rescan: function (callback) {
        return this.doServiceCall(callback, "rescan");
    },
    restartLuna: function (callback) {
        return this.doServiceCall(callback, "restartLuna");
    },
    restartJava: function (callback) {
        return this.doServiceCall(callback, "restartJava");
    },
    restartDevice: function (callback) {
        return this.doServiceCall(callback, "restartDevice");
    },
    getAppinfoFile: function (callback, pkg) {
        var params = {
            "package": pkg,
            subscribe: true
        };
        return this.doServiceCall(callback, "getAppinfoFile", params);
    },
    getControlFile: function (callback, pkg) {
        var params = {
            "package": pkg,
            subscribe: true
        };
        return this.doServiceCall(callback, "getControlFile", params);
    },
    getPackageInfo: function (callback, pkg) {
        var params = {
            "package": pkg,
            subscribe: true
        };
        return this.doServiceCall(callback, "getPackageInfo", params);
    },
    addConfig: function (callback, config, name, url, gzip) {
        var params = {
            subscribe: true,
            config: config,
            name: name,
            url: url,
            gzip: gzip
        };
        return this.doServiceCall(callback, "addConfig", params);
    },
    deleteConfig: function (callback, config, name) {
        var params = {
            subscribe: true,
            config: config,
            name: name
        };
        return this.doServiceCall(callback, "deleteConfig", params);
    },
    installStatus: function (callback) {
        return this.doServiceCall(callback, "installStatus");
    },
    logClear: function () {
        this.log = "";
        this.logNum = 1;
    },
    logPayload: function (payload, stage) {
        if ((payload.stage && (payload.stage !== "status") && (payload.stage !== "complete")) || stage) {
            var s, stdPlus;
            this.log += '<div class="container ' + (this.logNum % 2 ? 'one' : 'two') + '">';

            if (payload.stage) {
                this.log += '<div class="title">' + payload.stage + '</div>';
            } else if (stage) {
                this.log += '<div class="title">' + stage + '</div>';
            }

            stdPlus = false;

            if (payload.errorCode || payload.errorText) {
                stdPlus = true;
                this.log += '<div class="stdErr">';
                this.log += '<b>' + payload.errorCode + '</b>: ';
                this.log += payload.errorText;
                this.log += '</div>';
            }

            if (payload.stdOut && payload.stdOut.length > 0) {
                stdPlus = true;
                this.log += '<div class="stdOut">';
                for (s = 0; s < payload.stdOut.length; s += 1) {
                    this.log += '<div>' + payload.stdOut[s] + '</div>';
                }
                this.log += '</div>';
            }

            if (payload.stdErr && payload.stdErr.length > 0) {
                stdPlus = true;
                this.log += '<div class="stdErr">';
                for (s = 0; s < payload.stdErr.length; s += 1) {
                    // These messages just confuse users
                    if (!payload.stdErr[s].indexOf($L("(offline root mode: not running ")) > -1) {
                        this.log += '<div>' + payload.stdErr[s] + '</div>';
                    }
                }
                this.log += '</div>';
            }

            if (!stdPlus) {
                this.log += $L("<div class=\"msg\">Nothing Interesting.</div>");
            }

            this.log += '</div>';
            this.logNum += 1;
        }
    },
    getIPKLog: function () {
        return this.log;
    }
});
