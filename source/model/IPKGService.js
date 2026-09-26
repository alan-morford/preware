/*jslint sloppy: true */
/*global enyo, preware, $L, console */

enyo.singleton({
    name: "preware.IPKGService",
    identifier: 'palm://' + preware.Platform.serviceName(),
    log: "",
    logNum: 1,
    //Requests that are still running. They must stay referenced: on legacy webOS an
    //unreferenced request (and its PalmServiceBridge) can be garbage collected while
    //the service is still answering, and the rest of the replies are lost.
    activeRequests: {},
    requestCounter: 0,
    //Every call gets its own request, so calls can run in parallel (e.g. several feed downloads).
    //Subscribed calls stream the progress of one operation; they are closed when it has finished.
    doServiceCall: function (callback, method, parameters) {
        var self = this,
            id = (this.requestCounter += 1),
            subscribe = parameters ? !!parameters.subscribe : false,
            request = new enyo.ServiceRequest({
                service: this.identifier,
                method: method,
                subscribe: subscribe,
                //retrying a failed call every 10s would call the callbacks again (and again...).
                resubscribe: false
            }),
            finished = function (payload) {
                return !payload || payload.returnValue === false ||
                    payload.stage === "completed" || payload.stage === "end" || payload.stage === "failed";
            },
            done = function () {
                delete self.activeRequests[id];
            },
            generalSuccess = function (inSender, inResponse) {
                // console.log(JSON.stringify(inSender.request), "IPKService#generalSuccess: " + JSON.stringify(inResponse));
                // Close the request once it is answered: a request left open gets an
                // error when the service goes away (restarted), which would call its
                // callback a second time (and run e.g. the start-up checks again).
                if (!subscribe || finished(inResponse)) {
                    request.cancel();
                    done();
                }
                if (callback) {
                    callback(inResponse);
                }
            },
            generalFailure = function (inSender, inError) {
                console.error("IPKGService#generalFailure: " + JSON.stringify(inError));
                request.cancel();
                done();
                if (callback) {
                    callback(inError);
                }
            };

        //console.log("Complete request: luna-send -n 10 " + this.identifier + "/" + method + " '" + JSON.stringify(parameters)  + "'");
        this.activeRequests[id] = request;
        request.response(generalSuccess);
        request.error(generalFailure);
        request.go(parameters);
        return request;
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
    //On LuneOS Preware 2 keeps its feeds apart from the ones LuneOS ships, in
    //files named preware2-<config>, and shows only its own. The rest of the app
    //sees the configs without the prefix, as on legacy webOS.
    //See preware.LuneOSFeeds for the default feeds there.
    configPrefix: preware.Platform.isLegacy ? "" : "preware2-",
    //config shown -> file, from the last list_configs (LuneOS)
    configFiles: {},
    configFile: function (config) {
        return this.configFiles[config] || this.configPrefix + config;
    },
    //true if the file behind a config shown is one Preware 2 added itself.
    isOwnConfig: function (config) {
        return this.configFile(config).indexOf(this.configPrefix) === 0;
    },
    list_configs: function (callback) {
        var self = this;
        return this.doServiceCall(function (payload) {
            //LuneOS's stock service answers an empty feed folder (a fresh phone)
            //without a configs array: that is an empty list, not an error.
            if (payload && payload.returnValue !== false && !payload.configs) {
                payload.configs = [];
            }
            if (self.configPrefix && payload && payload.configs) {
                payload.configs = self.ownConfigs(payload.configs);
            }
            if (callback) {
                callback(payload);
            }
        }, "getConfigs");
    },
    //LuneOS: the configs Preware 2 shows. A feed LuneOS ships that is one of the
    //default feeds is shown (under the default's config name) instead of adding
    //it again; then the ones Preware 2 added, without the prefix.
    ownConfigs: function (all) {
        var prefix = this.configPrefix, configs = [], files = {}, i, c, name, feed;
        for (i = 0; i < all.length; i += 1) {
            c = all[i];
            if (c.config.indexOf(prefix) !== 0 && c.contents) {
                feed = preware.LuneOSFeeds.defaultFeedFor((c.contents.split("<br>")[0].split(" ")[2]) || "");
                if (feed && !files[feed.config]) {
                    files[feed.config] = c.config;
                    c.config = feed.config;
                    configs.push(c);
                }
            }
        }
        for (i = 0; i < all.length; i += 1) {
            c = all[i];
            if (c.config.indexOf(prefix) === 0) {
                name = c.config.substring(prefix.length);
                if (!files[name]) {
                    files[name] = c.config;
                    c.config = name;
                    configs.push(c);
                }
            }
        }
        this.configFiles = files;
        return configs;
    },
    setConfigState: function (callback, config, enabled) {
        var params = {
            config: this.configFile(config),
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
    //register an app as handler for a file extension / mime type (legacy webOS).
    addResource: function (callback, extension, mimeType, appId) {
        return this.doServiceCall(callback, "addResource", {extension: extension, mimeType: mimeType, appId: appId});
    },
    //make the handler with this index the default one for mimeType (legacy webOS).
    swapResource: function (callback, mimeType, index) {
        return this.doServiceCall(callback, "swapResource", {mimeType: mimeType, index: index});
    },
    //the service exits and is started again (by upstart / dbus).
    restart: function (callback) {
        return this.doServiceCall(callback, "restart");
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
            config: this.configFile(config),
            name: name,
            url: url,
            gzip: gzip
        };
        return this.doServiceCall(callback, "addConfig", params);
    },
    deleteConfig: function (callback, config, name) {
        var params = {
            subscribe: true,
            config: this.configFile(config),
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
