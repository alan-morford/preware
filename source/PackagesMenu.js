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
        var i, pkg;
        this.currentPackageFilter = this.packageFilters.updatable;
        this.availablePackages = [];

        for (i = 0; i < preware.PackagesModel.packages.length; i += 1) {
            pkg = preware.PackagesModel.packages[i];
            if (this.checkPackageStatus(pkg)) {
                if (this.availablePackages.indexOf(pkg) === -1) {
                    this.availablePackages.push(pkg);
                }
            }
        }
        this.sortPackageList();

        this.doSelected({name: "updatable", packagesLength: this.availablePackages.length});
    },
    showAvailableTypeList: function () {
        this.currentPackageFilter = this.packageFilters.available;
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
        var i, pkg;
        this.currentPackageFilter = this.packageFilters.installed;
        this.availablePackages = [];

        for (i = 0; i < preware.PackagesModel.packages.length; i += 1) {
            pkg = preware.PackagesModel.packages[i];
            if (this.checkPackageStatus(pkg)) {
                if (this.availablePackages.indexOf(pkg) === -1) {
                    this.availablePackages.push(pkg);
                }
            }
        }
        this.sortPackageList();

        this.doSelected({name: "installed", packagesLength: this.availablePackages.length});
    },
    showListOfEverything: function () {
        var i, pkg;
        this.currentPackageFilter = this.packageFilters.all;
        this.availablePackages = [];

        for (i = 0; i < preware.PackagesModel.packages.length; i += 1) {
            pkg = preware.PackagesModel.packages[i];
            if (this.availablePackages.indexOf(pkg) === -1) {
                this.availablePackages.push(pkg);
            }
        }
        this.sortPackageList("date");

        this.doSelected({name: "all", packagesLength: this.availablePackages.length});
    },


    //public function:
    filterByCategoryAndType: function (category, type) {
        var i, pkg;
        this.availablePackages = [];

        for (i = 0; i < preware.PackagesModel.packages.length; i += 1) {
            pkg = preware.PackagesModel.packages[i];

            //first apply package filter:
            if (this.checkPackageStatus(pkg)) {
                //then apply category & type filter
                if (pkg.type === type && pkg.category === category) {
                    if (this.availablePackages.indexOf(pkg) === -1) {
                        this.availablePackages.push(pkg);
                    }
                }
            }
        }
        this.sortPackageList();

        this.doSelected({name: "filtered", showTypeAndCategoriesPanels: true, packagesLength: this.availablePackages.length});
    },
    filterCategories: function (type) {
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
    getPackage: function (index) {
        if (index >= 0) {
            return this.availablePackages[index];
        } else {
            return undefined;
        }
    },


    //auxillary package handling stuff:
    sortPackageList: function (field) {
        if (!field) {
            field = "title";
        }
        this.availablePackages.sort(function (a, b) {
            var strA, strB;
            if (a[field] && b[field]) {
                if (typeof a[field] === 'string') {
                    strA = a[field].toLowerCase();
                    strB = b[field].toLowerCase();
                } else {
                    strA = a[field];
                    strB = b[field];
                }
                return ((strA < strB) ? -1 : ((strA > strB) ? 1 : 0));
            }
            return -1;
        });
    }
});
