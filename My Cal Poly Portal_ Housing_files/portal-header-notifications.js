/**
 * Called from the uPortal theme, page.xsl
 * Creates the Notifications in the portal header.
 */
/*
 * TODO Design
 * singleton that manages single ObjectStore? Too complicated...
 * 
 * Accordion subclass?
 * Or TitlePane?
 */
require(["dojo/dom", "dojo/dom-construct", "dojo/_base/lang", "dojo/on", "dojo/dom-style", "dojo/dom-class",
        "dojo/_base/fx", "dojo/fx",
        "dojo/query","dojo/request",
        "dijit/form/DropDownButton", "dijit/layout/ContentPane","dijit/TooltipDialog",
        
        "NotificationsPortlet/NotificationsController", "NotificationsPortlet/widgets/NotificationsList",
        
        "dojo/domReady!"
        ],

        /**
         * @param {NotificationsController} NC
         */
function(dom, domConstruct, lang, on, domStyle, domClass,
        baseFx, fx,
        query, request,
        
        DropDownButton, ContentPane, TooltipDialog,
        
        NC, NotificationsList
         ){

	// Node to hold both buttons, so we can more easily order them
	var notifNode = domConstruct.create('div', {style:"display:inline;"}, 'portalHeaderUtilitiesTop', 'first');
	
	function notifStore(store){
		try{
			console.info('NotifHeader.notifStore', store);

			var query = store.query({dismissed:false}, {sort:[{attribute:"priority", descending:false},
			                                     {attribute:"createdDate", descending:true}]});
			
			function noNotifContent(){
				return domConstruct.create('em',{innerHTML:"You do not have any new notifications."});	
			}
			
			var total = query.total;
			var content;
			if(total==0){
				content = noNotifContent(); 
			}
			else{
				content = new NotificationsList({store:store, query:query});	
			}
			
			var dialog = new TooltipDialog({content:content, "class":"NotificationsDropDown"});
			// Add same class as portlet so CSS applies
			domClass.add(dialog.containerNode, "calpoly-notifications");
			
			var button = new DropDownButton({
				id:"headerNotificationsButton",
				label: total,
				dropDown: dialog
			});
    		domStyle.set(button.domNode, "opacity", "0");
			button.placeAt(notifNode);
			baseFx.fadeIn({node:button.domNode}).play();
			
			// Observe number of dismissed
			query.observe(function(item, removedFrom, insertedInto){
				console.debug('observe', arguments);
				if(insertedInto == -1){
					// Removed
					total--;
					button.set('label', total);
					
					if(total==0){
						dialog.set('content', noNotifContent());
					}
				}
			}, true);
			
			// TODO query unread, red if any unread
			var unread = store.query({dismissed:false, read:false});
			var numUnread = unread.total;
			if(numUnread>0){
				console.debug('some unread');
				domClass.add(button.domNode, 'unread');
				
				unread.observe(function(item, removedFrom,insertedInto){
					numUnread--;
					console.debug('numUnread', numUnread);
					if(numUnread==0){
						domClass.remove(button.domNode, 'unread');
					}
				});
			}
		}
		catch(err){
			console.exception(err);
		}
	}
	
	function worklistSummary(response){
		console.info('worklistSummary', response);
		var num = response.getHeader('numWorkitems');
		console.debug('numWorkitems', num);
		if(num==0){
			return;
		}
		
		var dialog = new TooltipDialog({content:response.text});
		domClass.add(dialog.domNode, 'up-portlet-content-wrapper-inner');
		var button = new DropDownButton({
			label: num+" eForms workitems",
			dropDown:dialog
		});
		domStyle.set(button.domNode, "opacity", "0");
		button.placeAt(notifNode, 'first');
		baseFx.fadeIn({node:button.domNode}).play();
	}
	
	NC.getNotifications().then(notifStore);
	NC.getWorklistSummary().response.then(worklistSummary);
	
});
