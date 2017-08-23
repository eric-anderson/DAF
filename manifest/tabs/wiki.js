/*
 ** DA Friends - wiki.js
 */
var guiTabs = (function(self) {
    var tabID;

     /*
     ** Define this tab's details
     */
    self.tabs.Wiki = {
        title: 'wikiTools',
        image: null,
        order: 9900,
        html: true,
        onInit: onInit,
        onAction: onAction,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        tabID = id;
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        if (reason == 'active')
            return true;

        bgp.daGame.eventDetails(81, true).then(function(event) {
            console.log(event);
        });
        
        return true;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/