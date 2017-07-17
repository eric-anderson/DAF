/*
 ** DA Friends - index.js
 */
var bgp = chrome.extension.getBackgroundPage();
var wikiLink = "https://wiki.diggysadventure.com";
var wikiVars = "/index.php?title=";

// Add Property value as a Message Key in _locales/xx/messages.json
// So the user gets a nice description of the theme/alarm sound.
var pageThemes = {
    'default': 'cssDefault',
    'minty': 'cssMinty',
    'rose': 'cssRose'
};

/** Not used yet
var alarmSounds = {
    'rooster':  'sndRooster'
};
**/

/*
 ** On Page load Handler
 */
document.addEventListener('DOMContentLoaded', function() {
    // Make sure the background script has finished initialising
    // this happens on startup and after some updates/reloads
    if (!bgp.daGame)
        window.close();
    guiInit();
});

/*
 ** Extension message handler
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var status = "ok",
        results = null;

    switch (request.cmd) {
        case 'exPrefs':
            guiTabs.prefChanged(request.name, request.changes.newValue, request.changes.oldValue);
            break;
        case 'gameSync':
            guiTabs.action(request.action, request.data);
            break;
        case 'gameLoading':
        case 'dataLoading':
        case 'dataStart':
            guiStatus(request.text, null, 'download');
            break;

        case 'gameMaintenance':
        case 'userMaintenance':
            guiStatus(request.text, 'Warning', 'warning');
            guiTabs.update();
            guiNews();
            break;

        case 'dataSync':
            guiTabs.resync();
            break;

        case 'dataDone':
            guiStatus();
            guiTabs.update();
            break;

        case 'dataError':
            guiStatus(request.text, 'Error', 'error');
            guiTabs.update();
            break;

        default:
            return bgp.onMessage(request, sender, sendResponse);
            /*
            if (bgp.exPrefs.debug) console.log("chrome.extension.onMessage", request);
            sendResponse({
                status: "error",
                result: `Invalid 'cmd'`
            });
            break;
            */
    }

    sendResponse({
        status: status,
        result: results
    });
    return true; // MUST return true; here!
});

/*
 ** Initialize GUI
 */
function guiInit() {
    if (typeof guiInit.initialised !== 'undefined')
        return;
    guiInit.initialised = true;

    guiTheme();
    document.getElementsByTagName('html')[0].setAttribute('lang', bgp.exPrefs.gameLang.toLowerCase());
    document.getElementById('extTitle').innerHTML = guiString('extTitle');
    document.getElementById('disclaimer').innerHTML = guiString('disclaimer');
    document.getElementById('tabStatus').style.display = 'none';
    document.getElementById('gameURL').title = guiString('gameURL');
    document.getElementById('gameURL').addEventListener('click', function(e) {
        e.preventDefault();
        bgp.daGame.reload();
        return false;
    });

    guiText_i18n();
    guiNews();

    // Add Entry for each tab to be loaded
    //
    // Property value: true for production, false = tab
    // only loaded if running in development environment
    //
    guiTabs.initialise({
        Neighbours: true,
        Children: true,
        Friendship: false,
        Crowns: true,
        Kitchen: false,
        Camp: false,
        Events: true,
        Options: true // Last Entry
    }).then(function() {
        guiWikiLinks();
    });
}

/*
 ** Extra!, Extra!, Read All About It! :-)
 */
function guiNews(article = bgp.exPrefs.gameNews) {

    if (localStorage.installType != 'development')
        article = guiString('suspended');

    if (article) {
        document.getElementById('newsFlash').innerHTML = article;
        document.getElementById('gameNews').style.display = '';
    } else
        document.getElementById('gameNews').style.display = 'none';
}

/*
 ** Master Tab Handler
 */
