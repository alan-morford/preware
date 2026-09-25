enyo.kind({
    name: "GrabberToolbar",
    kind: "onyx.Toolbar",
    components:[
        {kind: "onyx.Grabber"},
        {name: "backButton", kind: "onyx.Button", content: $L("Back"), showing: false, ontap: "backTapped"}
    ],
    reflow: function() {
        var narrow = enyo.Panels.isScreenNarrow(),
            back = narrow && preware.Platform.needsBackButton();
        this.children[0].applyStyle('visibility', narrow ? 'hidden' : 'visible');
        this.children[0].setShowing(!back);
        this.$.backButton.setShowing(back);
    },
    //behave like the back gesture on devices without one.
    backTapped: function() {
        enyo.Signals.send("onbackbutton", {preventDefault: function () {}, stopPropagation: function () {}});
        return true;
    }
});
