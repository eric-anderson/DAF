/*
 ** DA Friends - calculator.js
 */
var guiTabs = (function(self) {
    var tabID, active, menu = {
        kitchen: true,
        crowns: true,
        g_ring: false,
        r_ring: false
    };

    /*
     ** Define this tab's details
     */
    self.tabs.Calculators = {
        title: 'Calculators',
        image: 'calculator.png',
        order: 9000,
        html: true,
        onInit: onInit,
        onAction: onAction,
        onUpdate: onUpdate,
        menu: {}
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        tabID = id;
        return Promise.all(Object.keys(menu).reduce(function(items, key) {
            if ((menu[key] === true) || localStorage.installType == 'development') {
                items.push(new Promise((resolve, reject) => {
                    var script = document.createElement('script');
                    script.onerror = function() {
                        resolve({
                            key: key,
                            script: false,
                            html: null
                        });
                    };
                    script.onload = function() {
                        resolve(menuHTML(key));
                    };
                    script.type = "text/javascript";
                    script.src = "/manifest/tabs/calculators/" + key.toLowerCase() + ".js";
                    document.head.appendChild(script);
                    script = null;
                }));
            }

            return items;
        }, [])).then(function(loaded) {
            var menu = document.getElementById('calc-menu');
            var card = document.getElementById('calc-menu-card');

            loaded.forEach(function(item, idx) {
                if (typeof self.tabs.Calculators.menu[item.key] === 'object') {
                    var id = 'calc-item-' + item.key;
                    var li = document.createElement('li');
                    var a = document.createElement('a');
                    var img = document.createElement('img');
                    var span = document.createElement('span');
                    var div = document.createElement('div');

                    a.id = id;
                    a.setAttribute('href', '#');
                    a.addEventListener('click', menuClicked);
                    a.appendChild(img);
                    img.setAttribute('src', '/img/' + self.tabs.Calculators.menu[item.key].image);
                    a.appendChild(span);
                    span.innerHTML = guiString(self.tabs.Calculators.menu[item.key].title);
                    li.appendChild(a);
                    menu.appendChild(li);
                    self.tabs.Calculators.menu[item.key].nav = a;

                    div.className = 'v-menu-content';
                    div.setAttribute('data-v-menu-id', id);
                    card.appendChild(div);
                    self.tabs.Calculators.menu[item.key].html = div;

                    if (typeof item.html === 'string') {
                        div.innerHTML = item.html;
                    } else if ((item.html !== null) && typeof item.html === 'object') try {
                        div.appendChild(item.html);
                    } catch (e) {}

                    // Do any tab specific initialisation
                    if (self.tabs.Calculators.menu[item.key].hasOwnProperty('onInit')) {
                        if (typeof self.tabs.Calculators.menu[item.key].onInit === 'function')
                            self.tabs.Calculators.menu[item.key].onInit(item.key, div);
                        delete self.tabs.Calculators.menu[item.key].onInit;
                    }

                } else
                    delete self.tabs.Calculators.menu[item.key];
            });

            guiText_i18n(card);
            menuActive(bgp.exPrefs.calcMenu);

        }).catch(function(error) {
            console.error(error);
        });
    }

    /*
     ** @Private fetch Menu Item HTML content
     */
    function menuHTML(key) {
        if (self.tabs.Calculators.menu.hasOwnProperty(key) === true) {
            if (self.tabs.Calculators.menu[key].hasOwnProperty('html') === true) {
                if (self.tabs.Calculators.menu[key].html === true) {
                    return http.get.html("/manifest/tabs/calculators/" + key.toLowerCase() + ".html")
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
                        html: self.tabs.Calculators.menu[key].html
                    };
            }
        }
        return {
            key: key,
            script: true,
            html: null
        };
    }

    /*
     ** @Private - Menu Item Clicked
     */
    function menuClicked(e) {
        var id = e.target.id;
        if (!id)
            id = e.target.parentElement.id;
        e.preventDefault();

        // calc-item-
        id = id.slice(10);

        if ((!self.isLocked()) && active != id) {
            id = menuActive(id);
            chrome.storage.sync.set({
                calcMenu: id
            });
        }
    }

    /*
     ** @Private - menuActive
     */
    function menuActive(id) {
        if (self.tabs.Calculators.menu.hasOwnProperty(active)) {
            self.tabs.Calculators.menu[active].nav.classList.remove('active');
            self.tabs.Calculators.menu[active].html.style.display = 'none';
        }
        self.tabs.Calculators.menu[id].nav.classList.add('active');
        self.tabs.Calculators.menu[id].html.style.display = 'block';

        if (active != id) {
            active = id;
            self.update();
        }

        return active;
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
        if (self.tabs.Calculators.menu.hasOwnProperty(active)) {
            if (self.tabs.Calculators.menu[active].hasOwnProperty('onAction')) {
                self.tabs.Calculators.menu[active].onAction(active, action, data);
            }
        }
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        if (reason == 'active')
            return true;

        if ((!bgp.daGame.daUser) || !bgp.daGame.daUser.player || !bgp.daGame.daLevels) {
            guiStatus('errorData', 'ERROR', 'error');
            return false;
        }

        if (self.tabs.Calculators.menu.hasOwnProperty(active)) {
            if (self.tabs.Calculators.menu[active].hasOwnProperty('onUpdate')) {
                return self.tabs.Calculators.menu[active].onUpdate(active, reason);
            }
        }
        return true;
    }

    /*
     ** @Public - Get Region Name (if any)
     */
    self.regionName = function(rid) {
        nids = {
            1: 'MAP005', // EGYPT
            2: 'MAP006', // SCANDINAVIA
            3: 'MAP018', // CHINA
            4: 'MAP021', // ATLANTIS
            5: 'MAP038' // GREECE
        };

        if (nids.hasOwnProperty(rid))
            return bgp.daGame.string(nids[rid]);
        return null;
    }

    /*
     ** @Public - Get Region Image (if any)
     */
    self.regionImage = function(rid, forceEgypt = false, size = 16) {
        if (rid == 0 && forceEgypt)
            rid = 1;

        if (rid >= 1 && rid <= 5) {
            var name = self.regionName(rid);

            return '<img src="/img/regions/' +
                rid + '.png" width="' + size + '" height="' + size + '"' +
                (name ? ' title="' + name + '"' : '') + '/>';
        }
        return '<img src="/img/blank.gif" title="' + rid + '"/>';
    }

    /*
     ** @Public - Get Object Name
     */
    self.objectName = function(type, oid) {
        switch (type) {
            case 'material':    return self.materialName(oid);
        }
        return '?' + type + '-' + oid + '?';
    }

    /*
     ** @Public - Get Material Name
     */
    self.materialName = function(mid) {
        if ((bgp.daGame.daUser) && bgp.daGame.daMaterials) {
            if (bgp.daGame.daMaterials.hasOwnProperty(mid))
                return bgp.daGame.string(bgp.daGame.daMaterials[mid].name_loc);
            return '';
        }
        return null;
    }

    /*
     ** @Public - Check Game Material Inventory
     */
    self.materialInventory = function(mid) {
        if ((bgp.daGame.daUser) && bgp.daGame.daUser.hasOwnProperty('materials')) {
            if (bgp.daGame.daUser.materials.hasOwnProperty(mid))
                return parseInt(bgp.daGame.daUser.materials[mid]);
        }
        return 0;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/