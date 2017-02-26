define(["dojo/_base/declare", "dijit/_WidgetBase", "dijit/_Container",
        "dojo/dom", "dojo/dom-construct", "dojo/dom-style", "dojo/_base/lang", "dojo/on",
        
        "dojo/store/Memory",
         
        "./Notification"],
         
function(declare, _WidgetBase, _Container,
        dom, domConstruct, domStyle, lang, on,
         
        Memory,
        
        Notification){
	
	/**
	 * Contains list of Notifications.
	 * TODO What to do when all children dismissed?
	 */
    return declare([_WidgetBase, _Container], {
    	
    	baseClass:"NotificationList",
    	label:"",
        
    	buildRendering:function(){
    		this.inherited(arguments);
    		console.debug("NotificationList.buildRendering", this);
    		
    		var node = this.domNode;

    		var label = this.label;
    		if(label){
    			domConstruct.create('h2', {innerHTML:label}, node);
    		}
    		
    		this.containerNode = domConstruct.create('div', null, node);
    		
    		this.query.forEach(lang.hitch(this, "_createNotification"));
    	},
    	
    	_createNotification:function(item){
    		item = this.store.get(item.id);
    		var n = new Notification({notification:item});
			this.addChild(n);
    	}

    });
});
