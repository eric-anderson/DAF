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
        
        // Example: Load current "Beachwatch" event #81, including all mines and floors
        return bgp.daGame.eventDetails(81, true).then(function(event) {
            console.log(id, reason, event);
            console.trace();
            return true;
        });       
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/