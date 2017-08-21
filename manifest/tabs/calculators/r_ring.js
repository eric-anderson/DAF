/*
 ** DA Friends Calculator = g_ring.js
 */
var guiTabs = (function(self) {
    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.r_ring = {
        title: 'redRings',
        image: 'materials/r_ring.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {}

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        var mines = [880, 1717, 1718];
        return self.ringLoot('rring', reason, mines, self.tabs.Calculators.menu.r_ring)
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/