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
        menu: {
        }
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

        if (active != id) {
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
        if (self.tabs.Calculators.menu.hasOwnProperty(active)) {
            if (self.tabs.Calculators.menu[active].hasOwnProperty('onUpdate')) {
                return self.tabs.Calculators.menu[active].onUpdate(active, reason);
            }
        }
        return true;
    }


    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/