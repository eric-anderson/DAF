/*
 ** DA Friends - children.js
 */
var guiTabs = (function(self) {
    let rootURL = "https://www-drv.com/site/rdwdv9vu0drnvme88jkfvq/DAF-Manual/";
    let tabID;
    /*
     ** Define this tab's details
     */
    self.tabs.About = {
        title: 'About',
        image: 'about.png',
        order: 9999,
        html: true,
        onInit: onInit,
        onUpdate: onUpdate
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {}

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        if (reason == 'active')
            return true;
        return true;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/