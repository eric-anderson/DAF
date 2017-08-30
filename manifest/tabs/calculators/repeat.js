/*
 ** DA Friends Calculator = repeat.js
 */
var guiTabs = (function(self) {
    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.repeat = {
        title: 'Repeatables',
        image: 'loot.png',
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
    function onUpdate(id, reason) {}

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/