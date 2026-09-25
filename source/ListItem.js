
enyo.kind({
    name: "ListItem",
    classes: "list-item",
    ontap: "menuItemTapped",
    published: {
        title: "[list item]",
        icon: false,
        count: -1
    },
    bindings: [
        {from: ".title", to: ".$.ItemTitle.content"},
        {from: ".count", to: ".$.itemCount.content", transform: function (val) {
        	if (val >= 0) {
        		this.$.itemCount.show(); 
        	}
        	return val;
        }}
    ],
    handlers: {
        ondown: "pressed",
        ondragstart: "released",
        onup: "released",
        onleave: "released"
    },
    components:[
        {name: "ItemIcon", kind: "Image", style: "display: none; height: 100%; margin-right: 8px;", onerror: "iconError"},
        {name: "ItemTitle", classes: "list-item-title", style: "display: inline-block; position: absolute; margin-top: 6px;"},
        {name: "itemCount", showing: false, classes: "item-count"}
    ],
    create:    function() {
        this.inherited(arguments);
        this.$.ItemTitle.setContent(this.title);
    },
    //show the package icon, or no icon at all if there is none.
    setIcon: function(src) {
        this.$.ItemIcon.setSrc(src || "");
        this.showIcon(!!src);
    },
    showIcon: function(show) {
        this.$.ItemIcon.applyStyle("display", show ? "inline-block" : "none");
        this.addRemoveClass("list-item-has-icon", show);
    },
    //many feed icons are hosted on sites that are gone.
    iconError: function(inSender) {
        this.showIcon(false);
        return true;
    },
    pressed: function() {
        this.addClass("onyx-selected");
    },
    released: function() {
        this.removeClass("onyx-selected");
    }
});
