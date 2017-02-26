/**
 * Maintains the ObjectStore and API interface.
 * Model & Controller
 * http://dojotoolkit.org/documentation/tutorials/1.9/data_modeling/
 */
/*
 * TODO NotificationsController
 * - Error handling
 * - Pass JSON response for POSTs resulting in mutation? (read/dismiss), update store.
 * The only point is if things like message change based on the mutation, but that's not the case currently.
 */
define(["dojo/_base/declare", "dojo/_base/lang","dojo/promise/all", "dojo/Deferred",
        "dojo/request",
        "dojo/store/Memory","dojo/store/Observable", "dojo/Stateful",
        "dojo/date/stamp",
        
        "calpoly/portal"],
         
function(declare, lang, all, Deferred,
		request,
        Memory, Observable, Stateful,
        dateStamp,
        
        portal){
	
	// Static Initialization
    var storePromise =  new Deferred();;
    var notifStore = null;
    var fname = 'calpoly-notifications';
    var dateFields = ['createdDate', 'dismissDate', 'readDate', 'expireDate'];
    var worklistSummaryRequest = null;
    
    var storeOptions = {overwrite:true};
    
    // Preload before domReady
    try{
    	var url = portal.createResourceURL(null, {fname:fname, id:"getNotifications"});
    	request(url,{handleAs:"json"}).then(function(data){
    		console.debug('got notifications!', data);
    		var items = data.items;
    		var statefulItems = [];
    		for ( var i = 0; i < items.length; i++) {
    			var item = items[i];
    			// Convert dates
    			for ( var j = 0; j < dateFields.length; j++) {
    				var df = dateFields[j];
    				if(item[df]){
    					item[df] = dateStamp.fromISOString(item[df]);
    				}
    			}
    			statefulItems.push(new Stateful(item));
    		}

    		notifStore = new Observable(new Memory({data:statefulItems}));
    		storePromise.resolve(notifStore);
    	});
    	
    	url = portal.createResourceURL(null, {fname:fname, id:"worklistSummary"});
    	worklistSummaryRequest = request(url, {handleAs:"html"});
    }
    catch(err){
    	console.error('NotificationsController: problem initializing!');
    	console.exception(err);
    }
    
    var NotificationsController = {
    	
    	/**
    	 * Returns a Deferred that resolves with the store after notifications have been retrieved.
    	 * @memberOf NotificationsController
    	 */
    	getNotifications:function(){
    		return storePromise;
    	},
    	
    	/**
    	 * Mark a notification as read.
    	 * Updates store immediately, regardless of whether POST succeeds. 
    	 * @param item
    	 */
    	markRead:function(item){
    		console.info('NotificationsController.markRead', item);
    		item.set('read', true);
    		item.set('readDate', new Date());
    		notifStore.put(item, storeOptions);
    		
    		var url = portal.createResourceURL({id:item.id}, {id:"read",fname:fname});
    		// TODO Error handling
    		request(url, {method:"POST"});
    	},
    	
    	/**
    	 * Dismiss a notification.
    	 * Updates store immediately.
    	 * @param item
    	 */
    	dismiss:function(item){
    		console.info('NotificationsController.dismiss');
    		item.set('dismissed', true);
    		item.set('dismissible', true);
    		item.set('dismissDate', new Date());
    		notifStore.put(item, storeOptions);
    		
    		var url = portal.createResourceURL({id:item.id}, {id:"dismiss", fname:fname});
			// TODO Error handling
			request(url, {method:"POST"});
    	},
    	
    	/**
    	 * Get the worklistSummary request promise.
    	 * @returns
    	 */
    	getWorklistSummary:function(){
    		return worklistSummaryRequest;
    	}

    };
    return NotificationsController;
});
