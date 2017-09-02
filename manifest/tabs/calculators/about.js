/*
 ** DA Friends Calculator - about.js
 */
var guiTabs = (function(self) {
    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.about = {
        title: 'aboutYou',
        image: 'diggy.png',
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