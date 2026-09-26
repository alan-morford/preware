/*jslint sloppy: true */
/*global enyo, preware, console, window */

enyo.singleton({
    name: "preware.PrefCookie",
    published: {
        prefs: false
    },
    get: function (reload) {
        try {
            if (!this.prefs || reload) {
                //setup our default preferences
                this.prefs = {
                    //Global Group
                    theme: 'palm-default',

                    //Startup Group
                    updateInterval: 'launch',
                    lastUpdate: 0, //will be updated every time update is successful
                    fixUnknown: true,

                    // Actions Group
                    //rescanLauncher: true, // no longer in use
                    avoidBugs: true,
                    useTuckerbox: false,
                    ignoreDevices: false,

                    // Main Scene Group
                    showAvailableTypes: false,
                    showTypeApplication: true,
                    showTypeTheme: false,
                    showTypePatch: true,
                    showTypeOther: true,

                    // List Scene Group
                    listSort: 'default',
                    secondRow: 'version,maint',
                    listInstalled: false,
                    searchDesc: false,

                    // Background Group
                    backgroundUpdates: 'disabled',
                    autoInstallUpdates: false,

                    // Blacklist Group
                    blackList: [],
                    blackAuto: 'none',

                    // For Resource Handler Object
                    resourceHandlerCheck: true,

                    // LuneOS: the default feeds have been added (preware.LuneOSFeeds)
                    luneosFeedsSetUp: false,

                    // Hidden Advanced Group
                    rodMode:        false, // haha
                    browseFromRoot:    false
                    //allowFlagSkip: false
                };

                // uncomment to delete cookie for testing
                //enyo.setCookie("preware-cookie-set", false);
                this.getAllValues();
            }
            return this.prefs;
        } catch (e) {
            console.error('preferenceCookie#get: ' + e);
        }
    },
    getAllValues: function () {
        var field, value;
        if (this.readValue("preware-cookie-set")) {
            for (field in this.prefs) {
                if (this.prefs.hasOwnProperty(field)) {
                    value = this.readValue(field);
                    console.log("COOKIE, READ: " + field + " = " + value);
                    if (value !== undefined) {
                        this.prefs[field] = this.coerce(this.prefs[field], value);
                    }
                }
            }
        } else {
            this.warn("COULD NOT GET COOKIE!!!");
            this.setAllValues();
        }
    },
    //cookies only store strings, convert back to the type of the default value.
    //otherwise "false" would be truthy.
    coerce: function (defaultValue, value) {
        if (typeof value !== "string") {
            return value;
        }
        if (typeof defaultValue === "boolean") {
            return value === "true";
        }
        if (typeof defaultValue === "number") {
            return isNaN(Number(value)) ? defaultValue : Number(value);
        }
        if (enyo.isArray(defaultValue)) {
            return value ? value.split(",") : [];
        }
        return value;
    },
    put: function (obj, value) {
        try {
            if (!this.prefs) {
                this.get();
            }

            if (value !== undefined) {
                this.prefs[obj] = value;
                this.writeValue(obj, value); //take a shortcut here.
                this.writeValue("preware-cookie-set", true);
            } else {
                this.prefs = obj;
                this.setAllValues();
            }
        } catch (e) {
            console.log('preferenceCookie#put: ' + e);
        }
    },
    setAllValues: function () {
        var field;
        for (field in this.prefs) {
            if (this.prefs.hasOwnProperty(field)) {
                this.writeValue(field, this.prefs[field]);
            }
        }
        this.writeValue("preware-cookie-set", true);
    },
    //LuneOS runs the app from file://, where the web runtime keeps no cookies,
    //so the preferences are kept in localStorage. They are still written to the
    //cookies too, and read from there when localStorage does not have them yet
    //(the preferences of earlier versions on legacy webOS).
    readValue: function (name) {
        var value = null;
        try {
            value = window.localStorage.getItem("preware2." + name);
        } catch (e) {
            console.log("preferenceCookie#readValue: " + e);
        }
        return value !== null ? value : enyo.getCookie(name);
    },
    writeValue: function (name, value) {
        try {
            window.localStorage.setItem("preware2." + name, value);
        } catch (e) {
            console.log("preferenceCookie#writeValue: " + e);
        }
        enyo.setCookie(name, value);
    }
});

