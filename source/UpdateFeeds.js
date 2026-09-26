/*jslint sloppy: true, continue:true */
/*global enyo, window, device, console, preware, $L, setTimeout, clearTimeout, setTimeout */

enyo.singleton({
    name: "UpdateFeeds",
    // required ipkgservice
    ipkgServiceVersion: 14,
    // first ipkgservice whose downloadFeed can be called for several feeds at once.
    // older ones build their replies in shared buffers, so asking them for more
    // than one feed at a time corrupts the responses.
    parallelServiceVersion: 18,
    serviceApiVersion: 0,
    // how many feeds are downloaded at the same time. Downloads spend most of their
    // time waiting on the network, so running several at once hides most of that wait.
    maxParallelDownloads: 6,
    // least time between status repaints (ms), the progress of several downloads
    // arrives faster than it is useful to redraw.
    progressRedrawMs: 400,
    // a feed download that has not answered for this long counts as failed (ms).
    feedTimeoutMs: 60000,
    // an update is running (time it started, 0 if none).
    updateStarted: 0,
    // an update that has not finished after this long is assumed dead (ms).
    updateStaleMs: 300000,
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
        if (!inEvent.success) {
            this.fatal(inEvent.message || $L("Could not read the feed configuration."));
            return;
        }
        this.feeds = inEvent.feeds;

        if (this.downloaded || this.onlyLoad || !this.hasNet) {
            this.log("Not downloading, because onlyLoad: " + this.onlyLoad + " and alreadyDownloaded: " + this.downloaded + " and hasNet: " + this.hasNet);
            this.parseFeeds(inSender, inEvent);
        } else {
            if (this.feeds.length) {
                this.log("Starting feed downloads.");
                this.downloadFeeds();
            } else {
                this.log("Not downloading feeds, length: " + this.feeds.length);
                this.downloaded = true;
                this.loadFeeds(); //let ipkg service load the feeds again.
            }
        }
    },
    //true while feeds are downloaded / packages loaded.
    isUpdating: function () {
        return this.updateStarted > 0 && (Date.now() - this.updateStarted) < this.updateStaleMs;
    },
    donePackageParsing: function (inSender, inEvent) {
        this.updateStarted = 0;
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
        // two updates at the same time download the same feeds twice, which can
        // wedge the legacy package manager service.
        if (this.isUpdating()) {
            this.log("Update already running, not starting another one.");
            return false;
        }
        this.updateStarted = Date.now();
        this.serviceStuck = false;
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
        preware.LuneOSFeeds.setUp(this.feedsSetUp.bind(this));
    },
    //on LuneOS the default feeds are added at the first start (see preware.LuneOSFeeds)
    feedsSetUp: function (added) {
        if (added) {
            this.log("Added the default feeds, downloading them.");
            this.onlyLoad = false;
        }
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
                    this.fatal($L("The Package Manager Service is not installed.<br>This happens when the original Preware is removed, since both use the same service. Restart your device, Preware 2 then installs it again, or reinstall Preware 2."));
                } else {
                    this.fatal(payload.errorText);
                }
            } else {
                // remember this so we know whether feeds can be downloaded in parallel
                this.serviceApiVersion = payload.apiVersion ? parseInt(payload.apiVersion, 10) : 0;
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
        this.updateStarted = 0;
        this.log(message);
        enyo.Signals.send("onPackagesStatusUpdate", {message: message, error: true});
    },

    //download all feeds, several at once if the service supports it.
    downloadFeeds: function () {
        var i, atOnce = this.serviceApiVersion >= this.parallelServiceVersion ? this.maxParallelDownloads : 1;
        this.downloadActive = {};
        this.downloadNext = 0;
        this.downloadDone = 0;
        this.downloadStatus = "";
        this.downloadStatusFeed = "";
        this.lastProgressDraw = 0;
        this.error = false;

        atOnce = Math.min(atOnce, this.feeds.length);
        for (i = 0; i < atOnce; i += 1) {
            this.downloadFeedRequest(this.downloadNext);
            this.downloadNext += 1;
        }
    },
    //show progress, naming only the feed we last heard from so the message keeps its size.
    displayDownloadProgress: function (force) {
        var num, name = this.downloadStatusFeed, now = Date.now(), msg;
        if (!force && this.lastProgressDraw && (now - this.lastProgressDraw) < this.progressRedrawMs) {
            return;
        }
        this.lastProgressDraw = now;

        if (!name) {
            for (num in this.downloadActive) {
                if (this.downloadActive.hasOwnProperty(num)) {
                    name = this.downloadActive[num].name;
                    break;
                }
            }
        }
        msg = $L("<strong>Downloading Feed Information</strong><br>") +
            this.downloadDone + $L(" of ") + this.feeds.length + "<br>" +
            (name || "&nbsp;") + "<br>" + (this.downloadStatus || "&nbsp;");
        enyo.Signals.send("onPackagesStatusUpdate", {message: msg});
    },
    //trigger update of one feed:
    downloadFeedRequest: function (num) {
        this.downloadActive[num] = this.feeds[num];
        this.watchFeed(num);
        this.displayDownloadProgress(true);

        preware.IPKGService.downloadFeed(this.downloadFeedResponse.bind(this, num),
                                        this.feeds[num].gzipped, this.feeds[num].name, this.feeds[num].url);
    },
    downloadFeedResponse: function (num, payload) {
        // this feed is already finished with, ignore late payloads
        if (!this.downloadActive[num]) {
            return;
        }
        this.watchFeed(num);

        if (!payload.returnValue || payload.stage === "failed") {
            this.log(this.feeds[num].name + ": " + payload.errorText + '<br>' + (payload.stdErr ? payload.stdErr.join("<br>") : ""));
            this.error = true;
            this.downloadFeedFinished(num);
        } else if (payload.stage === "status") {
            this.downloadStatusFeed = this.feeds[num].name;
            this.downloadStatus = payload.status;
            this.displayDownloadProgress();
        } else if (payload.stage === "completed") {
            this.downloadFeedFinished(num);
        }
    },
    //(re)start the timer that gives up on a feed download which stopped answering.
    watchFeed: function (num) {
        enyo.job("preware-feed-" + num, this.feedTimedOut.bind(this, num), this.feedTimeoutMs);
    },
    feedTimedOut: function (num) {
        if (this.downloadActive[num]) {
            this.log(this.feeds[num].name + ": download timed out");
            this.error = true;
            this.serviceStuck = true;
            this.downloadFeedFinished(num);
        }
    },
    downloadFeedFinished: function (num) {
        var msg;
        enyo.job.stop("preware-feed-" + num);
        if (this.downloadStatusFeed === this.feeds[num].name) {
            this.downloadStatusFeed = "";
            this.downloadStatus = "";
        }
        delete this.downloadActive[num];
        this.downloadDone += 1;

        // start the next feed in line, if there is one
        if (this.downloadNext < this.feeds.length) {
            this.downloadFeedRequest(this.downloadNext);
            this.downloadNext += 1;
            return;
        }
        if (this.downloadDone < this.feeds.length) {
            this.displayDownloadProgress(true);
            return; // still waiting on the other downloads
        }

        // we're done
        this.downloaded = true;
        if (this.serviceStuck) {
            // the service stopped answering, restart it so the next update works again.
            this.log("Restarting the package manager service.");
            preware.IPKGService.restart(function () {});
        }
        msg = "<strong>" + $L("Done Downloading!") + "</strong>";
        if (this.error) {
            msg += "<br>" + $L("Some feeds failed to download.");
            setTimeout(this.loadFeeds.bind(this), 5000);
        } else {
            // well updating looks to have finished, lets log the date:
            preware.PrefCookie.put('lastUpdate', Math.round(Date.now() / 1000));
            this.loadFeeds();
        }
        enyo.Signals.send("onPackagesStatusUpdate", {message: msg});
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
