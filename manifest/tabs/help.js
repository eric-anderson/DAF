/*
 ** DA Friends - help.js
 */
var guiTabs = (function(self) {
    let rootURL = "http://www-drv.com/site/rdwdv9vu0drnvme88jkfvq/DAF-Manual/";
    let tabID, help0, help1;
    let content = null;

    /*
     ** Define this tab's details
     */
    self.tabs.Help = {
        title: 'Help',
        image: 'help.png',
        order: 9999,
        html: true,
        onInit: onInit,
        onUpdate: onUpdate
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {
        tabID = tid;
        help0 = document.getElementById("help0");
        help1 = document.getElementById("help1");
        content = null;
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        if (reason == 'active')
            return true;

        console.log(id, reason);

        if (!content) {
            let url = rootURL + 'index.json';
            return http.get.json(url).then(function(json) {
                let locale = chrome.i18n.getUILanguage();
                let lang = locale.split('-')[0];

                if (!json.manual.hasOwnProperty(locale)) {
                    if (!json.manual.hasOwnProperty(lang)) {
                        lang = 'en'; // Default
                        if (!json.manual.hasOwnProperty(lang))
                            return noManual();
                    }
                    locale = lang;
                }

                url = rootURL + locale + '/manual.html';
                return http.get.html(url).catch(function(error) {
                    throw Error(guiString('noManual'));
                }).then(function(html) {
                    help1.innerHTML = html;

                    // Create ToC

                    // Update any Hosted Image Links

                    return doManual();
                });
            });
        }
        return doManual();
    }

    function noManual() {
        guiStatus('noManual', 'WARNING', 'warning');
        guiWikiLinks();
        return false;
    }
    
    function doManual() {
        return true;
    }

    /*
    ** @Public
    */
    self.help = function() {

    }

    return self;
}(guiTabs || {}));

/*
 ** End
 *******************************************************************************/