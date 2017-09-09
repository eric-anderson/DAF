/*
 ** DA Friends Calculator - camp.js
 */
var guiTabs = (function(self) {
    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.camp = {
        title: 'Camp',
        image: 'camp.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {}

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        return true;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/