var guiTabs = (function() {
    // @Private
    var tabElement = '#tabs';
    var tabNavigationLinks = '.c-tabs-nav';
    var tabContentWrapper = '.c-tabs-wrapper';
    var tabContentContainers = '.c-tab';
    var tabWrapper;
    var tabOrder = [];
    var locked = false;
    var active;
    var handlers = {};

    // @Public - Tab Array
    self.tabs = {};

    // @Public - Options Tab
    self.tabs.Options = {
        title: 'Options',
        image: 'options.png',
        order: 9999,
        html: true,
        onInit: tabOptionsInit,
        onUpdate: tabOptionsUpdate
    };

    /*
     ** @Public - Initialise Tabs
     */
    self.initialise = function(loadTabs = {}) {
        return Promise.all(Object.keys(loadTabs).reduce(function(tabs, key) {
            if ((loadTabs[key] === true) || localStorage.installType == 'development') {
                if (key != 'Options') {
                    tabs.push(new Promise((resolve, reject) => {
                        var script = document.createElement('script');
                        script.onerror = function() {
                            resolve({
                                key: key,
                                script: false,
                                html: null
                            });
                        };
                        script.onload = function() {
                            resolve(tabHTML(key));
                        };
                        script.type = "text/javascript";
                        script.src = "/manifest/tabs/" + key.toLowerCase() + ".js";
                        document.head.appendChild(script);
                        script = null;
                    }));
                } else
                    tabs.push(tabHTML(key));
            }
            return tabs;
        }, [])).then(function(loaded) {

            // Sort what we loaded, so we display in a prefered order
            tabOrder = loaded.reduce(function(keep, tab, idx) {
                if (tab.script)
                    keep.push(tab.key);
                self.tabs[tab.key].html = tab.html;
                return keep;
            }, []).sort(function(a, b) {
                return self.tabs[a].order - self.tabs[b].order;
            });

            // Create HTML for each tab entry
            var nav, e = document.querySelector(tabElement);
            if (e) {
                nav = e.querySelectorAll(tabContentWrapper);

                if ((nav) && nav.length == 1) {
                    tabWrapper = nav[0];
                } else {
                    tabWrapper = document.createElement('div');
                    tabWrapper.className = 'c-tabs-wrapper';
                    e.appendChild(tabWrapper);
                }

                nav = e.querySelectorAll(tabNavigationLinks);
                if ((nav) && nav.length == 1) {
                    tabOrder.forEach(function(tab, idx) {
                        var id = self.tabs[tab].id = ('' + tab);
                        var a = document.createElement('a');
                        var img = document.createElement('img')
                        var span = document.createElement('span')

                        a.id = id;
                        a.className = 'c-tabs-nav__link';
                        a.setAttribute('href', '#');
                        a.addEventListener('click', tabClicked);
                        a.appendChild(img);
                        a.appendChild(span);
                        img.setAttribute('src', '/img/' + self.tabs[tab].image);
                        span.innerHTML = guiString(self.tabs[tab].title);
                        nav[0].appendChild(a);
                        self.tabs[tab].nav = a;

                        var d1 = document.createElement('div');
                        var d2 = document.createElement('div');
                        d1.setAttribute('data-c-tab-id', id);
                        d1.className = 'c-tab';
                        d1.innerHTML = '<br />';
                        d1.appendChild(d2);
                        d2.setAttribute('data-c-tab-id', id);
                        d2.className = 'c-tab-content';
                        tabWrapper.appendChild(d1);
                        self.tabs[tab].container = d1;
                        self.tabs[tab].content = d2;

                        //console.log(tab, "HTML", self.tabs[tab].html);
                        if (typeof self.tabs[tab].html === 'string') {
                            d2.innerHTML = self.tabs[tab].html;
                        } else if ((self.tabs[tab].html !== null) && typeof self.tabs[tab].html === 'object') try {
                            d2.appendChild(self.tabs[tab].html);
                        } catch (e) {}

                        /** Pain!!!
                        Array.prototype.forEach.call(d2.getElementsByTagName('script'), function(script) {
                           var script2 = document.createElement('script');
                           script2.src = script.src;
                           document.head.appendChild(script2);
                           script.remove();
                        });
                        **/

                        // Do any tab specific initialisation
                        if (self.tabs[id].hasOwnProperty('onInit')) {
                            if (typeof self.tabs[id].onInit === 'function')
                                self.tabs[id].onInit(id, d2);
                            delete self.tabs[id].onInit;
                        }
                    });

                    // Add scroll event handler
                    window.addEventListener('scroll', loadLazyImages);

                    tabActive(bgp.exPrefs.tabIndex);
                }
            }

            // Were done initialising so leave the building
            delete self.initialise;
        }).catch(function(error) {
            console.error(error);
        });
    }

    /*
     ** @Private - load lazy images when scrolled into view
     */
    function loadLazyImages() {
        var tab = active in self.tabs ? self.tabs[active] : null;
        // tab must exist, container must exists, container must be visible, tabs must have lazy images
        if (!tab || !tab.container || !tab.container.offsetParent || !tab.lazyImages) return;
        var lazyImages = tab.lazyImages, top = 0, bottom = top + window.innerHeight, refilter = false;
        lazyImages.forEach((item, index) => {
            if (item && item.hasAttribute('lazy-src')) {
                var rect = item.getBoundingClientRect();
                if(rect.bottom < top || rect.top > bottom) return;
                item.setAttribute('src', item.getAttribute('lazy-src'));
                item.removeAttribute('lazy-src');
            }
            lazyImages[index] = null;
            refilter = true;
        });
        if (refilter) {
            lazyImages = self.tabs[active].lazyImages = lazyImages.filter(item => !!item);
        }
    }

    /*
     ** @Public - collect lazy images
     */
    self.collectLazyImages = function(tab) {
        var tab = tab || self.tabs[active];
        if (tab) {
            var lazyImages = Array.from(tab.container.getElementsByTagName('img'));
            lazyImages.filter(item => item.hasAttribute('lazy-src'));
            tab.lazyImages = lazyImages;
            if (lazyImages.length) setTimeout(loadLazyImages, 10);
        }
    };

    /*
     ** @Private fetch Tabs HTML content
     */
    function tabHTML(key) {
        if (self.tabs[key].hasOwnProperty('html') === true) {
            if (self.tabs[key].html === true) {
                return http.get.html("/manifest/tabs/" + key.toLowerCase() + ".html")
                    .then(function(html) {
                        return {
                            key: key,
                            script: true,
                            html: html
                        };
                    }).catch(function(error) {
                        return {
                            key: key,
                            script: true,
                            html: null
                        };
                    });
            } else
                return {
                    key: key,
                    script: true,
                    html: self.tabs[key].html
                };
        }
        return {
            key: key,
            script: true,
            html: null
        };
    }

    /*
     ** @Public - Update links to open in a new tab
     */
    self.linkTabs = function(parent) {
        var links = parent.getElementsByTagName("a");

        for (var i = 0; i < links.length; i++) {
            (function() {
                var ln = links[i];
                var location = ln.href;
                ln.onclick = function() {
                    chrome.tabs.create({
                        active: true,
                        url: location
                    });
                    return false;
                };
            })();
        }
    }

    /*
     ** @Public - Update preference value
     */
    self.setPref = function(name, value) {
        save = {};
        save[name] = value;
        chrome.storage.sync.set(save);
    }

    /*
     ** @Public - Hide ALL Tab Content
     */
    self.hideContent = function(state) {
        tabWrapper.style.display = (state ? 'none' : 'block');
    }

    /*
     ** @Public - Lock Tabs
     */
    self.lock = function(state) {
        locked = (state ? true : false);
    }

    /*
     ** @Public - Update (Active) Tab
     */
    self.update = function() {
        tabUpdate(active, 'update');
    }

    /*
     ** @Public - Refresh (Active) Tab
     */
    self.action = function(action, data) {
        tabOrder.forEach(function(id, idx, ary) {
            if (self.tabs[id].hasOwnProperty('onAction')) {
                setTimeout(function() {
                    if (typeof self.tabs[id].onAction === 'function') try {
                        self.tabs[id].onAction(id, action, data);
                    } catch (e) {
                        console.error(e);
                    }
                }, 0);
            }
        });
    }

    /*
     ** @Public - Resync (Active) Tab
     */
    self.resync = function() {
        document.getElementById('subTitle').innerHTML = guiString("subTitle", [localStorage.versionName, bgp.daGame.daUser.site, unixDate(bgp.daGame.daUser.time, true), bgp.daGame.daUser.access]);

        tabOrder.forEach(function(id, idx, ary) {
            if (self.tabs[id].hasOwnProperty('onResync')) {
                setTimeout(function() {
                    if (typeof self.tabs[id].onResync === 'function') try {
                        self.tabs[id].onResync(id);
                    } catch (e) {
                        console.error(e);
                    }
                }, 0);
            }
        });
    }

    /*
     ** @Public - Refresh (Active) Tab
     */
    self.refresh = function(id = active) {
        if (id !== null) {
            if (self.tabs.hasOwnProperty(id)) {
                self.tabs[id].time = null;
            } else
                return;
        } else tabOrder.forEach(function(id, idx, ary) {
            self.tabs[id].time = null;
        });
        tabUpdate(id, 'update');
    }

    /*
     ** @Private tabClicked
     */
    function tabClicked(e) {
        var id = e.target.id;
        if (!id)
            id = e.target.parentElement.id;
        e.preventDefault();
        if ((!locked) && active != id) {
            id = tabActive(id);
            chrome.storage.sync.set({
                tabIndex: id
            });
        }
    }

    /*
     ** @Private tabActive
     */
    function tabActive(id) {
        if (!self.tabs.hasOwnProperty(id))
            id = tabOrder[0];
        if (self.tabs.hasOwnProperty(active)) {
            self.tabs[active].nav.classList.remove('is-active');
            self.tabs[active].container.classList.remove('is-active');
        }
        self.tabs[id].nav.classList.add('is-active');
        //    self.tabs[id].container.classList.add('is-active');

        if (active != id) {
            active = id;
            tabUpdate(id, 'active');
        }

        return active;
    }

    /*
     ** @Private tabUpdate
     */
    function tabUpdate(id, reason) {
        document.getElementById('subTitle').innerHTML = guiString("subTitle", [localStorage.versionName, bgp.daGame.daUser.site, unixDate(bgp.daGame.daUser.time, true), bgp.daGame.daUser.access]);

        if (reason == 'active' && self.tabs[id].time != bgp.daGame.daUser.time)
            reason = 'update';

        switch (bgp.daGame.daUser.result) {
            case 'OK':
            case 'CACHED':
                if (reason != 'active')
                    guiStatus('dataProcessing', null, 'busy');
                break;
            case 'ERROR':
                guiStatus(guiString('gameError', [bgp.daGame.daUser.desc]), "Error", 'error');
                self.lock(false);
                if (active == 'Options')
                    break;
                return false;
            default:
            case 'EMPTY':
                guiStatus('noGameData', "Warning", 'warning');
                self.lock(false);
                if (active == 'Options')
                    break;
                return false;
        }

        let promise = new Promise((resolve, reject) => {
            if ((reason != 'active') ||
                self.tabs[id].time != bgp.daGame.daUser.time) {
                if (self.tabs.hasOwnProperty(id)) {
                    if (self.tabs[id].hasOwnProperty('onUpdate')) {
                        setTimeout(function() {
                            if (typeof self.tabs[id].onUpdate === 'function') try {
                                resolve(self.tabs[id].onUpdate(id, reason));
                            } catch (e) {
                                console.error(e);
                                guiStatus(guiString('errorException', [e]), "Error", 'error');
                                resolve(false);
                            }
                        }, 0);
                    }
                }
            } else {
                document.getElementById('tabStatus').style.display = 'none';
                self.hideContent(false);
                setTimeout(function() {
                    resolve(true);
                }, 10);
            }
        }).then(function(ok) {
            if (ok) {
                document.getElementById('tabStatus').style.display = 'none';
                if (!self.tabs[id].time) {
                    guiCardToggle(self.tabs[id].content);
                    guiWikiLinks(self.tabs[id].content);
                    guiText_i18n(self.tabs[id].content);
                }
                self.tabs[id].time = bgp.daGame.daUser.time;
                if (id == active)
                    self.tabs[id].container.classList.add('is-active');
                self.hideContent(false);
            }
            self.lock(false);
            return ok;
        });

        return promise;
    }

    /*
     ** @Public - Track Pref Changes (from outside of the GUI as well)
     */
    self.prefChanged = function(name, newValue, oldValue) {
        switch (name) {
            case 'gameNews':
                guiNews();
                return;
            case 'cssTheme':
                guiTheme(newValue);
                return;
            case 'hideGiftTime':
                guiTabs.refresh('Neighbours')
                return;
            case 'capCrowns':
                guiTabs.refresh('Crowns');
                return;
            case 'hidePastEvents':
                guiTabs.refresh('Events');
                return;
            default:
                break;
        }

        var eid = document.getElementById(name);
        if (eid) {
            switch(eid.type.toLowerCase()) {
                case 'checkbox':
                    eid.checked = newValue;
                    break;
                case 'select':
                    // TODO
                    console.log(newValue, eid);
                    break;
            }
        }
    }
    /*
     ** @Private Initialise the options tab
     */
    function tabOptionsInit(id, cel) {
        var form = document.getElementById('optForm');
        var list, forInput, forType, callback, disable;

        document.getElementById('optGeneral').innerHTML = guiString('General');

        list = form.getElementsByTagName("SPAN");
        for (var e = 0; e < list.length; e++) {
            list[e].innerHTML = guiString(list[e].id);
        }

        list = form.getElementsByTagName("LABEL");
        for (var e = 0; e < list.length; e++) {
            list[e].innerHTML = guiString(list[e].id);

            if (!(forInput = list[e].control))
                continue;
            if (!(forType = forInput.getAttribute("TYPE")))
                forType = forInput.nodeName;

            callback = '__' + forInput.id + '_' + forType;
            disable = true;

            if (bgp.exPrefs.hasOwnProperty(forInput.id)) {
                disable = false;
                if (typeof handlers[callback] === "function")
                    disable = handlers[callback].call(this, forInput, list[e]);

                if (!forInput.onchange) {
                    switch (forType.toLowerCase()) {
                        case 'select':
                            forInput.onchange = (e) => {
                                self.setPref(e.target.id, e.target.value);
                            }
                            break;
                        case 'checkbox':
                            forInput.checked = bgp.exPrefs[forInput.id];
                            forInput.onchange = (e) => {
                                self.setPref(e.target.id, e.target.checked);
                            };
                            break;
                        default:
                            disable = true;
                            break;
                    }
                }
            }

            if (!forInput.disabled)
                forInput.disabled = disable;
        }
    }

    /*
     ** @Private Update the options tab
     */
    function tabOptionsUpdate(id, reason) {
        return true;
    }

    function addOption(select, value, text, selectedValue) {
        var option = document.createElement("option");
        option.text = text;
        option.value = value;
        select.add(option);
        if (selectedValue == value) {
            select.selectedIndex = select.length - 1;
        }
    }

    /*
     ** @Private Handlers
     */
    handlers['__gameSite_SELECT'] = function(p) {
        function setAutoPortal(value) {
            document.getElementById('autoPortal').disabled = ((value == 'portal') ? false : true);
        }
        var selectedValue = bgp.exPrefs.gameSite;
        for (key in bgp.gameUrls) {
            addOption(p, key, guiString(key), selectedValue);
        }
        setAutoPortal(selectedValue);
        p.onchange = (e) => {
            setAutoPortal(e.target.value);
            self.setPref(e.target.id, e.target.value);
        }
        return false; // Not Disabled
    };

    handlers['__toolbarStyle_SELECT'] = function(p) {
        var selectedValue = parseInt(bgp.exPrefs.toolbarStyle) || 2;
        if (selectedValue < 1 || selectedValue > 4) selectedValue = 2;
        for (var key = 1; key <= 4; key++) {
            addOption(p, key,  guiString('toolbarStyle_' + key), selectedValue);
        }
        return false; // Not Disabled
    };

    handlers['__gcTableSize_SELECT'] = function(p) {
        var selectedValue = String(bgp.exPrefs.gcTableSize);
        if (selectedValue != 'small' && selectedValue != 'large') selectedValue = 'large';
        addOption(p, 'small', guiString('gcTableSize_small'), selectedValue);
        addOption(p, 'large', guiString('gcTableSize_large'), selectedValue);
        return false; // Not Disabled
    };

    handlers['__cssTheme_SELECT'] = function(p) {
        for (key in pageThemes) {
            var e = document.createElement("option");
            e.text = guiString(pageThemes[key]);
            e.value = key;
            p.add(e);
            if (bgp.exPrefs.cssTheme == key)
                p.selectedIndex = p.length - 1;
        }
        return false; // Not Disabled
    };

    handlers['__gameDebug_checkbox'] = __devOnly;
    handlers['__cacheFiles_checkbox'] = __devOnly;
    handlers['__debug_checkbox'] = __devOnly;

    function __devOnly(p, l, disable = false) {
        if (localStorage.installType != 'development') {
            p.style.display = 'none';
            l.style.display = 'none';
            return !disable;
        }
        return disable;
    }

    return self;
}());

