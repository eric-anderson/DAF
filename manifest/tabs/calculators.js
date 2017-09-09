/*
 ** DA Friends - calculator.js
 */
var guiTabs = (function(self) {
    var tabID, active, menu = {
        progress: true,
        camp: null,         // For now make this Dev Only
        kitchen: true,
        anvils: false,
        crowns: true,
        cmines: true,
        g_ring: true,
        events: true,
        r_ring: true,

        // Do NOT release, developers only
        god_children: null
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
     ** Preferred Object Order
     */
    let objOrder = ['system', 'material', 'usable', 'artifact', 'token'];

    /*
     ** Image Maps
     */
    let sysImg = {
        1: 'materials/bonus_xp.png',
        2: 'materials/bonus_energy.png'
    };

    let useImg = {
        7: 'materials/w_melon.png',
    };

    let tokImg = {
        32: 'materials/g_ring.png',
        168: 'materials/f_worm.png',
        1461: 'materials/e_worm.png',
        1642: 'materials/r_ring.png',
        4122: 'materials/leech.png'
    };

    // Display Order
    let matImg = {
        197: {
            rank: 599,
            img: '/saph.png'
        },
        199: {
            rank: 550,
            img: '/a_steel.png'
        },
        143: {
            rank: 499,
            img: '/topaz.png'
        },
        148: {
            rank: 450,
            img: '/orich.png'
        },
        149: {
            rank: 440,
            img: '/b_pearl.png'
        },
        92: {
            rank: 399,
            img: '/ruby.png'
        },
        93: {
            rank: 380,
            img: '/jadeite.png'
        },
        96: {
            rank: 350,
            img: '/d_ingot.png'
        },
        47: {
            rank: 299,
            img: '/amy.png'
        },
        2: {
            rank: 2,
            img: '/gems.png'
        },
        1: {
            rank: 1,
            img: '/coins.png'
        },
        0:  { rank: 0, img: '.png' },
        3:  { rank: 0, img: '/copper.png' },
        6:  { rank: 0, img: '/tin.png' },
        7:  { rank: 0, img: '/lumber.png' },
        8:  { rank: 0, img: '/iron.png' },
        9:  { rank: 0, img: '/coal.png' },
        11: { rank: 0, img: '/root.png' },
        19: { rank: 0, img: '/mushroom.png' },
        20: { rank: 0, img: '/apple.png' },
        21: { rank: 0, img: '/herb.png' },
        22: { rank: 0, img: '/stone.png' },
        29: { rank: 0, img: '/berry.png' },
        30: { rank: 0, img: '/sugar.png' },
        31: { rank: 0, img: '/flour.png' },
        32: { rank: 0, img: '/bronze.png' },
        33: { rank: 0, img: '/i_ore.png' },
        35: { rank: 0, img: '/r_fish.png' },
        91: { rank: 0, img: '/rice.png' },        
        94: { rank: 0, img: '/bamboo.png' },
        95: { rank: 0, img: '/a_scrap.png' },
        97: { rank: 0, img: '/shitake.png' },
        98: { rank: 0, img: '/eel.png' },
        99: { rank: 0, img: '/shale.png' },
        144: { rank: 0, img: '/seaweed.png' },                
        145: { rank: 0, img: '/marble.png' },        
        146: { rank: 0, img: '/lobster.png' },
        147: { rank: 0, img: '/v_ore.png' },
        181: { rank: 0, img: '/dill.png' },
        182: { rank: 0, img: '/c_fish.png' },
        193: { rank: 0, img: '/c_wood.png' },
        194: { rank: 0, img: '/olives.png' },
        195: { rank: 0, img: '/lemon.png' },
        196: { rank: 0, img: '/octopus.png' },
        198: { rank: 0, img: '/a_ore.png' }
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        tabID = id;
        return Promise.all(Object.keys(menu).reduce(function(items, key) {
            let show = menu[key];

            if (!show && localStorage.installType == 'development') {
                show = true;
                if (menu[key] === null)
                    show = self.isDev();
            }

            if (show === true) {
                items.push(new Promise((resolve, reject) => {
                    let script = document.createElement('script');
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
            let menu = document.getElementById('calc-menu');
            let card = document.getElementById('calc-menu-card');

            loaded.forEach(function(item, idx) {
                if (typeof self.tabs.Calculators.menu[item.key] === 'object') {
                    let id = 'calc-item-' + item.key;
                    let li = document.createElement('li');
                    let a = document.createElement('a');
                    let span = document.createElement('span');
                    let div = document.createElement('div');

                    a.id = id;
                    a.setAttribute('href', '#');
                    a.addEventListener('click', menuClicked);

                    a.appendChild(span);
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
                    span.innerHTML = guiString(self.tabs.Calculators.menu[item.key].title);

                    if (self.tabs.Calculators.menu[item.key].image) {
                        let img = document.createElement('img');
                        a.appendChild(img);
                        img.setAttribute('src', '/img/' + self.tabs.Calculators.menu[item.key].image);
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
        let id = e.target.id;
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
        let devMsg = document.getElementById('calcDevOnly');

        if (!self.tabs.Calculators.menu.hasOwnProperty(id)) {
            id = Object.keys(self.tabs.Calculators.menu)[0];
        }

        if (self.tabs.Calculators.menu.hasOwnProperty(active)) {
            self.tabs.Calculators.menu[active].nav.classList.remove('active');
            self.tabs.Calculators.menu[active].html.style.display = 'none';
            devMsg.style.display = 'none';
        }

        self.tabs.Calculators.menu[id].nav.classList.add('active');
        self.tabs.Calculators.menu[id].html.style.display = 'block';

        if ((localStorage.installType == 'development') && !menu[id]) {
            devMsg.innerText = guiString(menu[id] === null ? 'devOnly' : 'tstOnly');
            devMsg.style.display = 'block';
        }

        if (active != id) {
            self.tabs[tabID].content = self.tabs.Calculators.menu[id].html;
            self.tabs[tabID].time = null;
            active = id;
            if (self.active() == tabID)
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

        if ((!bgp.daGame.daUser) || !bgp.daGame.daUser.player || !bgp.daGame.daLevels || !bgp.daGame.daMaterials) {
            guiStatus('errorData', 'ERROR', 'error');
            return false;
        }

        if (self.tabs.Calculators.menu.hasOwnProperty(active)) {
            document.getElementById('calcAlert').style.display = 'none';
            self.tabs.Calculators.menu[active].html.style.display = 'block';
            if (self.tabs.Calculators.menu[active].hasOwnProperty('onUpdate')) {
                try {
                    let promise = self.tabs.Calculators.menu[active].onUpdate(active, reason);

                    if (typeof promise !== 'undefined') {
                        if ((promise !== 'undefined') && !!promise.then && typeof promise.then === 'function') {
                            let ok = promise.catch(function(error) {
                                self.calcError(error);
                            }).then(function(status) {
                                return status;
                            });
                            return true;
                        }
                        return promise;
                    }
                } catch (error) {
                    self.calcError(error);
                }
            }
        }

        return true;
    }

    /*
     ** @Public - Show Error
     */
    self.calcError = function(error) {
        console.error(error);
        if (typeof error !== 'string') {
            error = error.message;
        }
        self.tabs.Calculators.menu[active].html.style.display = 'none';
        document.getElementById('calcText').innerHTML = error;
        document.getElementById('calcAlert').style.display = 'block';
    }

    /*
     ** @Public - Get Region Name (if any)
     */
    self.regionName = function(rid, events = false, ids = false) {
        nids = {
            0: 'Events', // Events
            1: 'MAP005', // EGYPT
            2: 'MAP006', // SCANDINAVIA
            3: 'MAP018', // CHINA
            4: 'MAP021', // ATLANTIS
            5: 'MAP038' // GREECE
        };

        if (rid == 0 && !ids) {
            if (events)
                return guiString('Events').toUpperCase();
        } else if (nids.hasOwnProperty(rid))
            return (ids ? nids[rid] : bgp.daGame.string(nids[rid]));
        return null;
    }

    /*
     ** @Public - Get Region Image (if any)
     */
    self.regionImage = function(rid, forceEgypt = false, size = 16) {
        if (rid == 0 && forceEgypt)
            rid = 1;

        if (rid >= 0 && rid <= bgp.daGame.maxRegions()) {
            let name = self.regionName(rid, !forceEgypt);

            return '<img src="/img/regions/' +
                rid + '.png" width="' + size + '" height="' + size + '"' +
                (name ? ' title="' + name + '"' : '') + '/>';
        }
        return '<img src="/img/blank.gif" title="' + rid + '"/>';
    }

    /*
     ** @Public - Get Region Image Source (if any)
     */
    self.regionImgSrc = function(rid, forceEgypt = false) {
        if (rid == 0 && forceEgypt)
            rid = 1;
        if (rid >= 0 && rid <= bgp.daGame.maxRegions())
            return '/img/regions/' + rid + '.png';
        return '/img/blank.gif';
    }

    /*
     ** @Public - Get Object Display Order
     */
    self.objectOrder = function() {
        return objOrder;
    }

    /*
     ** @Public - Get Object Rank
     */
    self.objectRank = function(typ, oid, ord = 0) {
        if (typ == 'material') {
            if (!!matImg[oid]) {
                if (matImg[oid].rank > 0)
                    return 0 - matImg[oid].rank;
            }
        }

        return ord;
    }

    /*
     ** @Public - Get Object Name
     */
    self.objectName = function(type, oid) {
        let text = null;

        switch (type) {
            case 'artifact':
                return self.artifactName(oid);
            case 'tablet':
                return self.tabletName(oid);
            case 'token':
                return self.tokenName(oid);
            case 'usable':
                return self.usablesName(oid);
            case 'material':
                return self.materialName(oid);
            case 'building':
                text = 'campEquipment';
                break;
            case 'chest':
                text = 'treasurePiece';
                break;
            case 'system':
                if (oid == 1)
                    text = 'bonusXP';
                if (oid == 2)
                    text = 'bonusEnergy';
                break;
        }

        if (text !== null)
            return bgp.daGame.i18n(text).replace(/[\n\r]/g, ' ').toUpperCase();
        return '?' + type + '-' + oid + '?';
    }

    /*
     ** @Public - Get Object Image
     */
    self.objectImage = function(type, oid, size = 16) {
        let img = null;

        switch (type) {
            case 'artifact':
            case 'chest':
                img = 'chest.png';
                break;
            case 'usable':
                img = 'usable.png';
                if (useImg.hasOwnProperty(oid))
                    img = useImg[oid];
                break;
            case 'token':
                img = 'token.png';
                if (tokImg.hasOwnProperty(oid))
                    img = tokImg[oid];
                break;
            case 'system':
                img = sysImg[oid];
                break;
            case 'material':
                if (typeof bgp.daGame.daMaterials[oid] !== 'undefined') {
                    if (bgp.daGame.daMaterials[oid].eid != 0)
                        oid = 0;
                }
                img = matImg[oid];
                if ((img) && img !== 'undefined') {
                    img = 'materials' + img.img;
                }
                break;
        }

        if ((img) && img !== 'undefined') {
            let name = (oid != 0 ? self.objectName(type, oid) : null);
            return '<img src="/img/' + img + '" width="' + size + '" height="' + size + '"' +
                (name ? ' title="' + name + '"' : '') + '/>';
        }

        return '<img src="/img/blank.gif" />';
    }

    /*
     ** @Public - Get Artifact Name
     */
    self.artifactName = function(aid) {
        if ((bgp.daGame.daUser) && bgp.daGame.daArtifacts) {
            if (bgp.daGame.daArtifacts.hasOwnProperty(aid)) {
                if (bgp.daGame.daArtifacts[aid].nid === null) {} else
                    return bgp.daGame.string(bgp.daGame.daArtifacts[aid].nid);
            }
        }
        return 'artifact-' + aid;
    }
    /*
     ** @Public - Get Tablet Name
     */
    self.tabletName = function(tid) {
        if ((bgp.daGame.daUser) && bgp.daGame.daTablets) {
            if (bgp.daGame.daTablets.hasOwnProperty(tid)) {
                let nid = bgp.daGame.daTablets[tid].nid;
                if (nid === null) {} else
                    return bgp.daGame.string(nid);
            }
        }
        return 'tablet-' + tid;
    }

    /*
     ** @Public - Get Token Name
     */
    self.tokenName = function(tid) {
        if ((bgp.daGame.daUser) && bgp.daGame.daTokens) {
            if (bgp.daGame.daTokens.hasOwnProperty(tid)) {
                let nid = bgp.daGame.daTokens[tid].nid;
                if (nid === null || nid == 'vstup') {
                    return null;
                } else
                    return bgp.daGame.string(nid);
            }
        }
        return 'token-' + tid;
    }

    /*
     ** @Public - Get Usable Name
     */
    self.usablesName = function(uid) {
        if ((bgp.daGame.daUser) && bgp.daGame.daUsables) {
            if (bgp.daGame.daUsables.hasOwnProperty(uid)) {
                if (bgp.daGame.daUsables[uid].nid === null) {} else
                    return bgp.daGame.string(bgp.daGame.daUsables[uid].nid);
            }
        }
        return 'usable-' + uid;
    }

    /*
     ** @Public - Get Material Name
     */
    self.materialName = function(mid) {
        if ((bgp.daGame.daUser) && bgp.daGame.daMaterials) {
            if (bgp.daGame.daMaterials.hasOwnProperty(mid))
                if (bgp.daGame.daMaterials[mid].nid == null) {} else
                    return bgp.daGame.string(bgp.daGame.daMaterials[mid].nid);
        }
        return 'material-' + mid;
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

    /*
     ** @Public - Check Mine is valid for user
     */
    self.mineValid = function(mine, incRepeat = true) {
        let uidTUT = intOrDefault(bgp.daGame.daUser.tutorial_def_id, 1);
        let good = !isBool(mine.tst);
        let tut = bgp.daGame.mineTutorial(mine);

        if ((good && !!tut) && tut != uidTUT)
            good = false;
        if (good && mine.cdn != 0 && !incRepeat)
            good = false;
        return good;
    }
 
    /*
     ** @Public - Mine Type ICON
     */
    self.mineImage = function(mine, size = 24) {
        let img = 'blank.gif';

        if (typeof mine === 'string') {
            img = mine;
        } else if (!mine.tut > 0) {
            if (mine.cdn > 0) {
                img = 'repeat.png';
            } else if (mine.isXLO) {
                if (mine.eid != 0) {
                    //img = 'q-hard.png';
                    img = '!LVL!.png';                    
                } else
                    img = 'q-side.png';
            } else
                img = 'q-main.png';
        } else
            img = 'tutorial.png';

        return ('<img width="' + size + '" src="/img/' + img + '" />');
    }

    /*
     ** @Public - Map Image
     */
    self.mapImage = function(id) {
        return '<img src="/img/map.png"/>';
    }

    /*
     ** @Public - Map Name
     */
    self.mapName = function(id) {
        if (bgp.daGame.daFilters) {
            if (bgp.daGame.daFilters.hasOwnProperty(id)) {
                let filter = bgp.daGame.daFilters[id];
                if (!filter.hasOwnProperty('name')) {
                    filter.name = bgp.daGame.string(filter.nid);
                }
                return filter.name;
            }
        }
        return null;
    }

    /*
     ** @Public - Calculate (Unix) Time Duration
     */
    self.duration = function(drn, txt = false) {
        let mm = Math.floor((drn / 60) % 60);
        let hh = Math.floor((drn / (60 * 60)) % 24);
        let dd = Math.floor(drn / (60 * 60 * 24));

        if (txt) {
            if (mm == 0) {
                if (dd == 0 && hh != 0)
                    return chrome.i18n.getMessage('Hours', [hh]);
                if (dd != 0)
                    return chrome.i18n.getMessage('Days', [dd]);
            }
        }

        return ((dd) ? dd + 'd:' : '') +
            (hh < 10 ? '0' : '') + parseInt(hh) + 'h:' +
            (mm < 10 ? '0' : '') + parseInt(mm) + 'm';
    }

    self.isDev = function() {
        let uids = [3951243, 11530133, 8700592, 583351, 11715879, 1798336];

        if ((bgp.daGame.daUser) && bgp.daGame.daUser.hasOwnProperty('player'))
            return (uids.indexOf(parseInt(bgp.daGame.daUser.player.uid)) !== -1)

        return false;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/