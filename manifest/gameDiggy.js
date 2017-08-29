/*
 ** DA Friends - gameDiggy.js
 */
(function() {
    'use strict';

    /*
     ** Initialization Method
     */
    var gameDiggy = function() {
        // Private
        var collect = exPrefs.autoData;
        var working = false;
        var handlers = {};

        /*
         ** Public Methods (and propertys)
         */
        var __public = {
            player_id: 0,
            site: null,
            init: function(parent) {
                parent.__public = this;
                this.callBack();
                // TODO - See syncData() below, may not need/want this
                //if (exPrefs.trackGift)
                //syncScript();
                delete this.init;
                return this;
            }
        };

        /*********************************************************************
         ** @Public - Set any user supplied callback
         */
        var callback = null;

        __public.callBack = function(callme = null) {
            if (typeof callme === 'function') {
                callback = callme;
            } else {
                callback = function(action = null, text = null, file = null) {
                    if (exPrefs.debug) console.log("CB:", action, text, file);
                    chrome.extension.sendMessage({
                        cmd: action,
                        text: text,
                        file: file
                    });
                    switch (action) {
                        case 'gameLoading':
                            chrome.browserAction.setIcon({
                                path: "/img/iconGrey.png"
                            });
                            break;
                        case 'dataLoading':
                        case 'dataStart':
                            chrome.browserAction.setIcon({
                                path: "/img/iconBlue.png"
                            });
                            break;
                        case 'dataDone':
                            var icon = 'iconRed.png';
                            if (__public.hasOwnProperty('daUser')) {
                                if (__public.daUser.hasOwnProperty('result')) {
                                    switch (__public.daUser.result) {
                                        case 'OK':
                                            icon = 'iconGreen.png';
                                            break;
                                        case 'CACHED':
                                            icon = 'icon.png';
                                            break;
                                        case 'EMPTY':
                                            icon = 'iconGrey.png';
                                            break;
                                        default:
                                            icon = 'iconRed.png';
                                            break;
                                    }
                                }
                            }
                            chrome.browserAction.setIcon({
                                path: "/img/" + icon
                            });
                            break;
                        case 'dataError':
                            chrome.browserAction.setIcon({
                                path: "/img/iconRed.png"
                            });
                            break;
                        default:
                            break;
                    }
                };
            }
        }

        /*********************************************************************
         ** @Public - Get i18n String
         */
        __public.i18n = function(string, subs = null) {
            var text = '';

            if (typeof string === 'string') {
                text = chrome.i18n.getMessage(string, subs);
                if (!text) {
                    if (exPrefs.debug) {
                        console.warn("Missing i18n", string);
                        console.trace();
                    }
                    return string;
                }
            }
            return text;
        }

        /*********************************************************************
         ** @Public - Get a Game String
         */
        __public.string = function(string) {
            var lang = getLangKey();

            try {
                if ((__public.hasOwnProperty(lang)) && __public[lang] !== null) {
                    if (__public[lang].hasOwnProperty(string))
                        return __public[lang][string];
                    console.warn("Missing Game String", lang, string);
                    if (exPrefs.debug) console.trace();
                }
            } catch (e) {
                console.error(e);
            }
            if ((lang = chrome.i18n.getMessage(string)))
                return lang;
            return string;
        }

        /*********************************************************************
         ** @Public - Force a game reload and data capture
         */
        __public.reload = function() {
            chrome.tabs.query({}, function(tabs) {
                var url, site, daSite, daTab = 0;

                for (var i = tabs.length - 1; i >= 0; i--) {
                    url = tabs[i].url;
                    if ((site = isGameURL(url))) {
                        daTab = tabs[i].id;
                        daSite = site;
                        if (site == exPrefs.gameSite) {
                            if (exPrefs.debug) console.log("Found Prefered", exPrefs.gameSite);
                            break;
                        }
                    } else if (exPrefs.gameSite == 'portal') {
                        url = urlObject({
                            'url': url
                        });
                        if (url.host == 'portal.pixelfederation.com') {
                            daTab = tabs[i].id;
                            daSite = false;
                            break;
                        }
                    }
                }

                if (exPrefs.debug) console.log("Force Reload", daTab, daSite);

                gameData = true; // Mark for forced data capture
                badgeStatus();
                if (!daTab) {
                    chrome.tabs.create({
                        active: true,
                        url: reloadURL(exPrefs.gameSite)
                    }, function(tab) {
                        gameData = true;
                    });
                } else if (daTab && daSite) {
                    chrome.tabs.reload(daTab);
                } else if (daTab)
                    chrome.tabs.update(daTab, {
                        active: true,
                        url: reloadURL(exPrefs.gameSite)
                    }, function(tab) {
                        gameData = true;
                    });
            });
        }

        function reloadURL(site) {
            if (!site)
                site = 'facebook';
            var location = gameUrls[site];
            location = location.replace("/*", "");
            location = location.replace("*", "");
            return location;
        }

        /*********************************************************************
         ** @Public - Send a notification to the GUI
         */
        __public.notification = function(action = null, text = null, file = null) {
            return callback.call(this, action, text, file);
        }

        /*********************************************************************
         ** @Public - Test Data
         */
        __public.testData = function() {
            if (!working) {
                __public.site = 'test';
                chrome.browserAction.setIcon({
                    path: "/img/iconBlue.png"
                });
                http.get.xml(chrome.extension.getURL('test_data.xml'))
                    .then(__public.processXml)
                    .then(function(success) {
                        if (exPrefs.debug) {
                            console.log("Test Data Success:", success);
                            chrome.storage.local.getBytesInUse(null, function(info) {
                                info = numberWithCommas(info);
                                if (exPrefs.debug) console.log("Storage Used", info, "out of", storageSpace);
                                chrome.storage.local.get(null, function(loaded) {
                                    if (exPrefs.debug) console.log("storage.local", loaded, __public);
                                });
                            });
                        }
                    });
            }
        };

        /*********************************************************************
         ** @Public - Re-sync Cached Game Data
         */
        __public.cacheSync = function() {
            if (__public.daUser.result == 'OK') {
                if (exPrefs.debug) console.log("Sync Cache");

                //chrome.storage.local.remove('daUser');

                // Is this still causing issues with gifting?
                //__public.daUser.time = getUnixTime();
                chrome.storage.promise.local.set({
                    daUser: __public.daUser
                }).then(function(status) {
                    callback.call(this, 'dataSync');
                });
            }
        }

        /*********************************************************************
         ** @Public - Clear Cached Game Data
         */
        __public.cacheClear = function(all = false) {
            var langKey = 'daLang_' + exPrefs.gameLang.toUpperCase();
            chrome.storage.local.remove('daFiles');
            chrome.storage.local.remove(langKey);
            chrome.storage.local.remove(Object.keys(gameFiles));
            if (all) {
                chrome.storage.local.remove('daUser');
                __public.daUser = {
                    result: 'EMPTY',
                    desc: 'Cache Cleared',
                    time: getUnixTime(),
                    site: __public.i18n('None'),
                    lang: exPrefs.gameLang.toUpperCase()
                };
            }

            if (__public.hasOwnProperty('daUser'))
                callback.call(this, 'dataDone');
        }

        /*********************************************************************
         ** @Public - Get Cached Game User Data
         */
        __public.cachedData = function(reloadFiles = false) {
            if (exPrefs.debug) console.groupCollapsed("Data Cache");
            if (exPrefs.debug) console.log("Load Cached Data");

            callback.call(this, 'dataStart', 'gameGetData');
            return chrome.storage.promise.local.get(null)
                .then(function(data) {
                    data = data || {};

                    // pack data
                    var keysToRemove = [],
                        dataToSet = {};

                    // friends
                    __public.friendsCollectDate = data.friendsCollectDate || null;
                    __public.friends = {};
                    // old friends array
                    if (data.friends instanceof Array) {
                        keysToRemove.push('friends');
                        data.friends.forEach(friend => {
                            friend.name = friend.realFBname;
                            delete friend.realFBname;
                            __public.friends[friend.fb_id] = dataToSet['fb-' + friend.fb_id] = friend;
                        });
                    }

                    let lang = (((data.daUser) && data.daUser.lang) ? data.daUser.lang : exPrefs.gameLang);
                    lang = 'daLang_' + lang.toUpperCase();

                    Object.keys(data).forEach(key => {
                        var i = key.indexOf('-');
                        if (i > 0) {
                            var type = key.substr(0, i),
                                id = key.substr(i + 1),
                                value = data[key];
                            switch (type) {
                                case 'fb':
                                    __public.friends[id] = value;
                                    break;
                            }
                        } else if ((key != 'daUser') && key.startsWith('da')) {
                            if (reloadFiles || ((key != lang && key != 'daFiles') && !gameFiles.hasOwnProperty(key))) {
                                if (exPrefs.debug) console.log('Remove Redundant Cached Data:', key, reloadFiles);
                                keysToRemove.push(key);
                                delete data[key];
                            }
                        }
                    });
                    // // filter ex friends
                    // if (!__public.isExFriendsEnabled) {
                    //     Object.keys(__public.friends).forEach(fb_id => {
                    //         if (__public.friends[fb_id].ex) {
                    //             delete __public.friends[fb_id];
                    //             keysToRemove.push('fb-' + fb_id);
                    //         }
                    //     });
                    // }
                    // daUser
                    __public.daUser = data.daUser || gameUser;
                    if (keysToRemove.length > 0) chrome.storage.local.remove(keysToRemove);
                    if (Object.keys(dataToSet).length > 0) chrome.storage.local.set(dataToSet);

                    if (exPrefs.debug) {
                        console.log("Cached Data", data);
                        chrome.storage.local.getBytesInUse(null, function(info) {
                            info = numberWithCommas(info);
                            console.log("Storage Used", info, "out of", storageSpace);
                        });
                    }

                    if (__public.daUser.result == 'OK') {
                        __public.daUser.result = "CACHED";
                        __public.site = __public.daUser.site;
                        __public.player_id = 0;
                        if (__public.daUser.player !== null)
                            __public.player_id = __public.daUser.player.uid;
                        if (__public.player_id <= 1)
                            console.error("Cached UID seems to be invalid!");
                        return loadGameFiles( /*reloadFiles*/ );
                    }
                    return false;
                }, function(error) {
                    __public.daUser = gameUser;
                    __public.daUser.result = "EMPTY";
                    return false
                }).then(function(success) {
                    if (success) {
                        callback.call(this, 'dataDone');
                    } else {
                        __public.daUser.result = "EMPTY";
                        callback.call(this, 'dataDone');
                    }
                    lockProperty(__public, "daUser");

                    if (exPrefs.debug) {
                        console.log("Data Set", __public)
                        chrome.storage.local.getBytesInUse(null, function(info) {
                            info = numberWithCommas(info);
                            console.log("Storage Used", info, "out of", storageSpace);
                            console.groupEnd("Data Cache");
                        });
                    }

                    if (exPrefs.debug) console.groupEnd("Data Cache");
                });
        }

        /*********************************************************************
         ** Friends accessors & methods
         */
        __public.getFriends = function() {
            return __public.friends;
        };
        __public.getFriend = function(id) {
            return __public.friends[id];
        };
        __public.setFriend = function(friendsOrArray, callback) {
            var arr = friendsOrArray instanceof Array ? friendsOrArray : [friendsOrArray];
            var data = {};
            arr.forEach(friend => {
                data['fb-' + friend.fb_id] = friend;
            });
            chrome.storage.local.set(data, callback);
        };
        __public.setFriends = function(callback) {
            __public.setFriend(Object.values(__public.friends), callback);
        };
        __public.removeFriend = function(friendsOrArray, callback) {
            var arr = friendsOrArray instanceof Array ? friendsOrArray : [friendsOrArray];
            arr.forEach(friend => {
                delete __public.friends[friend.fb_id];
            });
            var keys = arr.map(friend => 'fb-' + friend.fb_id);
            chrome.storage.local.remove(keys, callback);
        };
        __public.friendsCaptured = function(mode, data) {
            var newFriends = data instanceof Array ? data : [];
            if (exPrefs.debug) console.log("Friends captured", newFriends.length);
            if (newFriends.length == 0) return;
            var oldFriends = Object.assign({}, __public.getFriends());
            var friends = {};
            // We retain the old association (score and uid)
            newFriends.forEach(friend => {
                var oldFriend = oldFriends[friend.fb_id];
                if (oldFriend) {
                    friend.score = oldFriend.score;
                    friend.uid = oldFriend.uid;
                }
                delete oldFriends[friend.fb_id];
                friends[friend.fb_id] = friend;
            })
            // We remove all old friends
            var keysToRemove = [];
            Object.keys(oldFriends).forEach(fb_id => {
                keysToRemove.push('fb-' + fb_id);
            });
            if (keysToRemove.length) chrome.storage.local.remove(keysToRemove);
            __public.friendsCollectDate = getUnixTime();
            chrome.storage.local.set({
                friendsCollectDate: __public.friendsCollectDate
            });
            __public.friends = friends;
            __public.setFriends(function() {
                if (exPrefs.debug) console.log("Send friends-analyze");
                chrome.runtime.sendMessage({
                    cmd: 'friends-analyze'
                });
            });
        }

        /*********************************************************************
         ** @Public - getNeighbours
         */
        __public.getNeighbours = function() {
            if ((__public.hasOwnProperty('daUser')) && __public.daUser.hasOwnProperty('result')) {
                // Don't want cached data for GC collection as it could be stale
                if (__public.daUser.result == 'OK' || (__public.daUser.result == 'CACHED' && localStorage.installType == 'development'))
                    return __public.daUser.neighbours;
            }
            return {};
        }

        /*********************************************************************
         ** @Public - Load Game User (generator.php)
         */
        __public.gameData = function(url, form) {
            // Get from Web & Process it
            return http.post(url, 'text/xml', form).then(__public.processXml);
        }

        /*********************************************************************
         ** @Public - Game Sync Data (overridden by dynamic module)
         */
        __public.syncData = function(tabId, xml, syncData = null) {}

        /*********************************************************************
         ** @Private - Load Sync Script
         */
        function syncScript(params = null) {
            let promise = new Promise((resolve, reject) => {
                if (exPrefs.debug) console.log("Need Sync Script:", exPrefs.gameSync)
                if (exPrefs.gameSync && !window.hasOwnProperty('syncDiggy')) {
                    try {
                        if (exPrefs.debug) console.log("Load Sync Script")
                        var script = document.createElement('script');
                        script.onload = function() {
                            window.syncDiggy(__public);
                            resolve(params);
                        };
                        script.onerror = function(e) {
                            throw Error(e);
                        };
                        script.src = "syncDiggy.js";
                        document.head.appendChild(script);
                        script = null;
                    } catch (e) {
                        console.error(e);
                        window['syncDiggy'] = false;
                        delete window.SyncDiggy;
                        resolve(params);
                    }
                } else {
                    if (exPrefs.debug) console.log("Got Sync Script")
                    resolve(params);
                }
            });
            return promise;
        }

        /*********************************************************************
         ** @Private - Process Game User
         */
        var gameUser = {
            site: null,
            lang: exPrefs.gameLang,
            time: null,
            desc: null,
            result: "EMPTY", // Don't change the order of these!

            access: null,
            name: null,
            surname: null,
            config_id: null,
            gender: null,
            country: null,
            region: null,
            loc_id: null,
            loc_floor: null,
            level: null,
            exp: null,
            camp_set: null,
            windmill_limit: null,
            login_count: null,
            dr_time: null,
            dr_tz_offset: null,
            static_root: null,
            cdn_root: null,

            neighbours: null,
            un_gifts: null, // This MUST follow the neighbours
            f_actions: null,

            loc_prog: null,
            camp: null,
            materials: null,
            stored_windmills: null,
            stored_buildings: null,
            stored_decorations: null,
            anvils: null,
            alloys: null,
            caravans: null,
            destinations: null,
            children: null,
            pots: null,
            pot_recipes: null,
            events: null,
            tokens: null,
            file_changes: null,
            recipients: null,
            //equip: null,
            //rated: null,
            //rated_date: null,
            //revenue: null,
            //currency: null,
            //payment_count: null,
            //last_payment: null,
        };

        /*
         ** @Public - Process generator.xml
         */
        __public.processXml = function(xml) {

            let promise = new Promise((resolve, reject) => {

                if (working)
                    return false;
                working = true;

                if (exPrefs.debug) console.groupCollapsed("Game Data");
                if (exPrefs.debug) console.log("Processing Started");
                callback.call(this, 'dataStart', 'gameParsing');

                if (!(__public.hasOwnProperty('daUser'))) {
                    Object.defineProperty(__public, "daUser", {
                        value: {},
                        writable: false,
                        configurable: true
                    });
                }

                parse(xml).then(chrome.storage.promise.local.set)
                    .catch(function(error) {
                        // Log but skip ahead
                        if (exPrefs.debug) console.log("Caught Error", error);
                        return false;
                    })
                    .then(function() {
                        if (exPrefs.debug) console.log("Result:", __public.daUser.result, __public.daUser.desc);
                        if (__public.daUser.result == 'OK') {
                            __public.daUser.site = __public.site;
                            if (__public.daUser.player === null) {
                                __public.daUser.result = 'ERROR';
                                __public.daUser.desc = __public.i18n('errorYou');
                                return false;
                            }
                            //return loadGameFiles();
                            return loadGameConfig();
                        } else
                            return false;
                    })
                    .catch(function(error) {
                        // Log but skip ahead
                        if (exPrefs.debug) console.log("Caught Error", error);
                        return false;
                    })
                    .then(function(success) {
                        Object.defineProperty(__public, "daUser", {
                            writable: false,
                            configurable: true
                        });

                        if (success && __public.daUser.result == 'OK') {
                            callback.call(this, 'dataDone');
                        } else {
                            callback.call(this, 'dataError', 'gameError');
                            success = false;
                        }

                        if (exPrefs.debug) console.log("Processing Finished", success, __public.daUser);
                        if (exPrefs.debug) console.groupEnd("Game Data");
                        chrome.storage.local.getBytesInUse(null, function(info) {
                            info = numberWithCommas(info);
                            if (exPrefs.debug) console.log("Storage Used", info, "out of", storageSpace);
                        });
                        working = false;

                        gameSniff = gameData = false;
                        badgeStatus();
                        resolve(success);
                    })
                    .then(syncScript);
            });

            return promise;
        }

        /*
         ** @Public - Inject game tab/frame
         */
        __public.inject = function(daTab) {
            if (!daTab) {
                chrome.tabs.query({}, function(tabs) {
                    var found = false;
                    for (var i = 0; i < tabs.length; i++) {
                        if (isGameURL(tabs[i].url)) {
                            if (exPrefs.debug) console.log('Found game tab', tabs[i].id, 'to inject');
                            __public.inject(tabs[i].id);
                            found = true;
                            break;
                        }
                    }
                    if (!found)
                        console.error('did not find DA tab but asked to inject');
                });

                return;
            }

            if (exPrefs.debug) console.log('injecting game tab', daTab);

            chromeMultiInject(daTab, {
                file: [
                    '/manifest/content_common.js',
                    '/manifest/content_tab.js'
                ],
                allFrames: false,
                frameId: 0
            });

            chrome.webNavigation.getAllFrames({
                tabId: daTab
            }, function(frames) {
                var frameId = 0;
                for (var i = 0; i < frames.length; i++) {
                    if (frames[i].parentFrameId == 0 && frames[i].url.includes('/miner/')) {
                        if (frameId == 0) {
                            if (exPrefs.debug) console.log('found frame', frames[i]);
                            frameId = frames[i].frameId;
                        } else {
                            console.error('Duplicate miner frame ids?', frameId, frames[i].frameId);
                            frameId = -1;
                        }
                    }
                }
                if (frameId <= 0) {
                    console.error('No unique miner frame id?');
                } else {
                    if (exPrefs.debug) console.log('Injecting content_da.js into ', daTab, '/', frameId);
                    chromeMultiInject(daTab, {
                        file: [
                            '/manifest/content_common.js',
                            '/manifest/content_da.js'
                        ],
                        allFrames: false,
                        frameId: frameId
                    });
                }
            });
        }

        /*
         ** @Private - Parse generator.xml Document
         */
        function parse(xml) {
            let promise = new Promise((resolve, reject) => {
                chrome.browserAction.setIcon({
                    path: "/img/iconBlue.png"
                });
                if (exPrefs.debug) console.log("Parse", xml)
                try {
                    if ((xml) && xml !== 'undefined' && xml !== null) {
                        if (xml.documentElement.hasChildNodes()) {

                            for (var tag in gameUser) {
                                var dataFunc = '__gameUser_' + tag;
                                var tree = xml.getElementsByTagName(tag);
                                var node;

                                if ((typeof tree === "undefined") || tree.length == 0) {
                                    switch (tag) {
                                        case 'site':
                                            __public.daUser.site = __public.site;
                                            break;
                                        case 'lang':
                                            __public.daUser.lang = __public.lang;
                                            break;
                                        default:
                                            if (exPrefs.debug) console.log(tag, "Tag Not Found");
                                            __public.daUser[tag] = null;
                                            break;
                                    }
                                    continue;
                                }

                                if (tree.length == 1) {
                                    node = tree[0];
                                    if (typeof node === "undefined")
                                        continue;

                                    if (node.childNodes.length > 1) {
                                        if (typeof handlers[dataFunc] === "function") {
                                            try {
                                                __public.daUser[tag] = handlers[dataFunc].call(this, tag, node);
                                            } catch (e) {
                                                throw Error(dataFunc + '() ' + e.message);
                                            }
                                        } else {
                                            __public.daUser[tag] = XML2jsobj(node);
                                            if (__public.daUser[tag].hasOwnProperty('item'))
                                                __public.daUser[tag] = __public.daUser[tag].item;
                                        }
                                    } else {
                                        if (typeof handlers[dataFunc] === "function") {
                                            try {
                                                __public.daUser[tag] = handlers[dataFunc].call(this, tag, node);
                                            } catch (e) {
                                                throw Error(dataFunc + '() ' + e.message);
                                            }
                                        } else
                                            __public.daUser[tag] = node.textContent;
                                    }
                                } else {
                                    __public.daUser[tag] = null;

                                    for (var n = 0; n < tree.length; n++) {
                                        if ((tree[n].parentNode === null) || tree[n].parentNode.nodeName != 'xml')
                                            continue;

                                        if (tree[n].childElementCount != 0) {
                                            node = XML2jsobj(tree[n]);
                                        } else
                                            node = tree[n].textContent;

                                        if (typeof handlers[dataFunc] === "function") {
                                            try {
                                                handlers[dataFunc].call(this, tag, node);
                                            } catch (e) {
                                                throw Error(dataFunc + '() ' + e.message);
                                            }
                                        } else if (__public.daUser[tag] !== null) {
                                            if (__public.daUser[tag].constructor != Array)
                                                __public.daUser[tag] = [__public.daUser[tag]];
                                            __public.daUser[tag].push(node);
                                        } else
                                            __public.daUser[tag] = node;
                                    }
                                }
                            }

                            if (__public.daUser.result != 'ERROR') {
                                // Basic sanity check on the data
                                if ((__public.daUser.cdn_root !== null &&
                                        __public.daUser.neighbours !== null)) // Then OK
                                    __public.daUser.result = 'OK';
                                else
                                    throw Error(__public.i18n("gameBadData"));
                                if (exPrefs.debug) console.log('ERIC derive()');
                                derive(__public.daUser);
                            }

                            chrome.storage.local.remove('daUser');
                            resolve({
                                daUser: __public.daUser
                            });
                            return;
                        }
                    }

                    throw Error(__public.i18n("gameBadData"));
                } catch (error) {
                    __public.daUser.result = 'ERROR';
                    __public.daUser.desc = error.message;
                    reject(error);
                }
            });
            return promise;
        }

        /*
         ** @Private - Parse Game User Backpack
         */
        handlers['__gameUser_tokens'] = __itemQtys;
        handlers['__gameUser_materials'] = __itemQtys;
        handlers['__gameUser_stored_windmills'] = __itemQtys;
        handlers['__gameUser_stored_buildings'] = __itemQtys;
        handlers['__gameUser_stored_decorations'] = __itemQtys;

        function __itemQtys(tag, node) {
            var data = {};

            if ((node = XML2jsobj(node)) !== null) {
                if ((typeof node === 'object') && node.hasOwnProperty('item')) {
                    for (var i = 0; i < node.item.length; i++) {
                        data[node.item[i].def_id] = node.item[i].amount;
                    }
                }
            }

            return data;
        }

        /*
         ** @Private - Parse Game File Changes
         */
        handlers['__gameUser_file_changes'] = function(tag, node) {
            var j = JSON.parse(node.textContent).file_changes;
            var data = {};
            setLangFile();

            if (exPrefs.debug) console.log('file_changes', j)

            for (var f in j) {
                let cached = false;

                for (var k in gameFiles) {
                    if (gameFiles[k] == j[f].file_path) {
                        data[k] = {
                            changed: Date.parse(j[f].file_modified),
                            expires: Date.parse(j[f].expire)
                        };

                        if (exPrefs.debug && 0) {
                            console.log(k, "changed", j[f].file_modified);
                            console.log(k, "expires", j[f].file_expire);
                        }

                        cached = true;
                        break;
                    }
                }

                // If file is not one we cache, then check to see if we still
                // want the file change details for dynamic game file loading
                //
                if (!cached) {
                    if (j[f].file_path.startsWith("xml/floors/floors_")) {
                        let file = j[f].file_path.split(/[_.]+/);
                        if (file.length == 3) {
                            let id = 'daF' + file[1];
                            if (!data.hasOwnProperty(id)) {
                                data[id] = {
                                    changed: Date.parse(j[f].file_modified),
                                    expires: Date.parse(j[f].expire)
                                };
                            }
                        }
                    } else if (j[f].file_path.startsWith("xml/maps/maps_")) {
                        if (0) { // Don't thik we need these, so ignore for now
                            let file = j[f].file_path.split(/[_.]+/);
                            if (file.length == 3) {
                                let id = 'daM' + file[1];
                                if (!data.hasOwnProperty(id)) {
                                    data[id] = {
                                        changed: Date.parse(j[f].file_modified),
                                        expires: Date.parse(j[f].expire)
                                    };
                                }
                            }
                        }
                    } else if ((j[f].file_path.endsWith(".xml")) && !j[f].file_path.endsWith("localization.xml")) {
                        data[j[f].file_path] = {
                            changed: Date.parse(j[f].file_modified),
                            expires: Date.parse(j[f].expire)
                        };
                    }
                }
            }

            return data;
        }

        /*
         ** @Private - Parse Game User Gifts
         */
        handlers['__gameUser_un_gifts'] = function(tag, node) {
            var data = {};

            if ((node = XML2jsobj(node)) !== null) {
                if ((typeof node === 'object') && node.hasOwnProperty('item')) {
                    node = node.item;
                    if (exPrefs.debug) console.groupCollapsed("un_gifts");
                    for (var n = 0; n < node.length; n++) {
                        var uid = node[n].sender_id;

                        if (__public.daUser.neighbours.hasOwnProperty(uid)) {
                            if ((exPrefs.trackGift) &&
                                __public.daUser.neighbours[uid].lastGift == 0 &&
                                __public.daUser.neighbours[uid].rec_gift == 0) {
                                if (exPrefs.debug) console.log("Force lastGift", __public.daUser.neighbours[uid]);
                                __public.daUser.neighbours[uid].lastGift = __public.daUser.time;
                            } else {
                                if (exPrefs.debug) console.log("Gift Waiting", __public.daUser.neighbours[uid]);
                            }
                        } else {
                            if (exPrefs.debug) console.log("Unexpected Gift", uid);
                        }

                        data[uid] = {};
                        data[uid].def_id = node[n].def_id;
                        data[uid].gift_id = node[n].gift_id;
                    }
                    if (exPrefs.debug) console.groupEnd("un_gifts");
                }
            }
            return data;
        }

        /*
         ** @Private - Parse Game Users Neighbours
         */
        handlers['__gameUser_neighbours'] = function(tag, node) {
            var data = {},
                cache = __public.daUser.neighbours;
            if (cache === null || typeof cache !== 'object')
                cache = {};

            node = XML2jsobj(node).item;
            __public.daUser.neighbours = {};
            __public.daUser.newNeighbours = 0;
            __public.daUser.gotNeighbours = 0;
            __public.daUser.oldNeighbours = 0;
            __public.daUser.player = null;
            for (var n = 0; n < node.length; n++) {
                var save = {},
                    uid = node[n].uid,
                    fid = node[n].fb_id;

                if ((!__public.daUser.player) &&
                    ((__public.player_id == uid && uid > 1) ||
                        (__public.daUser.name == node[n].name &&
                            __public.daUser.surname == node[n].surname))) {
                    if (exPrefs.debug) console.log("Found Me", node[n]);
                    __public.daUser.player = node[n];
                    // Seems your own neighbour record can contain bad information!
                    __public.daUser.player.level = __public.daUser.level;
                    continue;
                } else if (cache.hasOwnProperty(uid)) {
                    __public.daUser.gotNeighbours = __public.daUser.gotNeighbours + 1;
                    save = cache[uid];
                    delete cache[uid];
                    if (save.level != node[n].level) {
                        save.lastLevel = save.level;
                        save.timeLevel = __public.daUser.time;
                    }

                    // Recent game outage led to all r_gift fields being zeroed
                    // so we will hold a copy of the last good r_gift field
                    var rec_gift = node[n].rec_gift = intOrZero(node[n].rec_gift);
                    if (rec_gift > save.lastGift)
                        save.lastGift = rec_gift;
                } else {
                    __public.daUser.newNeighbours = __public.daUser.newNeighbours + 1;
                    save = {
                        timeCreated: __public.daUser.time,
                        lastGift: intOrZero(node[n].rec_gift),
                        lastLevel: node[n].level,
                        timeLevel: __public.daUser.time
                    };
                }

                data[uid] = Object.assign(save, node[n]);
                data[uid].timeUpdated = __public.daUser.time;
                data[uid].neighbourIndex = n;
            }

            // Find any old Neighbours
            for (var n in cache) {
                __public.daUser.oldNeighbours = __public.daUser.oldNeighbours + 1;
            }
            // We will expose any old neighbours for the GUI, but not save/cache them
            // Once they are gone, they are gone, othrweise we keep building up storage
            // space. Myabe look at this again in the future - TODO
            //
            __public.daOldNeighbours = cache;
            if (exPrefs.debug) console.log("Old Neighbours!", __public.daUser.oldNeighbours, cache);

            return data;
        }

        function intOrZero(value) {
            value = parseInt(value);
            if (isNaN(value))
                return 0;
            return value;
        }

        /*
         ** @Private - Parse Game User Events
         */
        handlers['__gameUser_events'] = function(tag, event) {
            var data = {};

            if (__public.daUser[tag] === null)
                __public.daUser[tag] = new Object();
            if ((event !== null) && event.hasOwnProperty('event')) {
                event = event.event;
                var eid = event.def_id;
                delete event['def_id'];
                __public.daUser[tag][eid] = event;
            }
            // No return value
        }

        /*
         ** @Private - Parse Game Users Location Progress
         */
        handlers['__gameUser_loc_prog'] = function(tag, node) {
            if (__public.daUser[tag] === null)
                __public.daUser[tag] = new Object();
            __public.daUser[tag][node.id] = node;
            // No return value
        }

        // Derive data from the raw parsed information.
        // Note that as of 2017-07-08, a little bit of this is happening during the parsing.
        // The approach here moves derived data out of the parsed xml structure to keep the
        // bits which are directly from the xml separate from the bits which are inferred.
        // Additional derivation may happen on the various tabs pages so that it's easier to
        // develop (tabs can re-derive on reload w/o having to reload diggy)
        function derive(daUser) {
            if (!derivePrepare(daUser)) {
                return;
            }

            var seen = {};
            for (var n in daUser.neighbours) {
                if (n == 1 || !daUser.neighbours.hasOwnProperty(n)) {
                    continue;
                }
                seen[n] = true;
                if (!daUser.derived.neighbours.hasOwnProperty(n)) {
                    daUser.derived.neighbours[n] = {
                        present: [{
                            first: daUser.derived.time,
                            at: daUser.derived.time
                        }], // last: when not present
                        recGift: [], // array of { val: , first: , last: }; val may be 0
                        unGift: [], // array of { id: , at: }
                    };
                }
                derivePresence(daUser.derived.time, daUser.derived.neighbours[n], n);
                deriveRecGiftNeighbour(daUser, daUser.neighbours[n], daUser.derived.neighbours[n]);
                if (daUser.un_gifts.hasOwnProperty(n)) {
                    deriveUnGiftNeighbour(daUser, daUser.un_gifts[n], daUser.derived.neighbours[n]);
                }
            }
            daUser.derived.giftCount[daUser.derived.time] = daUser.un_gifts.length;
            derivePresenceOver(daUser.derived, seen);
            daUser.derived.snapshot.push(daUser.derived.time);
            daUser.derived.lastDerived = daUser.derived.time;

            var tmp = daUser.derived.error;
            delete daUser.derived.error;
            console.log('derived state', JSON.stringify(daUser.derived).length, 'bytes', daUser.derived);
            daUser.derived.error = tmp;
        }

        function derivePrepare(daUser) {
            if (!daUser) {
                console.error("Internal error daUser false");
                return false;
            }
            delete daUser.time_generator;
            if (!daUser.derived) {
                daUser.derived = {
                    neighbours: {}, // indexed by uid
                    snapshot: [],
                    clockOffset: [],
                    giftCount: {},
                };
            }
            if (!daUser.derived.giftCount) {
                // TODO: remove after 2018-01-01
                daUser.derived.giftCount = {};
            }
            var derived = daUser.derived;
            if (daUser.result != 'OK') {
                console.error('Last result', daUser.result, ' not OK');
                return false;
            }
            derived.time = parseInt(daUser.time);
            if (derived.snapshot.length > 0 && derived.snapshot[derived.snapshot.length - 1] == daUser.derived.time) {
                console.error('Already derived at unix timestamp', daUser.time, daUser.derived.time, daGame.daUser.time_generator_local, derived);
                return false;
            }
            // TODO: there is some path which never sees the generator request it complains
            // about duplicate debugger.  Reloading the extension cleared it, so no idea what
            // went wrong.
            if (!daUser.hasOwnProperty('time_generator_local')) {
                daUser.time_generator_local = 0;
            }
            derived.clockOffset.push({
                us: daUser.time_generator_local,
                them: derived.time
            });
            console.log('Deriving at them', derived.time, 'us', daUser.time_generator_local);
            return true;
        }

        function derivePresence(time, derivedN, n) {
            if (!derivedN.hasOwnProperty('present')) {
                console.error('Filling in present?')
                derivedN.present = [{
                    first: time,
                    at: time,
                    missing: true
                }];
            }
            var back = derivedN.present[derivedN.present.length - 1];
            if (back.last) { // reappeared
                console.log("reappeared", n, derivedN, time);
                derivedN.present.push({
                    first: time,
                    at: time
                });
            } else if (back.at <= time) {
                back.at = time;
            } else {
                console.error('time has gone backwards', time, '<', back.at);
            }
        }

        function derivePresenceOver(derived, seen) {
            for (var n in derived.neighbours) {
                if (!derived.neighbours.hasOwnProperty(n)) {
                    continue;
                }
                if (seen[n]) {
                    continue;
                }
                var present = derived.neighbours[n].present;
                if (present == null) {
                    console.error('have neighbour without present', n, derived.neighbours[n]);
                    continue;
                }
                var back = present[present.length - 1];
                if (!back) {
                    console.error('have present without back', derived.neighbours[n]);
                    continue;
                }
                if (back.last) {
                    continue;
                }
                back.last = back.at;
                delete back.at;
            }
        }

        function deriveRecGiftNeighbour(daUser, raw, derived) {
            var rec_gift = parseInt(raw.rec_gift);
            var newEnt = {
                val: rec_gift,
                first: daUser.derived.time,
                last: daUser.derived.time
            };
            if (derived.recGift.length == 0) {
                derived.recGift.push(newEnt);
                return;
            }
            var back = derived.recGift[derived.recGift.length - 1];
            if (back.val == rec_gift || // same value, extend the time range.
                (rec_gift == 0 && daUser.derived.time <= (back.val + 2 * 86400) && daUser.derived.time >= back.val)) {
                if (back.val != 0 && rec_gift == 0) {
                    // This is an upstream error, they are reporting rec_gift == 0 for someone
                    // who should still be within the 48 hour window and for which current time is after the val.
                    if (!back.upstreamWrongZero) {
                        back.upstreamWrongZero = 1;
                        back.firstWrongZero = daUser.derived.time;
                    } else {
                        back.upstreamWrongZero++;
                    }
                }

                if (back.last <= daUser.derived.time) {
                    back.last = daUser.derived.time;
                } else if (!back.localClockBackwards) {
                    back.localClockBackwards = 1;
                } else {
                    back.localClockBackwards++;
                }
            } else if (rec_gift > 0 && back.val > rec_gift) {
                // This is an upstream error, they are reporting a
                // new, valid gift (rec_gift > 0) with a timestamp
                // less than the largest one we've seen.
                back.brokenGift = {
                    at: daUser.derived.time,
                    val: rec_gift
                };
            } else { // new value
                derived.recGift.push(newEnt);
            }
            // keep ~3 months of data if someone gifts every day
            while (derived.recGift.length > 100) {
                derived.recGift.shift();
            }
        }

        function deriveUnGiftNeighbour(daUser, raw, derived) {
            var id = parseInt(raw.gift_id);
            if (derived.unGift.length > 0 && derived.unGift[derived.unGift.length - 1].id == id) {
                return; // already seen this one
            }
            derived.unGift.push({
                id: id,
                at: daUser.derived.time
            });

            while (derived.unGift.length > 100) {
                derived.unGift.shift();
            }
        }

        /*********************************************************************
         ** Game Files
         */
        var gameFiles = {
            daConfig: "xml/configs.xml",
            daLevels: "xml/levelups.xml",
            daRegion1: "xml/locations/locations_1.xml",
            daRegion2: "xml/locations/locations_2.xml",
            daRegion3: "xml/locations/locations_3.xml",
            daRegion4: "xml/locations/locations_4.xml",
            daRegion5: "xml/locations/locations_5.xml",
            daRegion0: "xml/locations/locations_0.xml",
            daFilters: "xml/map_filters.xml",
            daTiles: "xml/tiles.xml",
            daEvents: "xml/events.xml",
            daSpecials: "xml/special_weeks.xml",
            daProduce: "xml/productions.xml",
            daUsables: "xml/usables.xml",
            daTokens: "xml/tokens.xml",
            daArtifacts: "xml/artifacts.xml",
            daMaterials: "xml/materials.xml",

            //daRecipes: "xml/recipes.xml",             // Not Needed?
            //daBuildings :   "xml/buildings.xml"       // ToDo
        };

        function getLangKey() {
            let lang = __public.daUser.lang;
            if (!lang)
                lang = __public.daUser.lang = exPrefs.gameLang;
            return 'daLang_' + lang.toUpperCase();
        }

        function setLangFile() {
            // Make sure we only have one lang file
            for (var key in gameFiles) {
                if (key.indexOf("daLang") == 0)
                    delete gameFiles[key];
            }

            // Set Locale file for daUser.lang
            var lang = __public.daUser.lang;
            var langKey = null;
            var langURL = "localization/XML/$LANG$/localization.xml";
            //var langURL = "localization/CSV/$LANG$/localization.csv";

            if (!lang)
                lang = __public.daUser.lang = exPrefs.gameLang;
            langKey = 'daLang_' + lang.toUpperCase();
            gameFiles[langKey] = langURL.replace(/\$LANG\$/g, lang);
        }

        /*
         ** @Public - Load Game Files (called from GUI)
         */
        __public.loadGameExtra = function() {
            return loadGameFiles().catch(function(error) {
                callback.call(this, 'dataError', 'gameError');
                return false;
            });
        }

        /*
         ** Load Game config.xml File Only
         **
         ** The rest we can load from within the GUI
         */
        function loadGameConfig(forceReload = false) {
            return loadGameFiles(forceReload, ['daConfig']);
        }

        /*
         ** Load "cacheable" Game Files
         */
        function loadGameFiles(forceReload = false, loadList = null) {
            let promise = new Promise((resolve, reject) => {
                if (__public.daUser.result == 'CACHED')
                    setLangFile();

                chrome.storage.promise.local.get({
                        daFiles: {}
                    })
                    .then(function(lastSaved) {
                        return Promise.all(
                            Object.keys(gameFiles).map(function(key) {
                                let root = ((0) ? __public.daUser.static_root : __public.daUser.cdn_root);
                                let fileTimes = __public.daUser.file_changes;
                                let thisChanged = 0,
                                    thisExpires = 0;

                                if ((!loadList) || loadList.indexOf(key) !== -1) {
                                    if ((fileTimes) && fileTimes.hasOwnProperty(key)) {
                                        thisChanged = fileTimes[key].changed;
                                        thisExpires = fileTimes[key].expires;
                                    } else
                                        thisChanged = 1;

                                    if (forceReload)
                                        lastSaved.daFiles[key] = 0;

                                    return loadFile(root, key, lastSaved.daFiles[key], thisChanged, thisExpires);
                                }

                                return ({
                                    key: key,
                                    changed: false,
                                    time: lastSaved.daFiles[key],
                                    data: null
                                });
                            })
                        );
                    })
                    .then(function(files) {
                        // Iterate through and save to main object
                        // Also build list of cache times and save
                        //
                        var cacheTimes = {
                            daFiles: {}
                        };
                        var changed = false;

                        files.forEach(function(file) {
                            cacheTimes.daFiles[file.key] = file.time;
                            if (file.changed)
                                changed = true;
                            Object.defineProperty(__public, file.key, {
                                value: file.data,
                                writable: false,
                                configurable: true
                            });
                        });

                        // We had some changes so re-build indexes
                        if (exPrefs.debug) console.log("File Changes", changed);
                        if (changed) {
                            // TODO
                        }

                        Object.defineProperty(__public, 'daFiles', {
                            value: cacheTimes.daFiles,
                            writable: false,
                            configurable: true
                        });

                        return cacheTimes;
                    })
                    .then(chrome.storage.promise.local.set)
                    .then(function() {
                        resolve(true);
                    }).catch(function(error) {
                        reject(error);
                    });
            });

            return promise;
        }

        function loadFile(root, key, lastChanged, thisChanged, thisExpires) {
            let promise = new Promise((resolve, reject) => {
                // Check the timings to see if we get from web or load from cache
                // Need to do more to figure out the mecahnics, but this for now
                // will ensure we try and keep upto date without hitting PF
                // servers every time. Really do not want to upset them!
                //
                var webGet = false;
                if (typeof lastChanged === 'undefined') lastChanged = 1;
                if (typeof thisChanged === 'undefined') thisChanged = lastChanged;

                if ((!exPrefs.cacheFiles) || thisChanged != lastChanged)
                    webGet = true;

                // Load from cache?
                if (!webGet) {
                    chrome.storage.promise.local.get(key)
                        .then(function(loaded) {
                            if ((loaded) && loaded.hasOwnProperty(key)) {
                                if (exPrefs.debug) console.log(key, 'Cache Hit', loaded);
                                resolve({
                                    key: key,
                                    changed: false,
                                    time: lastChanged,
                                    data: loaded[key]
                                });
                            } else
                                throw Error("Cache Miss");
                        })
                        .catch(function(error) {
                            if (exPrefs.debug) console.log(key, error.message);
                            getFile(root, key, lastChanged, thisChanged)
                                .then(resolve)
                                .catch(function(error) {
                                    // Throw or Resolve? - Resolve for now, empty data set
                                    resolve({
                                        key: key,
                                        changed: true,
                                        time: 0,
                                        data: null
                                    });
                                });
                        });
                } else {
                    if (exPrefs.debug && exPrefs.cacheFiles) console.log(key, 'Cache Stale (this/last)', thisChanged, lastChanged);
                    getFile(root, key, lastChanged, thisChanged)
                        .then(resolve)
                        .catch(function(error) {
                            // Throw or Resolve? - Resolve for now, empty data set
                            resolve({
                                key: key,
                                changed: true,
                                time: 0,
                                data: null
                            });
                        });
                }
            });
            return promise;
        }

        function getFile(root, key, lastChanged, thisChanged) {
            //console.log(key, lastChanged, thisChanged, root);
            let promise = new Promise((resolve, reject) => {
                var url = root + gameFiles[key] + '?ver=' + thisChanged;

                // Go get it
                http.get.xml(url).then(function(xml) {

                    // Parse the files XML
                    var i, data = null;
                    var dataFunc = '__gameFile_';

                    if ((i = key.indexOf('_')) !== -1) {
                        dataFunc += key.substring(0, i);
                    } else
                        dataFunc += key;
                    if (exPrefs.debug) console.groupCollapsed(dataFunc);

                    // Extra, Extra! Read All About It! :-)
                    callback.call(this, 'dataParsing', 'gameParsing', url);

                    if (typeof handlers[dataFunc] === "function") {
                        try {
                            data = handlers[dataFunc].call(this, key, xml);
                        } catch (e) {
                            throw Error(dataFunc + '() ' + e.message);
                        }
                    } else if (typeof xml === 'object') {
                        data = XML2jsobj(xml.firstElementChild);
                        xml = null;
                        var k = Object.keys(data);
                        if ((k.length == 1) && typeof data[k[0]] === 'object')
                            data = data[k[0]];
                    }
                    if (exPrefs.debug) console.groupEnd(dataFunc);

                    // Cache the file data
                    var cache = {};
                    cache[key] = data;
                    if (exPrefs.cacheFiles) {
                        chrome.storage.promise.local.set(cache).then(function() {
                            cache = null;
                            resolve({
                                key: key,
                                changed: true,
                                time: thisChanged,
                                data: data
                            });
                        });
                    } else
                        resolve({
                            key: key,
                            changed: true,
                            time: thisChanged,
                            data: data
                        });
                }).catch(function(error) {
                    console.error('getFile()', error.message, url);
                    reject('getFile() ' + error.message + ' ' + url);
                });
            });
            return promise;
        }

        /*
         ** @Private - Helper functions to extract game file information
         */
        function gfItemCopy(dkey, dst, def, src, skey) {
            if (src.hasOwnProperty(skey)) {
                dst[dkey] = src[skey];
            } else if ((def) && def.hasOwnProperty(dkey)) {
                dst[dkey] = def[dkey];
            } else if ((def) && def.hasOwnProperty(skey))
                dst[dkey] = def[skey];
            return dst;
        }

        function gfItemCSV(dkey, dst, def, src, skey) {
            if ((src.hasOwnProperty(skey)) && typeof src[skey] === 'string') {
                dst[dkey] = src[skey].split(',');
            } else
                dst[dkey] = [];
            return dst;
        }

        /*
         ** Extract Usable Items
         */
        handlers['__gameFile_daSpecials'] = function(key, xml) {
            let items = xml.getElementsByTagName('special_week');
            let data = {};
            let def = {};

            for (let i = 0; i < items.length; i++) {
                let id = items[i].attributes.id.textContent;
                let item = XML2jsobj(items[i]);

                if (id != 0) {
                    data[id] = {
                        id: id
                    };

                    data[id] = gfItemCopy('bt', data[id], def, item, 'start');
                    data[id] = gfItemCopy('et', data[id], def, item, 'finish');
                    data[id] = gfItemCopy('pty', data[id], def, item, 'priority');
                    data[id] = gfItemCopy('typ', data[id], def, item, 'type');
                    data[id] = gfItemCSV('info', data[id], def, item, 'info');

                } else
                    def = item;
            }
            return data;
        }

        /*
         ** Extract Usable Items
         */
        handlers['__gameFile_daUsables'] = function(key, xml) {
            let items = xml.getElementsByTagName('usable');
            let data = {};
            let def = {};

            for (let i = 0; i < items.length; i++) {
                let id = items[i].attributes.id.textContent;
                let item = XML2jsobj(items[i]);

                if (id != 0) {
                    data[id] = {
                        did: id
                    };

                    data[id] = gfItemCopy('nid', data[id], def, item, 'name_loc');
                    data[id] = gfItemCopy('gld', data[id], def, item, 'sell_price');
                    data[id] = gfItemCopy('val', data[id], def, item, 'value');
                    data[id] = gfItemCopy('act', data[id], def, item, 'action');
                } else
                    def = item;
            }
            return data;
        }

        /*
         ** Extract Production Items
         */
        handlers['__gameFile_daProduce'] = function(key, xml) {
            let items = xml.getElementsByTagName('production');
            let data = {};
            let def = {};

            for (let i = 0; i < items.length; i++) {
                let id = items[i].attributes.id.textContent;
                let item = XML2jsobj(items[i]);

                if (id != 0) {
                    data[id] = {
                        did: id
                    };

                    data[id] = gfItemCopy('typ', data[id], def, item, 'type');
                    data[id] = gfItemCopy('hde', data[id], def, item, 'hide');
                    data[id] = gfItemCopy('eid', data[id], def, item, 'event_id');
                    data[id] = gfItemCopy('rid', data[id], def, item, 'region_id');
                    data[id] = gfItemCopy('nid', data[id], def, item, 'name_loc');
                    data[id] = gfItemCopy('ord', data[id], def, item, 'order_id');
                    data[id] = gfItemCopy('rql', data[id], def, item, 'req_level');
                    data[id] = gfItemCopy('gem', data[id], def, item, 'gems_price');
                    data[id] = gfItemCopy('ulk', data[id], def, item, 'unlocked');
                    data[id] = gfItemCopy('drn', data[id], def, item, 'duration');

                    if ((item.hasOwnProperty('cargo')) && item.cargo.hasOwnProperty('object')) {
                        var def_cgo = def ? def.cgo : null;
                        data[id].cgo = gfItemCopy('oid', {}, def_cgo, item.cargo.object, 'object_id');
                        data[id].cgo = gfItemCopy('typ', data[id].cgo, def_cgo, item.cargo.object, 'type');
                        data[id].cgo = gfItemCopy('min', data[id].cgo, def_cgo, item.cargo.object, 'min');
                        data[id].cgo = gfItemCopy('max', data[id].cgo, def_cgo, item.cargo.object, 'max');
                    }

                    if ((item.hasOwnProperty('requirements')) && item.requirements.hasOwnProperty('cost')) {
                        var def_req = ((def) && def.req) ? def.req[0] : null;

                        if (item.requirements.cost.constructor != Array)
                            item.requirements.cost = [item.requirements.cost];

                        data[id].req = [];
                        for (var r = 0; r < item.requirements.cost.length; r++) {
                            var did = item.requirements.cost[r].def_id;
                            var req = {
                                did: did
                            };
                            req = gfItemCopy('amt', req, def_req, item.requirements.cost[r], 'amount');
                            req = gfItemCopy('mid', req, def_req, item.requirements.cost[r], 'material_id');
                            data[id].req.push(req);
                        }
                    }
                } else
                    def = item;
            }
            return data;
        }

        /*
         ** Extract Game Map Filters
         */
        handlers['__gameFile_daFilters'] = function(key, xml) {
            let items = xml.getElementsByTagName('map_filter');
            let data = {};
            let def = {};

            for (let i = 0; i < items.length; i++) {
                let id = intOrZero(items[i].attributes.id.textContent);
                let info = XML2jsobj(items[i]);
                if (id != 0) {
                    let flt = {
                        id: id
                    };

                    flt = gfItemCopy('nid', flt, def, info, 'name_loc');
                    flt = gfItemCopy('rid', flt, def, info, 'region_id');
                    flt = gfItemCopy('ord', flt, def, info, 'order_id');
                    flt = gfItemCopy('flt', flt, def, info, 'filter');
                    flt = gfItemCSV('qst', flt, def, info, 'quests');

                    //console.log("Filter", id, flt, info);
                    data[id] = flt;
                } else {
                    def = info;
                    // Useful to check for changes in structure!
                    if (exPrefs.debug) console.log('Default Filter:', def);
                }
            }
            return data;
        }

        /*
         ** Extract Game Events
         */
        handlers['__gameFile_daEvents'] = function(key, xml) {
            let items = xml.getElementsByTagName('event');
            let data = {};
            let def = {};

            for (let i = 0; i < items.length; i++) {
                let id = intOrZero(items[i].attributes.id.textContent);
                let info = XML2jsobj(items[i]);

                if (id != 0 && id != 67) {
                    let evt = {
                        eid: id
                    };

                    evt = gfItemCopy('et', evt, def, info, 'end');
                    evt = gfItemCopy('bt', evt, def, info, 'start');
                    evt = gfItemCopy('st', evt, def, info, 'sleep');
                    evt = gfItemCopy('drn', evt, def, info, 'duration');
                    evt = gfItemCopy('tst', evt, def, info, 'test');
                    evt = gfItemCopy('nid', evt, def, info, 'name_loc');
                    evt = gfItemCopy('dsc', evt, def, info, 'desc');
                    evt = gfItemCopy('ord', evt, def, info, 'order_id');
                    evt = gfItemCopy('lvl', evt, def, info, 'level');
                    evt = gfItemCopy('lot', evt, def, info, 'loot');
                    evt = gfItemCopy('prm', evt, def, info, 'premium');
                    evt = gfItemCopy('gem', evt, def, info, 'gems_price');
                    evt = gfItemCopy('ach', evt, def, info, 'achievements');
                    evt = gfItemCopy('clt', evt, def, info, 'collections');
                    evt = gfItemCopy('wma', evt, def, info, 'wm_amount');
                    evt = gfItemCopy('wid', evt, def, info, 'wm_id');
                    evt = gfItemCSV('tok', evt, def, info, 'tokens');
                    evt = gfItemCSV('use', evt, def, info, 'usables');
                    evt = gfItemCSV('loc', evt, def, info, 'locations');
                    evt = gfItemCSV('xlo', evt, def, info, 'extended_locations');

                    // Merge the extended locations ID's into the main location array
                    // we will use the xlo array to test we have an extended (Challenge)
                    // location if we need to.
                    // 
                    evt.loc.concat(evt.loc, evt.xlo);

                    let rdef = {};
                    if (((def) && def.hasOwnProperty('reward')) && def.reward.hasOwnProperty('object'))
                        rdef = def.reward.object;
                    evt.rwd = {};

                    if ((info.hasOwnProperty('reward')) && info.reward.hasOwnProperty('object')) {
                        if (!Array.isArray(info.reward.object))
                            info.reward.object = [info.reward.object];
                        let rob = info.reward.object;

                        for (let r = 0; r < rob.length; r++) {
                            let rwd = {};
                            rwd = gfItemCopy('did', rwd, rdef, rob[r], 'def_id');
                            rwd = gfItemCopy('oid', rwd, rdef, rob[r], 'object_id');
                            rwd = gfItemCopy('rid', rwd, rdef, rob[r], 'region_id');
                            rwd = gfItemCopy('amt', rwd, rdef, rob[r], 'amount');
                            rwd = gfItemCopy('typ', rwd, rdef, rob[r], 'type');
                            evt.rwd[rwd.did] = rwd;
                        }
                    }

                    // For some reason, these events have no dates in the XML
                    // so plug them for now.
                    if (id == '14') {
                        if (exPrefs.debug) console.log('Plug Event: Winter Games 2014', evt, info)
                        evt.bt = 1392116400;
                        evt.et = 1393333200;
                    }
                    if (id == '15') {
                        // St Patricks Day
                        if (exPrefs.debug) console.log('Plug Event: St Patricks Day', evt, info)
                        evt.bt = 1394535600;
                        evt.et = 1395752400;
                    }

                    //console.log("Event", id, evt, info);
                    data[id] = evt;
                } else {
                    def = info;
                    // Useful to check for changes in structure!
                    if (exPrefs.debug) console.log('Default Event:', def);
                }
            }
            return data;
        }

        /*
         ** Extract Game Location Information
         */
        handlers['__gameFile_daRegion5'] = function(key, xml) {
            return __gameFile_daRegion(key, xml);
        }
        handlers['__gameFile_daRegion4'] = function(key, xml) {
            return __gameFile_daRegion(key, xml);
        }
        handlers['__gameFile_daRegion3'] = function(key, xml) {
            return __gameFile_daRegion(key, xml);
        }
        handlers['__gameFile_daRegion2'] = function(key, xml) {
            return __gameFile_daRegion(key, xml);
        }
        handlers['__gameFile_daRegion1'] = function(key, xml) {
            return __gameFile_daRegion(key, xml);
        }
        handlers['__gameFile_daRegion0'] = function(key, xml) {
            return __gameFile_daRegion(key, xml);
        }

        function __gameFile_daRegion(key, xml) {
            let loc = XML2jsobj(xml.firstElementChild).location;
            let data = {};
            let def = {};

            for (let l in loc) {
                if (!loc[l].hasOwnProperty('def_id'))
                    continue;
                let id = intOrZero(loc[l].def_id);

                if (id != 0) {
                    let info = loc[l];
                    let mine = {
                        lid: id
                    };

                    if (localStorage.installType != 'development') {
                        if (info.hasOwnProperty('test')) {
                            if (intOrZero(info.test))
                                continue;
                        }
                    }

                    mine = gfItemCopy('tst', mine, def, info, 'test');
                    mine = gfItemCopy('eid', mine, def, info, 'event_id');
                    mine = gfItemCopy('gid', mine, def, info, 'group_id');
                    mine = gfItemCopy('rid', mine, def, info, 'region_id');
                    mine = gfItemCopy('nid', mine, def, info, 'name_loc');
                    mine = gfItemCopy('ord', mine, def, info, 'order_id');
                    mine = gfItemCopy('prg', mine, def, info, 'progress');
                    mine = gfItemCopy('gem', mine, def, info, 'reset_gems');
                    mine = gfItemCopy('cdn', mine, def, info, 'reset_cd');
                    mine = gfItemCopy('flt', mine, def, info, 'filter');
                    mine = gfItemCopy('rxp', mine, def, info, 'reward_exp');
                    mine = gfItemCopy('rpc', mine, def, info, 'reward_postcard');
                    mine = gfItemCopy('lck', mine, def, info, 'loc_lock');
                    mine = gfItemCopy('rql', mine, def, info, 'req_level');
                    mine = gfItemCopy('rqt', mine, def, info, 'req_start_time');
                    mine = gfItemCopy('rqa', mine, def, info, 'req_quest_a');
                    mine = gfItemCopy('rqf', mine, def, info, 'req_quest_f');
                    mine = gfItemCopy('rqs', mine, def, info, 'req_quest_step');
                    mine = gfItemCopy('flr', mine, def, info, 'floors');
                    mine = gfItemCopy('chn', mine, def, info, 'chance');

                    // Segmented event overrides
                    if (info.hasOwnProperty('overrides')) {
                        let overs = info.overrides.override;
                        if (!Array.isArray(overs))
                            overs = [overs];
                        mine.ovr = overs;
                    }

                    data[id] = mine;
                } else {
                    def = loc[l];
                    // Useful to check for changes in structure!
                    if (exPrefs.debug) console.log('Default Mine:', key, def);
                }
            }

            //console.log(data);

            return data;
        }

        /*
         ** Extract Game Floor Information
         */
        function __gameFile_daFloors(key, xml) {
            var floors = xml.getElementsByTagName('floor');
            var data = {};

            for (var i = 0; i < floors.length; i++) {
                var id = floors[i].attributes.id.textContent;
                if (id == 0)
                    continue;
                var floor = XML2jsobj(floors[i]);

                data[id] = {
                    fid: id,
                    loot: {}
                };

                data[id] = gfItemCopy('rid', data[id], null, floor, 'region_id');
                data[id] = gfItemCopy('prg', data[id], null, floor, 'progress');

                if (floor.hasOwnProperty('loot_areas')) {
                    if (floor.loot_areas.hasOwnProperty('loot_area')) {
                        if (floor.loot_areas.loot_area.constructor != Array)
                            floor.loot_areas.loot_area = [floor.loot_areas.loot_area];
                        for (var a = 0; a < floor.loot_areas.loot_area.length; a++) {
                            var area = floor.loot_areas.loot_area[a];
                            var loot = {};

                            loot = gfItemCopy('aid', loot, null, area, 'area_id');
                            loot = gfItemCopy('oid', loot, null, area, 'object_id');
                            loot = gfItemCopy('rid', loot, null, area, 'region_id');
                            loot = gfItemCopy('rnd', loot, null, area, 'random');
                            loot = gfItemCopy('cof', loot, null, area, 'coef');
                            loot = gfItemCopy('max', loot, null, area, 'max');
                            loot = gfItemCopy('min', loot, null, area, 'min');
                            loot = gfItemCopy('typ', loot, null, area, 'type');

                            loot.tle = [];
                            if (area.hasOwnProperty('tiles')) {
                                if (typeof area.tiles === 'string')
                                    loot.tle = area.tiles.split(';');
                            }

                            data[id].loot[loot.aid] = loot;
                        }
                    }
                }
            }

            return data;
        }

        /*
         ** Extract Game Tile Information
         */
        handlers['__gameFile_daTiles'] = function(key, xml) {
            let tiles = xml.getElementsByTagName('tile');
            let data = {};
            let def = {};

            for (var i = 0; i < tiles.length; i++) {
                let id = parseInt(tiles[i].attributes.id.textContent);
                let info = XML2jsobj(tiles[i]);

                if (id != 0) {
                    let tile = {
                        tid: info.def_id
                    };

                    tile = gfItemCopy('evt', tile, def, info, 'event');
                    tile = gfItemCopy('egy', tile, def, info, 'stamina');
                    tile = gfItemCopy('hdn', tile, def, info, 'hidden');
                    tile = gfItemCopy('sdw', tile, def, info, 'shadow');

                    // Segmented overrides
                    if (info.hasOwnProperty('overrides')) {
                        let overs = info.overrides.override;
                        if (!Array.isArray(overs))
                            overs = [overs];
                        tile.ovr = overs;
                    }

                    //console.log('Tile', id, tile, info);
                    data[id] = tile;
                } else {
                    def = info;
                    // Useful to check for changes in structure!
                    if (exPrefs.debug) console.log('Default Tile:', def);
                }
            }

            return data;
        }

        /*
         ** Extract Game Resources
         */
        handlers['__gameFile_daTokens'] = function(key, xml) {
            return __gameFile_daResources(key, xml, 'token');
        }
        handlers['__gameFile_daArtifacts'] = function(key, xml) {
            return __gameFile_daResources(key, xml, 'artifact');
        }
        handlers['__gameFile_daMaterials'] = function(key, xml) {
            return __gameFile_daResources(key, xml, 'material');
        }

        function __gameFile_daResources(key, xml, node) {
            let items = xml.getElementsByTagName(node);
            let data = {};
            let def = {};

            for (var i = 0; i < items.length; i++) {
                let id = parseInt(items[i].attributes.id.textContent);
                let info = XML2jsobj(items[i]);

                if (id != 0) {
                    let item = {
                        id: info.def_id
                    };

                    item = gfItemCopy('nid', item, def, info, 'name_loc');
                    item = gfItemCopy('dsc', item, def, info, 'desc');
                    item = gfItemCopy('ord', item, def, info, 'order_id');
                    item = gfItemCopy('eid', item, def, info, 'event_id');
                    item = gfItemCopy('lid', item, def, info, 'location_id');

                    //console.log('Resource', id, item, info);
                    data[id] = item;
                } else {
                    def = info;
                    // Useful to check for changes in structure!
                    if (exPrefs.debug) console.log('Default', key, def);
                }
            }

            return data;
        }

        /*
         ** Extract Current Game Config
         */
        handlers['__gameFile_daConfig'] = function(key, xml) {
            var data = XML2jsobj(xml).configs;
            xml = null;

            if (data.hasOwnProperty('config')) {
                var id = 1;
                if (typeof __public.daUser === 'object') {
                    if (__public.daUser.hasOwnProperty('config_id'))
                        id = __public.daUser.config_id;
                }
                for (var c in data.config) {
                    if (data.config[c].def_id == id) {
                        data = data.config[c];
                        break;
                    }
                }

                return data;
            }

            return {};
        }

        /*
         ** Extract Game Buildings - TODO
         */
        //handlers['__gameFile_daBuildings'] = function(key, xml)
        //{
        //}

        /*
         ** Extract Game Level Ups
         */
        handlers['__gameFile_daLevels'] = function(key, xml) {
            var want = [
                'xp',
                'fb_points'
            ];
            var items = xml.getElementsByTagName('levelup');
            var data = {};

            for (var i = 0; i < items.length; i++) {
                var id = items[i].attributes.id.textContent;
                var item = XML2jsobj(items[i]);
                data[id] = {
                    level: id
                };
                for (var k in item) {
                    if (k == 'reward') {
                        var o = item[k].object;
                        if (!Array.isArray(o))
                            o = [o];
                        o.forEach(function(v, i, a) {
                            if (v.type == 'system')
                                data[id]['boost'] = v.amount;
                        });
                    } else if (want.indexOf(k) !== -1)
                        data[id][k] = item[k];
                }
            }
            return data;
        }

        /*
         ** Extract Game Recipes
         */
        handlers['__gameFile_daRecipes'] = function(key, xml) {
            var items = xml.getElementsByTagName('recipe');
            var data = {};
            for (var i = 0; i < items.length; i++) {
                var id = items[i].attributes.id.textContent;
                data[id] = XML2jsobj(items[i]);
            }
            return data;
        }

        /*
         ** Extract Game Localization Strings
         */
        handlers['__gameFile_daLang'] = function(key, xml) {
            var want = [
                'ABNA', 'ACNA', 'BUNA', 'CAOV', 'COL', 'DENA', 'EVN', 'JOST',
                'LONA', 'MANA', 'MAP', 'NPCN', 'QINA', 'TRNA', 'USNA', 'WINA',
                //'GIP', MOB'
            ];
            var data = {};

            // XML Format
            if (typeof xml !== 'string') {
                var items = xml.getElementsByTagName('item');
                for (var i = 0; i < items.length; i++) {
                    if (items[i].attributes.length != 1)
                        continue;
                    var id = items[i].attributes.index.textContent;
                    var c = id.substr(0, id.substring(0).search(/[^A-Za-z]/));
                    if (want.indexOf(c) !== -1)
                        data[id] = items[i].textContent.replace('@@@', ' ');
                }
                items = xml = null;
                return data;
            }

            // CSV format?
            xml = xml.split(/[\n\u0085\u2028\u2029]|\r\n?/g);
            xml.forEach(function(v, i, a) {
                var s = v.indexOf('*#*');
                var n = v.substr(0, s);
                var c = n.substr(0, v.substring(0).search(/[^A-Za-z]/));

                if (want.indexOf(c) !== -1)
                    data[n] = v.substr(s + 3);
            });

            return data;
        }

        /*********************************************************************
         ** @Public - Get Raw Game File
         */
        __public.loadGameXML = function(file, raw = true) {
            let promise = new Promise((resolve, reject) => {
                let root = ((0) ? __public.daUser.static_root : __public.daUser.cdn_root);
                let ver = 1;

                if (!file.startsWith('xml/'))
                    file = 'xml/' + file;

                if (__public.daUser.file_changes.hasOwnProperty(file))
                    ver = __public.daUser.file_changes[file].changed;
                let url = root + file + '?ver=' + ver;

                if (exPrefs.debug) console.log('loadGameXML()', url);

                http.get.xml(url).then(function(xml) {
                    if (!raw) {
                        resolve(XML2jsobj(xml));
                    }
                    resolve(xml);
                }).catch(function(error) {
                    console.error('loadGameXML()', error.message, url);
                    reject('loadGameXML() ' + error.message + ' ' + url);
                });
            });

            return promise;
        }

        /*********************************************************************
         ** @Public - Get Event Information
         */
        __public.eventDetails = function(id, getMines = false) {
            let promise = new Promise((resolve, reject) => {
                if (__public.hasOwnProperty('daEvents')) {
                    if (__public.daEvents.hasOwnProperty(id)) {
                        let event = __public.daEvents[id];
                        if (!event.hasOwnProperty('name'))
                            event.name = __public.string(event.nid);
                        if ((getMines)) {
                            if (event.loc.length > 0) {
                                if (!event.hasOwnProperty('mines')) {
                                    return Promise.all(event.loc.reduce(function(items, lid) {
                                        items.push(__public.mineDetails(lid, true).catch(function(error) {
                                            return error;
                                        }));
                                        return items;
                                    }, [])).then(function(mines) {
                                        event.mines = mines;
                                        resolve(event);
                                    });
                                }
                            } else
                                event.mines = [];
                        }
                        resolve(event);
                    } else
                        reject(__public.i18n('errorData', [__public.i18n('Event'), id]));
                } else
                    reject(__public.i18n('errorData', [__public.i18n('Events')]));
            });
            return promise;
        }

        /*********************************************************************
         ** @Public - Get Map/Filter Information
         */
        __public.mapDetails = function(id, getMines = false) {
            let promise = new Promise((resolve, reject) => {
                if (__public.hasOwnProperty('daFilters')) {
                    if (__public.daFilters.hasOwnProperty(id)) {
                        let filter = __public.daFilters[id];
                        if (!filter.hasOwnProperty('name'))
                            filter.name = __public.string(filter.nid);
                        if (!filter.hasOwnProperty('mines')) {
                            let region = 'daRegion' + intOrZero(filter.rid);

                            if (__public.hasOwnProperty(region)) {

                                if (!filter.hasOwnProperty('loc')) {
                                    filter.loc = Object.keys(__public[region]).reduce(function(items, lid) {
                                        if (__public[region][lid].flt == filter.flt)
                                            items.push(lid);
                                        return items;
                                    }, []);
                                }

                                if (getMines) {
                                    return Promise.all(filter.loc.reduce(function(items, lid) {
                                        items.push(__public.mineDetails(lid, true).catch(function(error) {
                                            return error;
                                        }));
                                        return items;
                                    }, [])).then(function(mines) {
                                        if (mines.length > 0)
                                            filter.mines = mines;
                                        resolve(filter);
                                    });
                                }
                            }
                        }
                        resolve(filter);

                    } else
                        reject(__public.i18n('errorData', [__public.i18n('Map'), id]));
                } else
                    reject(__public.i18n('errorData', [__public.i18n('Maps')]));
            });
            return promise;
        }

        /*********************************************************************
         ** @Public - Get Max Regions
         */
        __public.maxRegions = function() {
            return 5; // TODO: Got to be a way of working this out
        }

        /*********************************************************************
         ** @Public - Get Mine/Location Information
         */
        __public.mineDetails = function(id, getFloors = false) {
            let promise = new Promise((resolve, reject) => {
                let mine = __public.mineLocation(id);
                let floors = 'daF' + mine;

                if (mine !== null) {
                    if (!mine.hasOwnProperty('name'))
                        mine.name = __public.string(mine.nid);

                    if ((intOrZero(mine.eid) != 0) && !mine.hasOwnProperty('event')) {
                        if (__public.hasOwnProperty('daEvents')) {
                            if (__public.daEvents.hasOwnProperty(mine.eid)) {
                                mine.event = __public.daEvents[mine.eid];
                                // Segmented Event?
                                if (!mine.event.hasOwnProperty('isSeg')) {
                                    mine.event.isSeg = ((mine.hasOwnProperty('ovr')) && mine.ovr.length != 0);
                                }
                                // Repeatable?
                                if (parseInt(mine.cdn) > 0) {
                                    if (mine.event.hasOwnProperty('rlo')) {
                                        if (mine.event.rlo.indexOf('' + mine.lid) === -1)
                                            mine.event.rlo.push('' + mine.lid);
                                    } else
                                        mine.event.rlo = ['' + mine.lid];
                                }
                            }
                        }
                    }
                    if ((getFloors) && !mine.hasOwnProperty('floors')) {
                        if (!__public.hasOwnProperty(floors)) {
                            mineFloors(mine).then(resolve).catch(reject);
                        } else {
                            mine.floors = __public[floors];
                            resolve(mine);
                        }
                    } else
                        resolve(mine);
                } else
                    reject(__public.i18n('errorData', [__public.i18n('Location'), id]));
            });
            return promise;
        }

        // TODO: Loop through looking for daRegion$ objects rather 
        // than hard code, makes it easier when new regions added!
        //
        __public.mineLocation = function(mine) {
            if ((__public.hasOwnProperty('daRegion1')) && __public.daRegion1.hasOwnProperty(mine))
                return __public.daRegion1[mine];
            if ((__public.hasOwnProperty('daRegion2')) && __public.daRegion2.hasOwnProperty(mine))
                return __public.daRegion2[mine];
            if ((__public.hasOwnProperty('daRegion3')) && __public.daRegion3.hasOwnProperty(mine))
                return __public.daRegion3[mine];
            if ((__public.hasOwnProperty('daRegion4')) && __public.daRegion4.hasOwnProperty(mine))
                return __public.daRegion4[mine];
            if ((__public.hasOwnProperty('daRegion5')) && __public.daRegion5.hasOwnProperty(mine))
                return __public.daRegion5[mine];
            if ((__public.hasOwnProperty('daRegion0')) && __public.daRegion0.hasOwnProperty(mine))
                return __public.daRegion0[mine];
            return null;
        }

        /*********************************************************************
         ** @Private - Get Mine/Location Floor Information
         */
        function mineFloors(mine) {
            let promise = new Promise((resolve, reject) => {
                let root = ((0) ? __public.daUser.static_root : __public.daUser.cdn_root);
                let fid = 'daF' + mine.lid;
                let ver = 1;

                if (__public.daUser.file_changes.hasOwnProperty(fid))
                    ver = __public.daUser.file_changes[fid].changed;
                let url = root + 'xml/floors/floors_' + mine.lid + '.xml?ver=' + ver;

                http.get.xml(url).then(function(xml) {
                    mine.floors = __gameFile_daFloors(fid, xml);
                    resolve(mine);
                }).catch(function(error) {
                    console.error('mineFloors()', error.message, url);
                    reject('mineFloors() ' + error.message + ' ' + url);
                });
            });

            return promise;
        }

        /*********************************************************************
         ** @Public Methods (and propertys)
         */
        return __public.init(this);
    };

    /*
     ** Attach to global namespace
     */
    window.gameDiggy = gameDiggy;
})();
/*
 ** END
 *******************************************************************************/