/*
 ** Set theme
 */
function guiTheme(name = null) {
    if (name === null)
        name = bgp.exPrefs.cssTheme;
    if (!pageThemes.hasOwnProperty(name))
        name = 'default';

    var filename = "/manifest/css/themes/" + name + ".css";
    var className = 'themeStylesheet';
    var css = document.getElementById(className);

    if (!css) {
        css = document.createElement('link');
        css.id = className;
        css.setAttribute('rel', "stylesheet")
        css.setAttribute('type', "text/css")
        document.getElementsByTagName('head')[0].appendChild(css);
    }

    css.setAttribute('href', filename)

    return name;
}

/*
 ** Set status message
 */
function guiStatus(text = null, title = null, style = null, hideTabs = true) {
    if (text !== null) {
        if (title == null)
            title = 'pleaseWait';
        guiTabs.lock(true);
        document.getElementById('tabStatus').style.display = 'block';
        if (hideTabs)
            guiTabs.hideContent(true);
        document.getElementById('statusText').innerHTML = guiString(text);
        if (title !== null)
            document.getElementById('statusTitle').innerHTML = guiString(title);
        if (style !== null)
            document.getElementById('statusAlert').className = style;
    } else {
        guiTabs.lock(false);
        guiTabs.hideContent(false);
        document.getElementById('tabStatus').style.display = 'none';
    }
}

