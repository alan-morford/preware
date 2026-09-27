enyo.kind({
	name: "Preware.ChoiceDialog",
	kind: "onyx.Popup",
	modal: false,
	autoDismiss: false,
	floating: true,
	centered: true,
	scrim: true,
	
	style: "padding: 15px; width: 80%; max-width: 300px",
	
	published: {
		title: "",
		body: "",
		okLabel: $L("Ok"),
		cancelLabel: $L("Cancel")
	},
	bindings: [
	    { from: ".title", to: ".$.dialogTitle.content" },
	    { from: ".body", to: ".$.dialogBody.content" },
	    { from: ".okLabel", to: ".$.okButton.content" },
	    { from: ".cancelLabel", to: ".$.cancelButton.content" }
	],
	
	events: {
		onDismiss: "",
		onAction: "",		
	},
	
	components: [
		{name: "dialogTitle", style: "font-weight: bold"},
		{tag: "hr"},
		{name: "dialogBody", allowHtml: true},
		{components: [
			{name: "okButton", kind: "onyx.Button", style: "margin-top: 10px; margin-right: 5%; width: 45%", classes: "onyx-blue", ontap: "chooseYes"},
			{name: "cancelButton", kind: "onyx.Button", style: "margin-top: 10px; margin-left: 5%; width: 45%", ontap: "chooseNo"}
		]}
	],
	
	show: function(data) {
		this.returnData = data;
		
		this.inherited(arguments);
	},
	
	chooseNo: function(){
		this.doDismiss();
	},
	
	chooseYes: function(){
		this.doAction({data: this.returnData});
	}
})