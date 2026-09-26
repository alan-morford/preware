/*jslint sloppy: true */
/*global enyo, $L */

// App header with a fixed-size search field.
// (Replaces webos-lib's PortsSearch, whose animated field changed size depending on
// timing and collapsed again when it lost focus.)
enyo.kind({
    name: "preware.SearchHeader",
    kind: "onyx.Toolbar",
    classes: "ports-header preware-search-header",
    published: {
        title: "",
        //no searching while the package list is loading
        disabled: false
    },
    taglines: [],
    events: {
        onSearch: ""
    },
    components: [
        {name: "Icon", kind: "Image", src: "icon.png", classes: "preware-search-header-icon"},
        {name: "TextDiv", classes: "preware-search-header-text", components: [
            {name: "Title", classes: "preware-search-header-title"},
            {name: "Tagline", classes: "preware-search-header-tagline"}
        ]},
        {name: "SearchDecorator", kind: "onyx.InputDecorator", classes: "preware-search-box", components: [
            {name: "SearchInput", kind: "onyx.Input", placeholder: $L("Search"), oninput: "inputChanged", onkeydown: "inputKeyDown"},
            {kind: "Image", src: "assets/search-input-search.png", classes: "preware-search-icon", ontap: "focusSearch"}
        ]}
    ],
    create: function () {
        this.inherited(arguments);
        this.$.Title.setContent(this.title);
        this.$.Tagline.setContent(this.taglines[Math.floor(Math.random() * this.taglines.length)] || "");
        this.disabledChanged();
    },
    disabledChanged: function () {
        this.$.SearchInput.setDisabled(this.disabled);
        this.$.SearchDecorator.addRemoveClass("preware-search-box-disabled", this.disabled);
        if (this.disabled && this.$.SearchInput.hasNode()) {
            this.$.SearchInput.node.blur();
        }
    },
    focusSearch: function () {
        if (!this.disabled) {
            this.$.SearchInput.focus();
        }
        return true;
    },
    //Searching as the user types is too slow on the older devices: the search starts
    //with Enter (physical or virtual keyboard). Emptying the field ends the search
    //right away, that costs nothing.
    inputChanged: function () {
        if (!this.disabled && !this.$.SearchInput.getValue()) {
            this.doSearch({value: ""});
        }
        return true;
    },
    inputKeyDown: function (inSender, inEvent) {
        if (inEvent.keyCode === 13 && !this.disabled) {
            this.doSearch({value: this.$.SearchInput.getValue()});
            this.blur(); //hide the virtual keyboard, the results show below
            return true;
        }
    },
    //type-to-search: a key pressed on a physical keyboard while nothing else takes
    //text starts a new search text in the field. Returns false when searching is off.
    startTyping: function (text) {
        var node;
        if (this.disabled) {
            return false;
        }
        this.$.SearchInput.setValue(text);
        this.$.SearchInput.focus();
        node = this.$.SearchInput.hasNode();
        if (node && node.setSelectionRange) {
            node.setSelectionRange(text.length, text.length); //type on after it
        }
        return true;
    },
    clear: function () {
        this.$.SearchInput.setValue("");
    },
    //hide the keyboard
    blur: function () {
        if (this.$.SearchInput.hasNode()) {
            this.$.SearchInput.node.blur();
        }
    }
});