/*
 ** Get a GUI string
 */
function guiString(message, subs = null) {
    return bgp.daGame.i18n(message, subs);
}

/*
 ** Set Card Toggles
 */
function guiCardToggle(parent = document) {
    parent.querySelectorAll('.clicker > h1:first-child').forEach(function(e) {
        var img = onToggle(e, false);
        if (img) {
            img.onclick = (e) => {
                onToggle(e.target.parentElement, true);
                return false;
            };
        }
        e.onclick = (e) => {
            onToggle(e.target, true);
            return false;
        };
    });
}

function onToggle(e, toggle = true) {
    var div = e.parentElement.querySelector('.clicker > div:nth-child(2)');
    var img = e.querySelector('img:nth-child(3)');

    if (div) {
        var pk = 'toggle_' + div.id;

        if ((!toggle && div.id) && bgp.exPrefs.hasOwnProperty(pk))
            div.style.display = bgp.exPrefs[pk];

        if (div.style.display == ((toggle) ? 'none' : '')) {
            e.classList.toggle('clicker-hide', true);
            e.classList.toggle('clicker-show', false);
            if (img)
                img.src = '/img/card-hide.png';
            if (toggle)
                div.style.display = '';
        } else {
            e.classList.toggle('clicker-hide', false);
            e.classList.toggle('clicker-show', true);
            if (img)
                img.src = '/img/card-show.png';
            if (toggle)
                div.style.display = 'none';
        }

        guiTabs.setPref(pk, div.style.display);
    }

    return img;
}

