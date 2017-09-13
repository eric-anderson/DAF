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
                    html = [];
                    help0.innerHTML = '';
                    let art = help1.getElementsByTagName('ARTICLE');
                    if (art.length > 0) {
                        html.push('<nav>', '<ol>');
                        for(let a = 0; a < art.length; a++) {
                            let h1 = art[a].getElementsByTagName('H1');
                            if (h1.length > 0) {
                                html.push('<li>', '<a href="#', art[a].id, '">', h1[0].innerHTML, '</a>');
                                let sec = art[a].getElementsByTagName('SECTION');
                                if (sec.length > 0) {
                                    html.push('<ul>');                                
                                    for(let s = 0; s < sec.length; s++) {
                                        let h2 = sec[s].getElementsByTagName('H2');
                                        if (h2.length > 0) {
                                            html.push('<li>', '<a href="#', sec[s].id, '">', h2[0].innerHTML, '</a>', '</li>');                                            
                                        }
                                    }
                                    html.push('</ul>');                                
                                }
                                html.push('</li>');
                            }
                        }
                        html.push('</ol>', '</nav>');
                        help0.innerHTML = html.join('');
                    }

                    document.getElementById('helpToC').style.display = ((help0.innerHTML) ? '' : 'none');
                
                    // Update any Hosted Image Links
                    help1.querySelectorAll("[data-hosted-img]").forEach(function(e) {
                        let string = e.getAttribute('data-hosted-img');
                        e.removeAttribute('data-hosted-img');
                        e.src = rootURL + string;
                    });

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
    ** @Public - Self Help :-)
    */
    self.help = function() {

    }

    return self;
}(guiTabs || {}));

/*
 ** End
 *******************************************************************************/