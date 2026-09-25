
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
        onmousedown: "pressed",
        ondragstart: "released",
        onmouseup: "released"
    },
    components:[
        {name: "ItemIcon", kind: "Image", style: "display: none; height: 100%; margin-right: 8px;", onerror: "iconError"},
        {name: "ItemTitle", style: "display: inline-block; position: absolute; margin-top: 6px;"},
        {name: "itemCount", showing: false, classes: "item-count"}
    ],
    create:    function() {
        this.inherited(arguments);
        this.$.ItemTitle.setContent(this.title);
    },
    rendered: function() {
        if(this.icon) {
            this.$.ItemIcon.addStyles("display: inline-block;");
        }
    },
    //many feed icons are hosted on sites that are gone, show a generic icon instead.
    iconError: function(inSender) {
        if (inSender.src !== ListItem.fallbackIcon) {
            inSender.setSrc(ListItem.fallbackIcon);
        }
        return true;
    },
    statics: {
        fallbackIcon: "assets/file.png"
    },
    pressed: function() {
        this.addClass("onyx-selected");
    },
    released: function() {
        this.removeClass("onyx-selected");
    }
});