/*
 ** Set GUI Text
 */
function guiText_i18n(parent = document) {
    parent.querySelectorAll("[data-i18n-title]").forEach(function(e) {
        var string = e.getAttribute('data-i18n-title');
        e.removeAttribute('data-i18n-title');
        e.title = bgp.daGame.i18n(string);
    });
    parent.querySelectorAll("[data-i18n-text]").forEach(function(e) {
        var string = e.getAttribute('data-i18n-text');
        e.removeAttribute('data-i18n-text');
        e.innerHTML = bgp.daGame.i18n(string);
    });
    parent.querySelectorAll("[data-game-text]").forEach(function(e) {
        var string = e.getAttribute('data-game-text');
        e.removeAttribute('data-game-text');
        e.innerHTML = bgp.daGame.string(string);
    });
}

/*
 ** Set Wiki Links
 */
function guiWikiLinks(parent = document) {
    parent.querySelectorAll('[data-wiki-page]').forEach(function(e) {
        var title = e.getAttribute('data-wiki-title') || 'clickWiki';
        e.removeAttribute('data-wiki-title');

        e.title = bgp.daGame.i18n(title);
        e.onmouseenter = function(e) {
            e.target.classList.toggle('wiki-hover', true);
            return true;
        };
        e.onmouseleave = function(e) {
            e.target.classList.toggle('wiki-hover', false);
            return true;
        };
        e.onclick = function(e) {
            var wikiPage = e.target.getAttribute('data-wiki-page');
            var wikiUrl;

            if (wikiPage.indexOf('http') == 0) {
                wikiUrl = wikiPage;
            } else
                wikiUrl = bgp.wikiLink + ((wikiPage) ? bgp.wikiVars + wikiPage : '/');

            chrome.tabs.query({}, function(tabs) {
                var wUrl = urlObject({
                    'url': bgp.wikiLink
                });
                var wkTab = 0;

                tabs.forEach(function(tab) {
                    var tUrl = urlObject({
                        'url': tab.url
                    });
                    if ((!wkTab) && (tUrl.host == wUrl.host || tab.url == wikiUrl)) {
                        chrome.windows.update(tab.windowId, {
                            focused: true,
                            drawAttention: true
                        });
                        wkTab = tab.id;
                    }
                });

                if (!wkTab) {
                    var maxWidth = Math.round(((window.screen.availWidth * 72) / 100));
                    var maxHeight = Math.round(((window.screen.availHeight * 80) / 100));
                    var top = Math.round((window.screen.availHeight - maxHeight) / 2);
                    var left = Math.round((window.screen.availWidth - maxWidth) / 2);

                    chrome.windows.create({
                        url: wikiUrl,
                        left: left,
                        top: top,
                        width: maxWidth,
                        height: maxHeight,
                        focused: true,
                        type: 'popup'
                    }, function(w) {});
                } else {
                    chrome.tabs.update(wkTab, {
                        url: wikiUrl,
                        active: true
                    });
                }
            });

            return false;
        };
    });
}
/*
 ** END
 *******************************************************************************/