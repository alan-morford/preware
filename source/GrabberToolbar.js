enyo.kind({
    name: "GrabberToolbar",
    kind: "onyx.Toolbar",
    components:[
        {name: "grabberArea", classes: "preware-grabber-area", ontap: "grabberTapped", components: [
            {kind: "onyx.Grabber"}
        ]}
    ],
    reflow: function() {
        //Legacy devices have no back gesture (TouchPad), so the grabber is always there to tap.
        var visible = !enyo.Panels.isScreenNarrow() || preware.Platform.alwaysShowGrabber();
        this.$.grabberArea.applyStyle('visibility', visible ? 'visible' : 'hidden');
    },
    //tapping the grabber goes back to the previous panel, like the back gesture.
    grabberTapped: function() {
        enyo.Signals.send("onbackbutton", {preventDefault: function () {}, stopPropagation: function () {}});
        return true;
    }
});
