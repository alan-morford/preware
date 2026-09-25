/*jslint sloppy: true, continue:true */
/*global enyo, window, device, console, preware, $L, setTimeout, clearTimeout, setTimeout */

enyo.singleton({
    name: "UpdateFeeds",
    // required ipkgservice
    ipkgServiceVersion: 14,
    downloaded: false,
    onlyLoad: false,
    timeouts: [],
    components: [
        {
            kind: "Signals",
            onPackagesLoadFinished: "donePackageParsing",
            onLoadFeedsFinished: "doneLoadingFeeds"
        }
    ],

    //emited signals:
    // onUpdateFeedsFinished: {} //emitted when loading is finished.

    //Handlers
    //this is called from FeedsModel after we loaded the feed configuration from disk.
    //This is triggered from multiple occasions:
    //one is right before feed update
    //the other one is if we just load the feeds without update.
    doneLoadingFeeds: function (inSender, inEvent) {
        this.feeds = inEvent.feeds;

        if (this.downloaded || this.onlyLoad || !this.hasNet) {
            this.log("Not downloading, because onlyLoad: " + this.onlyLoad + " and alreadyDownloaded: " + this.downloaded + " and hasNet: " + this.hasNet);
            this.parseFeeds(inSender, inEvent);
        } else {
            if (this.feeds.length) {
                this.log("Starting download of first feed.");
                this.downloadFeedRequest(0);
            } else {
                this.log("Not downloading feeds, length: " + this.feeds.length);
                this.downloaded = true;
                this.loadFeeds(); //let ipkg service load the feeds again.
            }
        }
    },
    donePackageParsing: function (inSender, inEvent) {
        //this is the end of the update process.. trigger parent.
        enyo.Signals.send("onUpdateFeedsFinished", {});
    },

    //start the update process.
    //first we need some device information.
    //we need device profile and palm profile for a call to
    //IPKGService.setAuthParams. This probably is necessary for
    //App Catalog apps...?
    //If that does not work, we just get the machine name and are done.
    startUpdateFeeds: function (force) {
        if (window.PalmServiceBridge === undefined) {
            this.log("No PalmServiceBridge found.");
        } else {
            this.log("PalmServiceBridge found.");
        }

        if (!window.device) {
            window.device = {};
        }
        if ("PalmSystem" in window) {
            var deviceInfo = JSON.parse(PalmSystem.deviceInfo);
            if (! device.version) {
                device.version = deviceInfo.platformVersion;
            }
            if (! device.name) {
                device.name = deviceInfo.modelNameAscii;
            }
        }

        this.log("device.version: " + (device ? device.version : "undefined"));
        this.log("device.name: " + (device ? device.name : "undefined"));

        switch (preware.PrefCookie.get().updateInterval) {
        case "launch":
            this.onlyLoad = false;
            break;
        case "manual":
            this.onlyLoad = true;
            break;
        case "daily":
            var lastUpdate = preware.PrefCookie.get().lastUpdate,
                dateLastUpdate,
                dateNow = new Date();
            if (lastUpdate === 0 || lastUpdate === "0") {
                this.onlyLoad = false;
            } else {
                dateLastUpdate = new Date(lastUpdate * 1000);
                if (dateLastUpdate.getYear() === dateNow.getYear()
                        && dateLastUpdate.getMonth() === dateNow.getMonth()
                        && dateLastUpdate.getDate() === dateNow.getDate()) {
                    this.log("Already updated feeds today, don't do it again. Dates: " + dateLastUpdate + " and " + dateNow);
                    this.onlyLoad = true;
                } else {
                    this.log("Not updated feeds today, do it again. Dates: " + dateLastUpdate + " and " + dateNow);
                    this.onlyLoad = false;
                }
            }
            break;
        case "ask":
            this.log("Ask not yet implemented! Falling back to manual.");
            this.onlyLoad = true;
            break;
        default:
            this.onlyLoad = true;
            break;
        }

        if (force) {
            this.log("Forced to download, will download anyway.");
            this.onlyLoad = false;
        }

        this.log("Start Loading Feeds");
        this.downloaded = false;
        preware.DeviceProfile.getDeviceProfile(this.gotDeviceProfile.bind(this), false);
    },

    gotDeviceProfile: function (inSender, inEvent) {
        if (!inEvent.success || !inEvent.deviceProfile) {
            preware.IPKGService.getMachineName(this.onDeviceType.bind(this));
        } else {
            this.deviceProfile = inEvent.deviceProfile;
            preware.PalmProfile.getPalmProfile(this.gotPalmProfile.bind(this), false);
        }
    },
    gotPalmProfile: function (inSender, inEvent) {
        if (!inEvent.success || !inEvent.palmProfile) {
            preware.IPKGService.getMachineName(this.onDeviceType.bind(this));
        } else {
            this.palmProfile = inEvent.palmProfile;
            preware.IPKGService.setAuthParams(this.authParamsSet.bind(this),
                    this.deviceProfile.deviceId,
                    this.palmProfile.token);
        }
    },
    authParamsSet: function (inResponse) {
        preware.IPKGService.getMachineName(this.onDeviceType.bind(this));
    },

    //if we reached here, we got all the configuration stuff we needed.
    onDeviceType: function (inResponse) {
        this.log("Got machine name: " + JSON.stringify(inResponse));

        if (!this.onlyLoad) {
            // start by checking the internet connection
            var request = new enyo.ServiceRequest({
                service: "palm://com.palm.connectionmanager/",
                method: "getstatus"
            });
            request.response(this, this.onConnection);
            request.error(this, this.onConnection);
            request.go();
        } else {
            this.loadFeeds();
        }
    },
    //connection check happens before download. If no connection, only existing feeds will be loaded.
    onConnection: function (inSender, inResponse) {
        this.hasNet = false;
        if (inResponse && inResponse.returnValue === true &&
                (inResponse.isInternetConnectionAvailable === true ||
                    (inResponse.wifi && inResponse.wifi.state === "connected"))) {
            this.hasNet = true;
        }
        this.log("Got Connection Status. Connection: " + this.hasNet);
        //this.log("Complete Response: " + JSON.stringify(inResponse));

        // run version check
        preware.IPKGService.version(this.onVersionCheck.bind(this));
    },
    onVersionCheck: function (payload) {
        //this.log("Version Check Returned: " + JSON.stringify(payload));
        try {
            // log payload for display
            preware.IPKGService.logPayload(payload, 'VersionCheck');

            if (!payload) {
                // i dont know if this will ever happen, but hey, it might
                this.fatal($L("Cannot access the service. First try restarting Preware, or reboot your device and try again."));
            } else if (payload.errorCode !== undefined) {
                if (preware.IPKGService.isNotRunning(payload)) {
                    this.fatal($L("The service is not running. First try restarting Preware, or reboot your device and try again."));
                } else if (preware.Platform.isLegacy && payload.errorText && payload.errorText.indexOf("does not exist") >= 0) {
                    this.fatal($L("The Package Manager Service is not installed.<br>Preware 2 uses the service that comes with the original Preware, please install Preware (org.webosinternals.preware) first."));
                } else {
                    this.fatal(payload.errorText);
                }
            } else {
                if (payload.apiVersion && payload.apiVersion < this.ipkgServiceVersion) {
                    // this is if this version is too old for the version number stuff
                    this.fatal($L("The service version is too old. First try rebooting your device, or reinstall Preware and try again."));
                } else {
                    this.downloaded = false;
                    this.error = false;
                    this.loadFeeds(); //load feed configuration anyway. Result will decide what do next..
                }
            }
        } catch (e) {
            this.log("app#onVersionCheck: " + e);
        }
    },

    //show an error that stops the update process.
    fatal: function (message) {
        this.log(message);
        enyo.Signals.send("onPackagesStatusUpdate", {message: message, error: true});
    },

    //trigger update of one feed:
    downloadFeedRequest: function (num) {
        // update display
        enyo.Signals.send("onPackagesStatusUpdate", {message: $L("<strong>Downloading Feed Information</strong><br>") + this.feeds[num].name});

        // subscribe to new feed
        preware.IPKGService.downloadFeed(this.downloadFeedResponse.bind(this, num),
                                        this.feeds[num].gzipped, this.feeds[num].name, this.feeds[num].url);
    },
    downloadFeedResponse: function (num, payload) {
        var goToNextFeed = function () {
            num = num + 1;
            if (num < this.feeds.length) {
                // start next
                this.downloadFeedRequest(num);
            } else {
                // we're done
                var msg = "<strong>" + $L("Done Downloading!") + "</strong>";
                if (this.error) {
                    msg += "<br>" + $L("Some feeds failed to download.");
                    setTimeout(this.loadFeeds.bind(this), 5000);
                } else {
                    // well updating looks to have finished, lets log the date:
                    preware.PrefCookie.put('lastUpdate', Math.round(Date.now() / 1000));
                    this.loadFeeds();
                }
                enyo.Signals.send("onPackagesStatusUpdate", {message: msg});

                this.downloaded = true;
            }
        };

        if (!payload.returnValue || payload.stage === "failed") {
            this.log(payload.errorText + '<br>' + (payload.stdErr ? payload.stdErr.join("<br>") : ""));
            this.error = true;

            goToNextFeed.call(this);
        } else if (payload.stage === "status") {
            enyo.Signals.send("onPackagesStatusUpdate", {message: $L("<strong>Downloading Feed Information</strong><br>") + this.feeds[num].name + "<br><br>" + payload.status});
        } else if (payload.stage === "completed") {
            goToNextFeed.call(this);
        }
    },
    loadFeeds: function () {
        // lets call the function to update the global list of pkgs
        enyo.Signals.send("onPackagesStatusUpdate", {message: $L("<strong>Loading Package Information</strong><br>")});
        preware.FeedsModel.loadFeeds();
    },
    parseFeeds: function (inSender, inEvent) {
        preware.PackagesModel.loadFeeds(inEvent.feeds, this.onlyLoad);
    }
});
