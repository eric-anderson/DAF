/*
 ** DA Friends Calculator = g_ring.js
 */
var guiTabs = (function(self) {
    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.g_ring = {
        title: 'greenRings',
        image: 'materials/g_ring.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        console.log(bgp.daGame);
    }

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