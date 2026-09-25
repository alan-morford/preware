/*jslint sloppy: true, continue:true */
/*global enyo, window, device, console, preware, $L, setTimeout, UpdateFeeds */

enyo.kind({
    name: "AppPanels",
    kind: "Panels",
    //FIXME bbito hack for qemux86/Tenderloin landscape compatibility
    //arrangerKind: "CollapsingArranger",
    arrangerKind: "CoreNaviArranger",
    peekWidth: 70,   // (600-320)/4
    classes: "app-panels enyo-fill",
    // required ipkgservice
    ipkgServiceVersion: 14,
    // filtered category/package lists
    currentType: "",
    showingTypeAndCategoriesPanels: false,

    menuPanelsIndex: 0,
    typePanelsIndex: 1,
    categoryPanelsIndex: 2,
    packagePanelsIndex: 3,
    packageDisplayPanelsIndex: 4,

    components: [
        {
            kind: "Signals",
            onbackbutton: "handleBackGesture",
            onPackagesStatusUpdate: "processStatusUpdate",
            onUpdateFeedsFinished: "doneLoading",
            ondeviceready: "handleDeviceReady"
        },

        //Menu
        {
            name: "MenuPanel",
            layoutKind: "FittableRowsLayout",
            style: "width: 33.3%",
            components: [
                {
                    kind: "PortsSearch",
                    title: "Preware 2",
                    taglines: [
                        "I live... again...",
                        "Miss me?",
                        "Installing packages, with a penguin!",
                        "How many Ports could a webOS Ports Port?",
                        "Not just for Apps anymore.",
                        "Serving apps for the last 1.67x10^8 seconds",
                        "Now with 100% more Enyo2!"
                    ]
                },
                {
                    name: "ScrollerPanel",
                    kind: "Panels",
                    arrangerKind: "CardArranger",
                    fit: true,
                    draggable: false,
                    components: [
                        { //boot-messages:
                            style: "width: 100%; height: 100%; background-image: url('assets/bg.png');",
                            components: [
                                {
                                    kind: "FittableRows",
                                    classes: "onyx-toolbar",
                                    style: "width: 90%; height: 224px; margin: 10% 2.5% 2.5% 2.5%; text-align: center; border-radius: 16px;",
                                    components: [
                                        {kind: "onyx.Spinner"},
                                        {
                                            name: "SpinnerText",
                                            style: "color: white;",
                                            allowHtml: true
                                        }
                                    ]
                                }
                            ]
                        },
                        //bubble doSettings and doManageFeeds events to parent.
                        {kind: "preware.PackagesMenu", name: "packagesMenu", onSelected: "packagesMenuSelected"}
                    ]
                },
                {kind: "onyx.Toolbar"}
            ]
        },

        //Types
        {
            name: "TypePanels",
            kind: "Panels",
            arrangerKind: "CardArranger",
            draggable: false,
            style: "width: 33.3%;",
            showing: false,
            components: [
                {kind: "EmptyPanel"},
                {
                    kind: "FittableRows",
                    components: [
                        {kind: "onyx.Toolbar", components: [
                            {style: "display: inline-block; position: absolute;", content: "Types"}
                        ]},
                        {
                            kind: "Scroller",
                            horizontal: "hidden",
                            classes: "enyo-fill",
                            style: "background-image:url('assets/bg.png')",
                            touch: true,
                            fit: true,
                            components: [
                                {name: "TypeRepeater", kind: "Repeater", onSetupItem: "setupTypeItem", count: 0, components: [
                                    {kind: "ListItem", title: "[type]", ontap: "typeTapped"}
                                ]}
                            ]
                        },
                        {kind: "GrabberToolbar"}
                    ]
                }
            ]
        },

        //Categories
        {
            name: "CategoryPanels",
            kind: "Panels",
            arrangerKind: "CardArranger",
            draggable: false,
            style: "width: 33.3%;",
            showing: false,
            components: [
                {kind: "EmptyPanel"},
                {kind: "FittableRows",
                    components: [
                        {kind: "onyx.Toolbar", components: [
                            {style: "display: inline-block; position: absolute;", content: "Categories"}
                        ]},
                        {kind: "Scroller",
                            horizontal: "hidden",
                            classes: "enyo-fill",
                            style: "background-image:url('assets/bg.png')",
                            touch: true,
                            fit: true,
                            components: [
                                {name: "CategoryRepeater", kind: "Repeater", onSetupItem: "setupCategoryItem", count: 0, components: [
                                    {kind: "ListItem", title: "[category]", ontap: "categoryTapped"}
                                ]}
                            ]},
                        {kind: "GrabberToolbar"}
                    ]}
            ]
        },

        //Packages
        {
            name: "PackagePanels",
            kind: "Panels",
            arrangerKind: "CardArranger",
            draggable: false,
            style: "width: 33.3%;",
            components: [
                {kind: "EmptyPanel"},
                {
                    kind: "FittableRows",
                    components: [
                        {kind: "onyx.Toolbar", components: [
                            {style: "display: inline-block; position: absolute;", content: "Packages"}
                        ]},
                        {
                            kind: "Scroller",
                            horizontal: "hidden",
                            classes: "enyo-fill",
                            style: "background-image:url('assets/bg.png')",
                            touch: true,
                            fit: true,
                            components: [
                                {name: "PackageRepeater", kind: "Repeater", onSetupItem: "setupPackageItem", count: 0, components: [
                                    {kind: "ListItem", title: "[package]", icon: true, ontap: "packageTapped"}
                                ]}
                            ]
                        },
                        {kind: "GrabberToolbar"}
                    ]
                }
            ]
        },

        //Package Display
        {
            name: "PackageDisplayPanels",
            kind: "Panels",
            arrangerKind: "CardArranger",
            draggable: false,
            style: "width: 33.3%;",
            components: [
                {kind: "EmptyPanel"},
                {kind: "preware.PackageDisplay", name: "packageDisplay"} //also contains simple message and porgress message for now.
            ]
        }
    ],


    //Handlers
    create: function (inSender, inEvent) {
        this.inherited(arguments);
        setTimeout(this.handleDeviceReady.bind(this), 500);
        this.fired = false;
    },
    handleDeviceReady: function (inSender, inEvent) {
        if (!this.fired) {
            this.fired = true;
            UpdateFeeds.startUpdateFeeds();            

            //This appears to be our first opportunity to evaluate launch parameters, but they must be handled on the owner
            var launchParams = JSON.parse(PalmSystem.launchParams);
            if (launchParams && launchParams.type && launchParams.type.toLowerCase() == "install" && launchParams.file) {
                enyo.warn("Preware was launched with a request to install an app: " + launchParams.file);
                enyo.Signals.send("onLaunchedWithInstallRequest", { params: launchParams.file });
            }
        }
    },
    handleBackGesture: function (inSender, inEvent) {
        var index = this.getIndex();
        if (!this.showingTypeAndCategoriesPanels && index === this.categoryPanelsIndex + 1) { //mind the gap.
            this.setIndex(this.menuPanelsIndex);
        } else {//all panels are showing, that's easy.
            this.setIndex(Math.max(index - 1, 0));
        }
        inEvent.preventDefault();
    },
    doReloadList: function () {
        this.$.spinner.show();
        UpdateFeeds.startUpdateFeeds(true);
        this.$.ScrollerPanel.setIndex(0);
    },
    reflow: function (inSender) {
        this.inherited(arguments);
        if (enyo.Panels.isScreenNarrow()) {
            this.setArrangerKind("CoreNaviArranger");
            this.setDraggable(false);
            this.$.CategoryPanels.addStyles("box-shadow: 0");
            this.$.PackagePanels.addStyles("box-shadow: 0");
            this.$.PackageDisplayPanels.addStyles("box-shadow: 0");
        } else {
            //FIXME bbito hack for qemux86/Tenderloin landscape compatibility
            //this.setArrangerKind("CollapsingArranger");
            this.setArrangerKind("CoreNaviArranger");
            this.setDraggable(true);
            this.$.TypePanels.addStyles("box-shadow: -4px 0px 4px rgba(0,0,0,0.3)");
            this.$.CategoryPanels.addStyles("box-shadow: -4px 0px 4px rgba(0,0,0,0.3)");
            this.$.PackagePanels.addStyles("box-shadow: -4px 0px 4px rgba(0,0,0,0.3)");
            this.$.PackageDisplayPanels.addStyles("box-shadow: -4px 0px 4px rgba(0,0,0,0.3)");
        }
    },
    //react to package selection in packagesMenu.
    packagesMenuSelected: function (inSender, inEvent) {
        this.showTypeAndCategoriesPanels(inEvent.showTypeAndCategoriesPanels);

        if (inEvent.typesLength >= 0) {
            this.$.TypeRepeater.setCount(0);
            this.$.CategoryRepeater.setCount(0);
            this.$.PackageRepeater.setCount(0);
            this.$.TypeRepeater.setCount(inEvent.typesLength);
            this.$.TypePanels.setIndex(1);
            this.$.CategoryPanels.setIndex(0);
            this.$.PackagePanels.setIndex(0);
            this.setIndex(this.typePanelsIndex);
        }

        if (inEvent.categoriesLength >= 0) {
            this.$.PackageRepeater.setCount(0);
            this.$.CategoryRepeater.setCount(0);
            this.$.CategoryRepeater.setCount(inEvent.categoriesLength);
            this.$.CategoryPanels.setIndex(1);
            this.$.PackagePanels.setIndex(0);
            this.setIndex(this.categoryPanelsIndex);
        }

        if (inEvent.packagesLength >= 0) {
            this.$.PackageRepeater.setCount(0);
            this.$.PackageRepeater.setCount(inEvent.packagesLength);
            this.$.PackagePanels.setIndex(1);
            this.setIndex(this.packagePanelsIndex);
        }
    },

    //Action Functions
    log: function (text) {
        //this.inherited(arguments);
        console.log.apply(console, arguments);
        this.$.SpinnerText.setContent(text);
    },
    showTypeAndCategoriesPanels: function (show) {
        this.showingTypeAndCategoriesPanels = show;
        this.$.TypePanels.setShowing(show);
        this.$.CategoryPanels.setShowing(show);
        this.render();
    },
    typeTapped: function (inSender, inEvent) {
        this.currentType = this.$.packagesMenu.availableTypes[inEvent.index].type;
        this.$.packagesMenu.filterCategories(this.currentType);
    },
    categoryTapped: function (inSender, inEvent) {
        this.$.packagesMenu.filterByCategoryAndType(this.$.packagesMenu.availableCategories[inEvent.index].category, this.currentType);
    },
    packageTapped: function (inSender, inEvent) {
        this.$.packageDisplay.setCurrentPackage(this.$.packagesMenu.getPackage(inEvent.index));

        this.$.PackageDisplayPanels.setIndex(1);
        this.setIndex(this.packageDisplayPanelsIndex);
    },
    processStatusUpdate: function (inSender, inEvent) {
        this.log(inEvent.message);
        this.$.SpinnerText.setContent(inEvent.message);
        this.$.spinner.setShowing(!inEvent.error);
    },
    doneLoading: function (inSender, inEvent) {
        this.log("Done loading, num Packages: " + preware.PackagesModel.packages.length);
        this.$.packagesMenu.set("listOfEverything", preware.PackagesModel.packages);
        // so if we're inactive we know to push a scene when we return
        //this.isLoading = false;

        // show that we're done (while the pushed scene is going)
        this.processStatusUpdate(this, {message: $L("<strong>Done!</strong>")});
        //this.hideProgress();

        // we're done loading so let the device sleep if it needs to
        // TODO: convert stayAwake.js to enyo, implement stayAwake.start() etc
        //this.stayAwake.end();

        //alert(packages.packages.length);

        if ((!this.isActive || !this.isVisible)) {
            // if we're not the active scene, let them know via banner:
            if (this.onlyLoad) {
                //TODO: show banner notification.
                console.log("Preware: Done Loading Feeds.");
                //navigator.notification.showBanner($L("Preware: Done Loading Feeds"), {source: 'updateNotification'}, 'miniicon.png');
            } else {
                console.log("Preware: Done Updating Feeds.");
                //TODO: show banner notification.
                //navigator.notification.showBanner($L("Preware: Done Updating Feeds"), {source: 'updateNotification'}, 'miniicon.png');
            }
        }

        // show the menu
        var storedThis = this;
        setTimeout(function () {
            storedThis.$.ScrollerPanel.setIndex(1);
        }, 500);
    },
    setupTypeItem: function (inSender, inEvent) {
    	// TODO: refactor the TypeRepeater into its own kind
    	var typeRecord = this.$.packagesMenu.availableTypes[inEvent.index];
        inEvent.item.$.listItem.set("title", typeRecord.type);
        inEvent.item.$.listItem.set("count", typeRecord.count);
        return true;
    },
    setupCategoryItem: function (inSender, inEvent) {
    	// TODO: refactor the CategoryRepeater into its own kind
        var categoryRecord = this.$.packagesMenu.availableCategories[inEvent.index];
        inEvent.item.$.listItem.set("title", categoryRecord.category);
        inEvent.item.$.listItem.set("count", categoryRecord.count);
        return true;
    },
    setupPackageItem: function (inSender, inEvent) {
        var pkg = this.$.packagesMenu.getPackage(inEvent.index);
        if (pkg && pkg.title) {
            inEvent.item.$.listItem.$.ItemTitle.setContent(pkg.title);
            inEvent.item.$.listItem.$.ItemIcon.setSrc(pkg.icon);
        }
        return true;
    }
});
