/*global enyo, preware */
/*jslint sloppy: true */

//TODO: extract the package filtering logic into a "PackageFilter" singleton.
// => best would be to use bindings to fill the repeaters
// => connect this to the cookie-pref about installed <=> available apps, too.

enyo.kind({
    name: "preware.PackagesMenu",
    kind: "Scroller",
    horizontal: "hidden",
    classes: "enyo-fill",
    style: "background-image:url('assets/bg.png')",
    touch: true,
    fit: true,
    events: {
        onSelected: ""
    },

    packageFilters: {//filter for all = 0, available (i.e. not installed) = 1, only installed = 2, only updatable = 3
        all: 0,
        available: 1,
        installed: 2,
        updatable: 3
    },
    currentPackageFilter: -1,
    //set only while showing the type+category filtered list under "Available Packages".
    currentFilterType: null,
    currentFilterCategory: null,

    //public components
    published: {
        availablePackages: [],
        availableTypes: [],
        availableCategories: [],
        listOfEverything: []
    },

    handlers: {
        ontap: "itemTapped"
    },
    components: [
        {name: "updatesItem", kind: "ListItem", classes: "preware-menu-first", title: $L("Package Updates"), ontap: "showUpdatablePackages" },
        {name: "availableItem", kind: "ListItem", title: $L("Available Packages"), ontap: "showAvailableTypeList" },
        {name: "installedItem", kind: "ListItem", title: $L("Installed Packages"), ontap: "showInstalledPackages" },
        {name: "listOfEverythingItem", kind: "ListItem", title: $L("List of Everything"), ontap: "showListOfEverything" }
    ],
    
    listOfEverythingChanged: function (oldList, newList) {
    	// TODO: refactor from item tap handlers to here
    	this.$.listOfEverythingItem.set("count", newList.length);
    	
    	this.$.installedItem.set("count", newList.reduce(function (accumulatedValue, pkg) {
    		return accumulatedValue + (pkg.isInstalled ? 1 : 0);
    	}, 0));
    	
    	if (preware.PrefCookie.get().listInstalled) { //include installed packages.
    		this.$.availableItem.set("count", newList.length);
    	} else {
    		this.$.availableItem.set("count", newList.length - this.$.installedItem.get("count"));    		
    	}
    	
    	this.$.updatesItem.set("count", newList.reduce(function (accumulatedValue, pkg) {
    		return accumulatedValue + (pkg.hasUpdate ? 1 : 0);
    	}, 0));
    },

    //handlers:
    //keep the item whose list is open highlighted.
    itemTapped: function (inSender, inEvent) {
        var c = inEvent.originator;
        while (c && c.owner !== this) {
            c = c.owner;
        }
        if (c && c.kindName === "ListItem") {
            this.setSelectedItem(c);
        }
    },
    setSelectedItem: function (item) {
        var names = ["updatesItem", "availableItem", "installedItem", "listOfEverythingItem"], i;
        for (i = 0; i < names.length; i += 1) {
            this.$[names[i]].addRemoveClass("list-item-active", this.$[names[i]] === item);
        }
    },
    clearSelection: function () {
        this.setSelectedItem(null);
    },
    showUpdatablePackages: function () {
        this.currentPackageFilter = this.packageFilters.updatable;
        this.currentFilterType = null;
        this.currentFilterCategory = null;
        this.recomputePackageList();

        this.doSelected({name: "updatable", packagesLength: this.availablePackages.length});
    },
    showAvailableTypeList: function () {
        this.currentPackageFilter = this.packageFilters.available;
        this.currentFilterType = null;
        this.currentFilterCategory = null;
        this.availableTypes = [];

        var i, pkg, availableTypesHash = {}, type;
        for (i = 0; i < preware.PackagesModel.packages.length; i += 1) {
            pkg = preware.PackagesModel.packages[i];
            if (this.checkPackageStatus(pkg)) {
            	if (availableTypesHash[pkg.type]) {   // already a pkg of this type
            		availableTypesHash[pkg.type].count++;
            	} else {
            		availableTypesHash[pkg.type] = {type: pkg.type, count: 1};
            	}
            }
        }
        for (type in availableTypesHash) {
        	this.availableTypes.push(availableTypesHash[type]);
        }
        this.availableTypes.sort(function (a,b) { return a.type.localeCompare(b.type);});

        this.doSelected({name: "available", showTypeAndCategoriesPanels: true, typesLength: this.availableTypes.length});
    },
    showInstalledPackages: function () {
        this.currentPackageFilter = this.packageFilters.installed;
        this.currentFilterType = null;
        this.currentFilterCategory = null;
        this.recomputePackageList();

        this.doSelected({name: "installed", packagesLength: this.availablePackages.length});
    },
    showListOfEverything: function () {
        this.currentPackageFilter = this.packageFilters.all;
        this.currentFilterType = null;
        this.currentFilterCategory = null;
        this.recomputePackageList();

        this.doSelected({name: "all", packagesLength: this.availablePackages.length});
    },


    //public function:
    filterByCategoryAndType: function (category, type) {
        this.currentFilterType = type;
        this.currentFilterCategory = category;
        this.recomputePackageList();

        this.doSelected({name: "filtered", showTypeAndCategoriesPanels: true, packagesLength: this.availablePackages.length});
    },
    filterCategories: function (type) {
        this.currentFilterType = type;
        this.currentFilterCategory = null;
        this.availableCategories = [];

        var i, pkg, availableCategoriesHash = {}, category;
        for (i = 0; i < preware.PackagesModel.packages.length; i += 1) {
            pkg = preware.PackagesModel.packages[i];
            if (this.checkPackageStatus(pkg) && pkg.type === type) {
            	if (availableCategoriesHash[pkg.category]) {   // already a package in this category
            		availableCategoriesHash[pkg.category].count++;
            	} else {
            		availableCategoriesHash[pkg.category] = {category: pkg.category, count: 1};
            	}
            }
        }
        for (category in availableCategoriesHash) {   // xform hash to array
        	this.availableCategories.push(availableCategoriesHash[category]);
        }
        this.availableCategories.sort(function (a,b) { return a.category.localeCompare(b.category);});

        this.doSelected({name: "filtered", showTypeAndCategoriesPanels: true, categoriesLength: this.availableCategories.length});
    },
    checkPackageStatus: function (pkg) {
        if (!pkg) {
            return false;
        }
        if (this.currentPackageFilter === this.packageFilters.updatable) {
            return pkg.hasUpdate;
        }
        if (this.currentPackageFilter === this.packageFilters.installed) {
            return pkg.isInstalled;
        }

        if (this.currentPackageFilter === this.packageFilters.available) {
            if (preware.PrefCookie.get().listInstalled) { //include installed packages.
                return true;
            } else {
                return !pkg.isInstalled; //return only not installed packages.
            }
        }

        return true; //everything is fine.
    },
    //rebuilds availablePackages from the current filter (and, under "Available
    //Packages", the drilled-down type/category) without navigating anywhere.
    //Shared by the show*/filter* methods above and by refreshLists below, so a
    //package install/remove can bring an already-open list back in sync.
    recomputePackageList: function () {
        var i, pkg;
        this.availablePackages = [];
        for (i = 0; i < preware.PackagesModel.packages.length; i += 1) {
            pkg = preware.PackagesModel.packages[i];
            if (!this.checkPackageStatus(pkg)) {
                continue;
            }
            if (this.currentFilterType !== null && pkg.type !== this.currentFilterType) {
                continue;
            }
            if (this.currentFilterCategory !== null && pkg.category !== this.currentFilterCategory) {
                continue;
            }
            if (this.availablePackages.indexOf(pkg) === -1) {
                this.availablePackages.push(pkg);
            }
        }
        this.sortPackageList();
        return this.availablePackages.length;
    },
    //true while availablePackages holds a package list (rather than the Types or
    //Categories drill-down, which don't show packages directly).
    isShowingPackageList: function () {
        return this.currentPackageFilter !== this.packageFilters.available ||
            (this.currentFilterType !== null && this.currentFilterCategory !== null);
    },
    //called after a package install/update/remove completes: the menu item counts
    //are always stale (they're only set from a full listOfEverything reload), and
    //the currently open package list, if any, was filtered at the time it opened.
    //Returns the refreshed length of the currently shown package list, or -1 if
    //none is currently shown.
    refreshLists: function () {
        this.listOfEverythingChanged(null, preware.PackagesModel.packages);
        if (this.currentPackageFilter === -1 || !this.isShowingPackageList()) {
            return -1;
        }
        return this.recomputePackageList();
    },
    getPackage: function (index) {
        if (index >= 0) {
            return this.availablePackages[index];
        } else {
            return undefined;
        }
    },


    //auxillary package handling stuff:
    //sorts the package list by the "Sort Order" preference ("Category Default"
    //is by title). The comparison has to be consistent, or Array.sort mixes the
    //list up (a comparison that said "first" for every undated package reversed it).
    sortPackageList: function () {
        var sort = preware.PrefCookie.get().listSort,
            //some feeds have titles starting with a space (modernize)
            title = function (p) {
                return String(p.title || p.pkg || "").replace(/^\s+/, "").toLowerCase();
            },
            byTitle = function (a, b) {
                var x = title(a), y = title(b);
                return x < y ? -1 : (x > y ? 1 : 0);
            },
            number = function (v) {
                var n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
                return isNaN(n) ? undefined : n;
            },
            compare = byTitle;

        if (sort === "date") { //newest first, undated ones last
            compare = function (a, b) {
                var x = number(a.date) || undefined, y = number(b.date) || undefined; //0: unknown
                if (x !== y) {
                    if (x === undefined) {
                        return 1;
                    }
                    if (y === undefined) {
                        return -1;
                    }
                    return y - x;
                }
                return byTitle(a, b);
            };
        }
        this.availablePackages.sort(compare);
    }
});
