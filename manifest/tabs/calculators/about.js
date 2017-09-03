/*
 ** DA Friends Calculator - about.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div;
    let achievements = null;

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.about = {
        title: 'Achievements',
        image: 'medal.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {
        tabID = tid;
        tab = self.tabs.Calculators.menu[tid];
        div = tab.html;
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {

        if (achievements)
            return doUpdate();
        return bgp.daGame.loadGameXML('achievements.xml', false).then(doUpdate);
    }

    function doUpdate(fileData = null) {
        if (fileData) {
            console.log(fileData);
        }
        return true;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/