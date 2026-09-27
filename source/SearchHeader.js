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
            {name: "SearchInput", kind: "onyx.Input", placeholder: $L("Search"), onkeydown: "inputKeyDown"},
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
    //with Enter (physical or virtual keyboard). Back leaves the search.
    inputKeyDown: function (inSender, inEvent) {
        if (inEvent.keyCode === 13 && !this.disabled) {
            //the field keeps the focus: the user may go on typing to change the search.
            this.doSearch({value: this.$.SearchInput.getValue()});
            return true;
        }
    },
    //type-to-search: a key pressed on a physical keyboard while nothing else takes
    //text is added to the end of the search text. Returns false when searching is off.
    startTyping: function (text) {
        var node, value;
        if (this.disabled) {
            return false;
        }
        value = (this.$.SearchInput.getValue() || "") + text;
        this.$.SearchInput.setValue(value);
        this.$.SearchInput.focus();
        node = this.$.SearchInput.hasNode();
        if (node && node.setSelectionRange) {
            node.setSelectionRange(value.length, value.length); //type on after it
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
