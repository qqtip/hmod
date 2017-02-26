define(["dojo/_base/declare", "dijit/_WidgetBase",
        "dojo/dom", "dojo/dom-construct", "dojo/_base/lang", "dojo/on","dojo/dom-class", "dojo/dom-attr",
        "dojo/_base/event", "dojo/keys",
        "dojo/_base/fx",
        "dijit/TooltipDialog", "dijit/popup", "dijit/_HasDropDown","dijit/focus","dijit/_CssStateMixin", "dijit/_Contained",
        
        "../NotificationsController"
        ],

        /*
         * There's "dijit/_Contained", but we don't need the methods.
         */
function(declare, _WidgetBase,
        dom, domConstruct, lang, on, domClass, domAttr,
        event, keys,
        fx,
        TooltipDialog, popup, _HasDropDown, focusUtil, _CssStateMixin, _Contained,
        
        NC
        ){
     
	/*
	 * Mixin Notes
	 * 
	 * CssStateMixin:
	 * There's some redundancy in Notification* and dijit*
	 * Is there a way to disable one?
	 *
	 * HasDropDown:
	 * Dealing with popup manually is a pain since moving mouse from
	 * notification to Tooltip causes it to close/open rapidly.
	 * _HasDropDown helps with this.
	 */
    var Notification = declare([_WidgetBase, _HasDropDown, _CssStateMixin, _Contained], {
    	/*
    	 * TODO Aria stuff? Look at TitlePane for examples.
    	 * 
    	 * TODO Don't open dropDown when activating in dismiss or link.
    	 * So if clicked on a tag, disable dropDown behavior.
    	 */
    	baseClass:"Notification",
    	
    	/**
    	 * Number of milliseconds before notification is considered read
    	 * when hovering or focused.
    	 */
    	timeToRead: 1500,
    	
    	destroyOnDismiss:true,
    	
    	tabIndex:"0",
    	
    	read:false,
    	dismissable:false,
    	dismissed:false,
    	
    	dropDownPosition:["after-centered", "before-centered"],
    	// Want links to work.
    	// FIXME Keyboard not working? Enter doesn't activate link.
		_stopClickEvents: false,
    	
    	postMixInProperties:function(){
    		var n = this.notification;
    		
    		// Just mixin values?
    		/*
    		 * FIXME Date values
    		 * createdDate is string from database and timestamp from workflow.
    		 */
    		
    		// If notification has the dismissDate property, it is dismissable.
    		this.dismissable = 'dismissDate' in n;
    		this.readable = 'readDate' in n;
    		
    		// Don't want setter called until after buildRendering so assign directly
    		// Consider read if not readable
    		this.read = (!this.readable || n.read);
    	},
         
    	/**
    	 * @memberOf Notification
    	 */
    	buildRendering:function(){
    		console.debug("Notification.buildRendering", this);
			this.domNode = this.srcNodeRef || this.ownerDocument.createElement("div");
			
    		// Wrapper Node for tooltip
    		var node = this.domNode;
    		this.focusNode = node;
    		domAttr.set(node, "tabIndex", this.tabIndex);
    		
    		var wrapNode = domConstruct.create('div', null, node);
    		this.wrapNode = wrapNode;
    		
    		/*
    		 * DropDown setup
    		 * TODO Conditional _HasDropDown?
    		 */
    		this._aroundNode = wrapNode;
			
    		this.inherited(arguments);
    		
    		var priority = this.notification.priority;
    		domConstruct.create('span', {title:"Priority is "+priority, 
    			"class":"priority "+priority}, wrapNode);
    		
    		var message = this.notification.message;
    		this.messageNode = domConstruct.create('span', {innerHTML:message, "class":"message"}, wrapNode);
    		
    		var details = this.notification.details;
    		if(details){
    			domClass.add(node, 'hasDetails');
    			domAttr.set(node, 'title', 'Show details');
    		}
    		
    		if(this.dismissable){
    			/*
    			 * TODO Aria tags?
    			 */
    			var a = domConstruct.create('a',{title:"Dismiss notification", "class":"dismiss",
    				innerHTML:"<span class=\"dismiss-icon\"/>", tabIndex:"0"}, wrapNode);
    			this.own(on(a, 'click', lang.hitch(this, '_onDismissClick')),
    					on(a, 'keydown', lang.hitch(this, '_onDismissKey')));
    		}
    		
    		// Update read CSS, not sure why WidgetBase isn't calling
    		this.set('read', this.read);
    		
    		// Hook Events to read Notification
    		if(!this.read){
    			var l = [];
    			l.push(on(node,'mouseover',lang.hitch(this, 'onMouseOver')));
    			l.push(on(node,'mouseout',lang.hitch(this, 'onMouseOut')));
    			
    			this._readEvents = l;
    		}
    		
    		this.on('keydown', lang.hitch(this, '_onKeyDown'));
    	},
    	
    	postCreate:function(){
    		this.inherited(arguments);
    		
    		var item = this.notification;
    		var onWatch = lang.hitch(this, 'onWatch');
    		item.watch('read', onWatch);
    		item.watch('dismissed', onWatch);
    	},
    	
    	onWatch:function(name, oldVal, newVal){
    		console.debug('onWatch', arguments);
    		this.set(name, newVal);
    	},
    	
    	_setReadAttr:function(isRead){
    		console.debug('_setReadAttr', arguments);
    		// Set unread if isRead false
    		domClass.toggle(this.domNode, "unread", !isRead);
    		if(isRead){
    			if('_readEvents' in this){
    				// Disable read events hooks
    				for ( var i = 0; i < this._readEvents.length; i++) {
    					this._readEvents[i].remove();
    				}
    				delete this._readEvents;
    			}
    			
    			this._cancelReadTimeout();
    		}
    		this._set("read", isRead);
    	},
    	
    	isLoaded: function(){
    		return 'dropDown' in this && this.dropDown != null;
    	},

    	loadDropDown: function(/*Function*/ callback){
    		console.debug('Notification.loadDropDown');
    		if(this.isLoaded()){
    			callback();
    			return;
    		}
    		
    		var details = this.notification.details;
    		if(!details){
    			return;
    		}
    		this.dropDown = new TooltipDialog({content:details, baseClass:"dijitTooltipDialog NotificationDetails"});
    		console.debug('focus fun', this.dropDown.focus);
    		
    		callback();
    	},
    	
    	// TODO Research focusing
    	focus:function(){
    		console.debug('focus', this);
    		focusUtil.focus(this.focusNode);
    	},
    	
    	/**
    	 * Dismiss this Notification
    	 */
    	dismiss:function(){
    		console.info('Notification.dismiss');
    		if(!this.dismissable || this.dissmissed){
    			console.warn("Notification is not Dismissable!");
    			return;
    		}
    		
    		if(this.focused){
    			var sibling = this.getNextSibling() || this.getPreviousSibling();
    			if(sibling){
    				sibling.focus();
    			}
    		}
    		
    		NC.dismiss(this.notification);
    	},
    	
    	_onDismissClick:function(e){
    		event.stop(e); // Prevent read
    		this.dismiss();
    		
    		// These aren't working? DropDown seems to open first
//    		evt.preventDefault();
    		
    		/*
    		 * DropDown starts opening before dismiss event.
    		 * Need to override _HasDropDown methods to get around this.
    		 */
    	},
    	
    	_onDismissKey:function(e){
    		console.debug('dismiss key', e);
    		if(e.keyCode == keys.ENTER || e.keyCode == keys.SPACE){
    			event.stop(e);
    			this.dismiss();
    		}
    	},
    	
    	_setDismissedAttr:function(dismissed){
    		var self = this;
    		if(this.destroyOnDismiss){
    			this.closeDropDown();
    			fx.fadeOut({node:this.domNode,
    				onEnd:function(){
    					console.debug("Destroying", self);
    					self.destroy();
    				}}).play();	
    		}
    		else{
    			this._set('dismissed', dismissed);
    		}
    	},
    	
    	
    	onMouseOver:function(){
    		this._readTimeout = setTimeout(lang.hitch(this,'markRead'), this.timeToRead);
    	},
    	
    	/**
    	 * Read notification if mouse was within for 1 second or more.
    	 */
    	onMouseOut:function(){
    		this._cancelReadTimeout();
    	},
    	
    	_onKeyDown:function(e){
    		console.debug('_onKeyDown', e);
    		if(e.keyCode == keys.DOWN_ARROW){
    			var next = this.getNextSibling();
    			if(next){
    				next.focus();	
    			}
    		}
    		else if(e.keyCode == keys.UP_ARROW){
    			var prev = this.getPreviousSibling();
    			if(prev){
    				prev.focus();	
    			}
    		}
    	},
    	
    	/**
    	 * Cancel and delete the read timeout if it exists.
    	 */
    	_cancelReadTimeout:function(){
    		if('_readTimeout' in this){
    			clearTimeout(this._readTimeout);
    			delete this._readTimeout;
    		}
    	},
    	
    	markRead:function(){
    		console.info("Notification.markRead", this);
    		if(this.read){
    			console.warn('Already read', this);
    			return;
    		}
    		NC.markRead(this.notification);
    	},
    	
    	/**
    	 * Starts a timeout to read, timeout is cancelled by blur.
    	 */
    	_onFocus:function(){
    		console.debug('onFocus', this);
    		if(!this.read){
    			this.markRead();
    		}
    		this.inherited(arguments);
    	}

    });
    return Notification;
});
