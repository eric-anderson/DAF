/*
 ** DA Friends Calculator - about.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div;
    let quests = null;
    let achievs = null;

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.about = {
        title: 'Progress',
        image: 'graph.png',
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

        //console.log(bgp.daGame);
        //console.log(this);
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {

        if (achievs)
            return doUpdate();
        return bgp.daGame.loadGameXML('achievements.xml', false).then(doUpdate);
    }

    function doUpdate() {
        return true;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/