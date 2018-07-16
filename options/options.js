const PrivateBookmarkOptions = {
    keyword : document.querySelector("#keyword"),
    tag: document.querySelector("#tag"),

    storeOptions : function(){
        browser.storage.local.set({
            "keyword": keyword.value,
            "tag": tag.value
        });
        browser.runtime.sendMessage({"event":"optionsChanged"});
    },
    
    readOptions : function(options){
        keyword.value = options.keyword || "";
        tag.value = options.tag || "";
    },
    
    readError : function(e){
        console.log("error reading PrivateBookmark options:",e);
    },
    
    init : function(){
        
        const gettingOptions = browser.storage.local.get();
        gettingOptions.then(PrivateBookmarkOptions.readOptions,PrivateBookmarkOptions.readError);

        keyword.addEventListener("blur", PrivateBookmarkOptions.storeOptions);
        tag.addEventListener("blur", PrivateBookmarkOptions.storeOptions);
    }
    
}
    
PrivateBookmarkOptions.init();


