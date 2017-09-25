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
    function onInit(id, cel) {}

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        var mines = [185, 1535, 1932];

        return self.ringLoot('gring', reason, mines, self.tabs.Calculators.menu.g_ring)
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/