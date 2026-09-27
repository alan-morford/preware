/*jslint sloppy: true */
/*global enyo, onyx, preware, $L */
//The maintenance actions from the original Preware's app menu ("Luna Manager").
//Restart Java is hidden on LuneOS: there is no Java runtime there to restart.
enyo.kind({
    name: "LunaManagerDialog",
    classes: "enyo-popup",
    style: "padding: 15px; width: 90%; max-width: 480px;",
    kind: "onyx.Popup",
    centered: true,
    modal: true,
    floating: true,
    autoDismiss: false,
    scrim: true,
    scrimWhenModal: false,
    components: [
        {kind: "enyo.Scroller", touch: true, style: "width: 100%;", components: [
            {tag: "div", classes: "webosstyle-groupbox", components: [
                {tag: "div", classes: "webosstyle-groupbox-header", content: $L("Luna Manager")},
                {tag: "div", classes: "webosstyle-groupbox-body", style: "width: 100%;", components: [
                    //button on the left, its description on the right (table layout:
                    //the legacy WebKit has no flexbox).
                    {classes: "luna-manager-row", components: [
                        {classes: "luna-manager-button-cell", components: [
                            {name: "RescanButton", kind: "onyx.Button", content: $L("Rescan"), ontap: "doRescan"}
                        ]},
                        {classes: "luna-manager-text", content: $L("Rescans installed applications so newly installed ones show up in the launcher.")}
                    ]},
                    {classes: "luna-manager-row", components: [
                        {classes: "luna-manager-button-cell", components: [
                            {name: "RestartLunaButton", kind: "onyx.Button", content: $L("Restart Luna"), ontap: "doRestartLuna"}
                        ]},
                        {classes: "luna-manager-text", content: $L("This closes all the applications you have open while it restarts.")}
                    ]},
                    {name: "RestartJavaRow", classes: "luna-manager-row", components: [
                        {classes: "luna-manager-button-cell", components: [
                            {name: "RestartJavaButton", kind: "onyx.Button", content: $L("Restart Java"), ontap: "doRestartJava"}
                        ]},
                        {classes: "luna-manager-text", content: $L("This will cause your device to lose network connections and be slow until it's done restarting.")}
                    ]}
                ]}
            ]}
        ]},
        {tag: "div", style: "width: 100%; text-align: center", components: [
            {kind: "onyx.Button", classes: "onyx-affirmative", style: "margin:5px; width: 18%; min-width: 100px; font-size: 18px;", content: $L("Close"), ontap: "closePopup"}
        ]}
    ],
    create: function () {
        this.inherited(arguments);
        if (!preware.Platform.isLegacy) {
            //removed rather than hidden, so the row above it gets the rounded bottom corners.
            this.$.RestartJavaRow.destroy();
        }
    },
    showingChanged: function () {
        this.inherited(arguments);
        if (this.showing) {
            this.sizeButtons();
        }
    },
    //all buttons as wide as the widest one (measured: the text size differs
    //between devices and languages).
    sizeButtons: function () {
        var buttons = [this.$.RescanButton, this.$.RestartLunaButton, this.$.RestartJavaButton].filter(Boolean),
            widest = 0, i, node;
        if (this.buttonsSized) {
            return;
        }
        for (i = 0; i < buttons.length; i += 1) {
            node = buttons[i].hasNode();
            if (node && node.offsetWidth) {
                //offsetWidth is rounded: on high-density screens (the KEY2) the text
                //is a fraction wider, and a rounded-down width clips the label.
                //scrollWidth (+ the 1px borders) still counts text already clipped.
                widest = Math.max(widest, Math.ceil(node.getBoundingClientRect().width) + 1,
                    node.scrollWidth + 3);
            }
        }
        if (!widest) {
            return; //not laid out yet, try again next time the dialog shows
        }
        for (i = 0; i < buttons.length; i += 1) {
            buttons[i].applyStyle("-webkit-box-sizing", "border-box");
            buttons[i].applyStyle("box-sizing", "border-box");
            buttons[i].applyStyle("width", widest + "px");
            buttons[i].applyStyle("min-width", widest + "px"); //the table must not squeeze it
        }
        this.buttonsSized = true;
    },
    closePopup: function () {
        this.hide();
    },
    doRescan: function () {
        preware.IPKGService.rescan(this.actionDone.bind(this, $L("Rescan complete")));
    },
    doRestartLuna: function () {
        preware.IPKGService.restartLuna(this.actionDone.bind(this, $L("Luna is restarting")));
    },
    doRestartJava: function () {
        preware.IPKGService.restartJava(this.actionDone.bind(this, $L("Java is restarting")));
    },
    actionDone: function (message, payload) {
        if (!payload || payload.returnValue === false) {
            enyo.Signals.send("onBackendSimpleMessage", {
                message: $L("Error: ") + ((payload && payload.errorText) || $L("Communication Error"))
            });
            return;
        }
        enyo.Signals.send("onBackendSimpleMessage", {message: message});
    }
});
