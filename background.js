const PrivateBookmark = {
	keyword 	: "private", 	//search this word in bookmark titles
	tag 		: "private", 	//search this tag in bookmark tags
	currentURL 	: "", 			//this is necessary to break cycle loop
	privateWindow : -1, 		//pointer to open and active private window (this is to limit number of window lookups)
	filter : [],				//structure for private bookmarks URLs used for setting up filtering in requests listner


	//store id of a new private window created for future use (only if there is no existing private window)
	windowCreated : function(w){
		if(PrivateBookmark.privateWindow==-1 && w.incognito)PrivateBookmark.privateWindow = w.id;
	},


	//remove reference to a private window if it has been destroyed
	windowDestroyed : function(id){
		if(PrivateBookmark.privateWindow==id)PrivateBookmark.privateWindow = -1;
	},
	
	//reload cache in case of any change in bookmarks
	bookmarksChanged : function(arg){
		PrivateBookmark.filter = []; //clear filter
		
		// get whole tree and use recurency to iterate over all nodes
	    browser.bookmarks.getTree().then(function(bookmarks){
	    	PrivateBookmark.readBookmarkItems(bookmarks[0]); //process root node
	    
    		if(browser.webRequest.onBeforeRequest.hasListener(PrivateBookmark.requestCancel)){
		    	browser.webRequest.onBeforeRequest.removeListener(PrivateBookmark.requestCancel); //remove existing listner
    		}
	    	if(Object.keys(PrivateBookmark.filter).length>0){ //cache is not empty thus we need listner for webRequests
		    	browser.webRequest.onBeforeRequest.addListener(PrivateBookmark.requestCancel, {urls: PrivateBookmark.filter}, ["blocking"]);
	    	}
	    })
	},

	readBookmarkItems : function(bookmark){
		if (bookmark.url && bookmark.title.includes(this.keyword)) {
			PrivateBookmark.filter.push(bookmark.url); //node is not directory and has contains "private" key word, adding to filter
		};
		if (bookmark.children){ //recurently process children
			for(child of bookmark.children){
				this.readBookmarkItems(child);
			}
		}
	},
		
	requestCancel : function(requestDetails){ //listner for webRequests
	    if(PrivateBookmark.currentURL==requestDetails.url){//break cyclic loop, request in private window
	    	PrivateBookmark.currentURL = "";
	        return{cancel: false};
	    };
		
	    PrivateBookmark.currentURL = requestDetails.url; //save URL beeing processed
        if (PrivateBookmark.privateWindow==-1){
            browser.windows.create({incognito:true,url:requestDetails.url}); //no private window so far, create new
        }else{
            browser.tabs.create({active:true,url:requestDetails.url,windowId:PrivateBookmark.privateWindow}); //open new tab in existing private window
            browser.windows.update(PrivateBookmark.privateWindow,{focused:true}); //activate private window if link is open in publick window
        }
        return {cancel: true};
	},
	
	readOptions : function(options){
		PrivateBookmark.keyword = options.keyword || "private";
		PrivateBookmark.tag = options.tag || "private";
        browser.storage.local.set({
            "keyword": PrivateBookmark.keyword,
            "tag": PrivateBookmark.tag
        });
		PrivateBookmark.bookmarksChanged(); //register webRequest listner
	},

	readOptionsError : function(e){
		console.log("read options error: ",e);
	},
	
	handleMessage : function(m){
		if (typeof m["event"] != "undefined" && m.event=="optionsChanged"){
			console.log("[PrivateBookmark] options changed - reloading");
			browser.webRequest.onBeforeRequest.hasListener(PrivateBookmark.requestCancel);
			PrivateBookmark.setup();
		}
	},
	
	setup : function(){
		const gettingOptions = browser.storage.local.get();
		gettingOptions.then(PrivateBookmark.readOptions,PrivateBookmark.readOptionsError);//read options
	},
	
	init : function(){
		//add window listners
		browser.windows.onCreated.addListener(this.windowCreated);
		browser.windows.onRemoved.addListener(this.windowDestroyed);

		//add bookmarks listners
		browser.bookmarks.onCreated.addListener(this.bookmarksChanged);
		browser.bookmarks.onChanged.addListener(this.bookmarksChanged);
		browser.bookmarks.onRemoved.addListener(this.bookmarksChanged);
//		browser.bookmarks.onImportEnded.addListener(this.bookmarksChanged); //firefox is not supporting this

		browser.runtime.onMessage.addListener(this.handleMessage);
		this.setup();
	}
};


PrivateBookmark.init();
