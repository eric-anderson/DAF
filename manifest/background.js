/*
 ** DA Friends - background.js
 */
const storageSpace = "5,242,880";

var exPrefs = {
    debug: false,
    toolbarStyle: 2,
    toolbarShift: true,
    fullWindow: false,
    fullWindowHeader: false,
    cssTheme: 'default',
    cacheFiles: true,
    autoPortal: true,
    autoClick: false,
    autoFocus: true,
    autoData: true,
    gameDebug: true,
    syncDebug: false,
    gameSync: false,
    gameLang: 'EN',
    gameNews: null,
    gameSite: null,
    gameDate: 0,
    gcTable: false,
    gcTableSize: 'large',
    gcTableFlipped: true,
    facebookMenu: localStorage.installType == 'development',
    linkGrabButton: 2,
    linkGrabKey: 0,
    linkGrabSort: true,
    linkGrabReverse: false,
    linkGrabPortal2FB: localStorage.installType == 'development',
    tabIndex: 0,
    nFilter: '7',
    cFilter: 'ALL',
    fFilter: 'F',
    rFilter: 'ALL',
    crownGrid: false,
    capCrowns: true,
    trackGift: true,
    hidePastEvents: false,
    hideGiftTime: true,
    calcMenu: 'kitchen',
    repeatRID: 0,
    repeatFLT: 0,
    repeatLID: 0,
    repeatTOK: false,
    cminesMTOK: true,
    cminesURID: 1,
    cminesMRID: 1,
    cminesFLT0: 0,
    cminesFLT1: 2,
    cminesFLT2: 15,
    cminesFLT3: 28,
    cminesFLT4: 36,
    cminesFLT5: 106,
    toggle_camp1: '',
    toggle_camp2: '',
    toggle_gring0: '',
    toggle_gring1: '',
    toggle_rring0: '',
    toggle_rring1: '',
    toggle_rring2: '',
    toggle_cmines0: '',
    toggle_cminse1: '',
    toggle_cminse2: '',
    progMineGrp: true,
    progLvlGoal: 0,
    progSkipDone: true,
    progMineDate: false,
};

var listening = false;
var daGame = null;
var activeTab = 0;
var reshowTab = 0;
var gameSniff = false;
var gameData = false;
var webData = {
    bugId: 0,
    tabId: 0,
    url: null,
    statusCode: null,
    statusLine: null,
    requestId: 0,
    requestForm: null,
    requestHeaders: null,
};

var xmlRequests = {};

/*
 ** Get extension settings and initialize
 */
chrome.storage.sync.get(null, function(loaded) {
    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
    } else {
        loaded = loaded || {};
        var obsoleteKeys = ['DAfullwindow', 'gcTableStatus', 'bodyHeight', 'minerTop'],
            keysToRemove = [];
        // remove old obsolete keys
        Object.keys(loaded).forEach(key => {
            if (key in exPrefs) exPrefs[key] = loaded[key];
            if (obsoleteKeys.includes(key)) keysToRemove.push(key);
        });
        if (keysToRemove.length) {
            console.log('Removing these keys', keysToRemove);
            chrome.storage.sync.remove(keysToRemove);
        }
    }
    if (exPrefs.debug) console.info("exPrefs", exPrefs);
});

/*
 ** Monitor for prefrence changes etc.
 */
chrome.storage.onChanged.addListener(function(changes, area) {
    // Any changes to 'sync' storage? - If so, update our status etc.
    // We also need to track changes from the injected content script(s)
    //
    if (area == 'sync') {
        for (let key in changes) {
            if (exPrefs.hasOwnProperty(key)) {
                if (exPrefs[key] != changes[key].newValue) {
                    exPrefs[key] = changes[key].newValue;
                    chrome.runtime.sendMessage({
                        cmd: 'exPrefs',
                        name: key,
                        changes: changes[key]
                    });
                    if (exPrefs.debug) console.log(key, changes[key].oldValue, '->', changes[key].newValue);
                } else
                    continue;
            }

            // Anything to do per specific preference change?
            switch (key) {
                case 'syncDebug':
                    if (exPrefs.syncDebug) {
                        if (daGame.syncScript)
                            daGame.syncScript(webData.tabId).then(debuggerAttach);
                        else
                            debuggerAttach();
                    } else
                        debuggerDetach();
                    break;
                case 'gameSync':
                    daGame.syncScript();
                    break;
                default:
                    break;
            }
        }
        badgeStatus();
    }
});

/*
 ** Timed installation of Data Listeners (timer cancelled by onInstall or
 ** onStartup events, which in turn initialize the listeners themselves).
 */
chrome.browserAction.setIcon({
    path: "/img/iconGrey.png"
});
var resumedTimer = window.setTimeout(function() {
    if (exPrefs.debug) console.log("resumedTimer - Fired!");
    investigateTabs();
    setDataListeners();
}, 200);

/*******************************************************************************
 ** Event Handlers/Listeners
 */
const sniffFilters = {
    urls: [
        "*://diggysadventure.com/*.php*",
        "*://portal.pixelfederation.com/_da/miner/*.php*",
        "*://www.facebook.com/dialog/apprequests?app_id=470178856367913&*",
        "*://www.facebook.com/*/dialog/apprequests?app_id=470178856367913&*"
    ]
};

const pageFilters = {
    url: [{
            urlMatches: 'apps.facebook.com/diggysadventure'
        },
        {
            urlMatches: 'portal.pixelfederation.com/(.*)/diggysadventure'
        },
        {
            urlMatches: 'wiki.diggysadventure.com'
        },
    ]
};

var gameUrls = {
    facebook: "https://apps.facebook.com/diggysadventure*",
    portal: "https://portal.pixelfederation.com/*/diggysadventure*",
};

var wikiLink = "https://wiki.diggysadventure.com";
var wikiVars = "/index.php?title=";

/*
 ** onInstalled
 */
chrome.runtime.onInstalled.addListener(function(info) {
    // Cancel our resumed timer, as we initialize within here!
    if (resumedTimer)
        window.clearTimeout(resumedTimer);
    resumedTimer = null;

    if (exPrefs.debug) console.log("chrome.runtime.onInstalled", info);

    let persistent = chrome.app.getDetails().background.persistent;
    let versionName = chrome.app.getDetails().version_name;
    let version = chrome.app.getDetails().version;
    let update = false;
    let now = new Date();

    // Save information
    localStorage.timeUpdated = now;
    localStorage.version = version;
    localStorage.versionName = (typeof versionName === 'undefined') ? version : versionName;
    localStorage.persistent = (typeof persistent === 'undefined') ? true : persistent;

    chrome.management.getSelf(function(self) {
        localStorage.installType = self.installType;
    });

    if (exPrefs.debug) console.log(chrome.app.getDetails());

    // If being updated to a different version, we may have to do
    // some processing/migration work.
    if (info.reason == 'update' && info.previousVersion != version) {
        update = true;
    } else if (info.reason == 'update') {
        showIndex(true);
    }

    investigateTabs(true);
    setDataListeners(update);
});

/*
 ** onStartup
 */
chrome.runtime.onStartup.addListener(function() {
    // Cancel our resumed timer, as we initialize within here!
    if (resumedTimer)
        window.clearTimeout(resumedTimer);
    resumedTimer = null;

    if (exPrefs.debug) console.log("chrome.runtime.onStartup");
    localStorage.timeStarted = new Date();
    setDataListeners();
});

/*
 ** browserAction.onClicked
 */
chrome.browserAction.onClicked.addListener(function(activeTab) {
    if (exPrefs.debug) console.log("chrome.browserAction.onClicked", activeTab);
    showIndex();
});

function showIndex(refresh = false) {
    chrome.tabs.query({}, function(tabs) {
        let doFlag = true;

        for (let i = tabs.length - 1; i >= 0; i--) {
            if (tabs[i].url.indexOf("chrome-extension://" + chrome.runtime.id + "/") != -1) {
                // we are alive, so focus it instead
                doFlag = {
                    active: true
                };
                if (refresh)
                    doFlag.url = tabs[i].url;
                chrome.tabs.update(tabs[i].id, doFlag);
                doFlag = false;
                break;
            }
        }

        if (doFlag && !refresh) { // didn't find anything, so create tab
            chrome.tabs.create({
                url: "/manifest/index.html",
                "selected": true
            }, function(tab) {});
        }
    });
}

/*
 ** tabs.onActivated
 */
chrome.tabs.onActivated.addListener(function(info) {
    activeTab = info.tabId;
});

/*
 ** onMessage
 */
chrome.runtime.onMessage.addListener(onMessage);

/*
 ** webNavigation.onCompleted/tabs.onUpdated
 */
if (typeof chrome.webNavigation !== 'undefined') {
    chrome.webNavigation.onCommitted.addListener(function(event) {
        onNavigation(event, 'loading');
    }, pageFilters);
    chrome.webNavigation.onCompleted.addListener(function(event) {
        onNavigation(event, 'complete');
    }, pageFilters);
    chrome.webNavigation.onDOMContentLoaded.addListener(onFBNavigation, {
        url: [{
            hostEquals: 'www.facebook.com'
        }]
    });
} else if (1) {
    chrome.tabs.onUpdated.addListener(function(id, info, tab) {
        onNavigation(tab, info.status);
    });
}

/*
 ** Tracks tab settings, so we can exclude a tab from injection
 */
var tabSettings = {};
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    tabSettings[tabId] = Object.assign(tabSettings[tabId] || {}, tab);
});
chrome.tabs.onRemoved.addListener(function(tabId) {
    delete tabSettings[tabId];
});
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
    tabSettings[addedTabId] = tabSettings[removedTabId];
    delete tabSettings[removedTabId];
});

function excludeFromInjection(tabId, flag = true) {
    if (!tabSettings[tabId]) tabSettings[tabId] = {};
    tabSettings[tabId].excludeFromInjection = flag;
}

function canBeInjected(tabId) {
    return tabId in tabSettings ? !tabSettings[tabId].excludeFromInjection : true;
}

/*
 ** onSuspend - Not called as we are having to be persistent at the moment
 */
chrome.runtime.onSuspend.addListener(function() {
    if (exPrefs.debug) console.log("chrome.runtime.onSuspend");
});

/*
 ** onSuspendCanceled - Not called as we are having to be persistent at the moment
 */
chrome.runtime.onSuspendCanceled.addListener(function() {
    if (exPrefs.debug) console.log("chrome.runtime.onSuspendCanceled");
});

/*
 ** onUpdateAvailable
 */
chrome.runtime.onUpdateAvailable.addListener(function(info) {
    if (exPrefs.debug) console.log("chrome.runtime.onUpdateAvailable", info);
    // On persistent (background) pages, we need to call reload!
    if (isBool(localStorage.persistent))
        chrome.runtime.reload();
});

/*******************************************************************************
 ** Supporting Functions
 */

/*
 ** setDataListeners
 */
function setDataListeners(upgrade = false) {
    if (listening) {
        console.warn("Attempt to re-start listeners");
        return;
    }
    listening = true;

    // Initialise main game processor
    chrome.browserAction.setIcon({
        path: "/img/icon.png"
    });

    daGame = new window.gameDiggy();
    if (exPrefs.debug) console.log('setDataListeners: Upgrade', upgrade);

    // For debug testing
    if (localStorage.installType == 'development') {
        upgrade = true;
    }
    
    if (upgrade)
        daGame.guiReload = true;

    daGame.cachedData(upgrade).then(function() {

        /***************************************************
        exPrefs.autoData = false;
        badgeStatus();
        http.get.json('/test/DAF_gamedata.json').then(function(json) {
            daGame = Object.assign(daGame, json);    
            console.log(daGame);
        });
        return;
        ***************************************************/

        // Listen for web requests to detect the game traffic
        chrome.webRequest.onBeforeRequest.addListener(function(info) {
            onWebRequest('before', info);
        }, sniffFilters, ['requestBody']);
        chrome.webRequest.onBeforeRequest.addListener(
            onXMLRequest, {
                urls: ["*://*.diggysadventure.com/*.xml*",
                    "*://*.diggysadventure.com/*.swf*"
                ]
            });
        chrome.webRequest.onSendHeaders.addListener(function(info) {
            onWebRequest('headers', info);
        }, sniffFilters, ['requestHeaders']);
        chrome.webRequest.onCompleted.addListener(function(info) {
            onWebRequest('complete', info);
        }, sniffFilters, ['responseHeaders']);
        chrome.webRequest.onErrorOccurred.addListener(function(info) {
            onWebRequest('error', info);
        }, sniffFilters);

        badgeStatus();
        if (exPrefs.debug) console.log("setDataListeners", localStorage);
    });
}

/*
 ** onWebRequest
 */
function onWebRequest(action, request) {
    var url = urlObject({
        'url': request.url
    });

    // What's going on then?
    switch (action) {
        case 'before':
            //console.log(url.pathname);
            webData.url = url;
            webData.tabId = request.tabId;
            webData.requestId = request.requestId;
            webData.requestForm = null;
            webData.requestHeaders = null;
            if (request.method == 'POST')
                webData.requestForm = request.requestBody.formData;
            if (url.pathname == '/miner/login.php') {
                if (gameData) {
                    try {
                        console.log(webData.requestForm);
                        if ((webData.requestForm) && webData.requestForm.hasOwnProperty('player_id')) {
                            daGame.player_id = webData.requestForm.player_id[0];
                            if (daGame.player_id <= 1)
                                console.error("Login UID seems to be invalid!");
                        }
                    } catch (e) {
                        console.error("Failed to get player UID from login!");
                    }

                    delete daGame.daUser.time_generator_local;
                    // Using the debugger?
                    if (exPrefs.gameDebug || exPrefs.syncDebug) {
                        debuggerDetach();
                        debuggerAttach(webData.tabId);
                    }
                    chrome.tabs.get(webData.tabId, function(tab) {
                        daGame.site = isGameURL(tab.url);
                        if (exPrefs.gameSite === null) {
                            exPrefs.gameSite = daGame.site;
                            chrome.storage.sync.set({
                                gameSite: daGame.site
                            });
                        }
                        if (exPrefs.debug) console.log("Game Site", daGame.site);
                        if (exPrefs.debug) console.log("Game News", exPrefs.gameNews);
                        if (exPrefs.debug) console.log("Game Lang", exPrefs.gameLang);
                        if (exPrefs.debug) console.log("Game Player", daGame.player_id);
                    });
                }
            } else if (url.pathname.indexOf('webgltracking.php') != -1) {
                daGame.inject(webData.tabId);

                // Are we collecting game data?
                if (!gameData) {
                    gameData = exPrefs.autoData;
                } else {
                    // Must be a forced data collection!
                    if (exPrefs.debug) console.log("Forced Data Collection Detected");
                }

                if (gameData) {
                    daGame.notification("gameLoading", "gameLoading");
                    gameSniff = true;
                    badgeStatus();
                    // Need to switch to the game tab?
                    if (exPrefs.autoFocus) {
                        if (reshowTab == 0 && webData.tabId != activeTab)
                            reshowTab = activeTab;
                        chrome.tabs.update(webData.tabId, {
                            active: true
                        });
                    }
                }
            }
            break;

        case 'headers':
            if (request.requestId == webData.requestId)
                webData.requestHeaders = request.requestHeaders;
            break;

        case 'error':
            errorOnWebRequest(action, request.statusCode, request.statusLine, url);
            break;

        case 'complete':
            if (request.requestId != webData.requestId)
                break;
            if (request.tabId != webData.tabId)
                break;
            webData.statusCode = request.statusCode;
            webData.statusLine = request.statusLine;

            // process it
            if (url.pathname == '/miner/maintenance.php') {
                daGame.notification("gameMaintenance", "gameMaintenance");
                doneOnWebRequest();
            } else if (url.pathname == '/miner/user_maintenance.php') {
                daGame.notification("userMaintenance", "userMaintenance");
                doneOnWebRequest();
            } else if (url.pathname == '/miner/synchronize.php') {
                if (reshowTab != 0) {
                    chrome.tabs.update(reshowTab, {
                        active: true
                    });
                    reshowTab = 0;
                }
                if (!exPrefs.syncDebug) {
                    debuggerDetach(); // Just in case!
                    daGame.syncData(request.tabId, parseXml(webData.requestForm.xml[0]));
                }
            } else if (url.pathname.indexOf('/dialog/apprequests') >= 0 && url.search.indexOf('app_id=470178856367913&') >= 0) {
                console.log(url.pathname, exPrefs.autoClick);
                if (exPrefs.autoClick) {
                    chrome.tabs.executeScript(request.tabId, {
                        code: `
                        Array.from(document.getElementsByClassName('layerConfirm')).forEach(element => {
                            if (element.name == '__CONFIRM__') {
                                element.click();
                            }
                        });
                        `,
                        allFrames: false,
                        frameId: 0
                    });
                }
            } else if (gameData) {
                // process it
                if (url.pathname == '/miner/generator.php') {
                    daGame.notification("dataLoading", "gameGenData", url);

                    // Two choices are to grab the timestamp when the request goes out or back
                    // either choice is imperfect.  Grab it here since there's already code
                    // here.
                    daGame.daUser.time_generator_local = getUnixTime();
                    console.log('timestamps', daGame.daUser.time_generator_local, daGame.daUser.time);
                    if (exPrefs.autoFocus && webData.tabId != activeTab)
                        chrome.tabs.update(webData.tabId, {
                            active: true
                        });

                    if (!exPrefs.gameDebug) {
                        var daTab = webData.tabId;
                        if (exPrefs.debug) console.log("Calling webData()", webData.tabId, webData.requestId);
                        var form = new FormData();
                        for (key in webData.requestForm) {
                            form.append(key, webData.requestForm[key]);
                        }
                        daGame.gameData(request.url, form).then(function(success) {
                            if (exPrefs.debug) console.log("Success:", success, webData.tabId);
                            chrome.tabs.sendMessage(daTab, {
                                cmd: 'gameDone'
                            });
                        });

                        gameData = false;
                    }
                }
            }

            // clear it
            webData.requestId = 0;
            break;

        default:
            break;
    }

    url = null;
}

/*
 ** Something went wrong!
 */
function errorOnWebRequest(action, code, message, url = null) {
    // TODO: Check for JSON string messages from crome.runtime.lasterror!
    daGame.notification("dataError", "gameError", url);
    console.error(action, code, message, url);
    webData.statusLine = message;
    webData.statusCode = code;
    doneOnWebRequest();
}

function doneOnWebRequest() {
    webData.requestId = 0;
    gameSniff = gameData = false;
    badgeStatus();
    debuggerDetach();
}

function onXMLRequest(info) {
    if (exPrefs.debug) console.log('XMLRequest', info.url);
}

function onFBNavigation(info) {
    if (info.frameId == 0 && exPrefs.facebookMenu && canBeInjected(info.tabId)) {
        console.log("injecting facebook", info.url);
        chromeMultiInject(info.tabId, {
            file: [
                '/manifest/dialog.js',
                '/manifest/content_common.js',
                '/manifest/content_fb.js'
            ],
            allFrames: false,
            frameId: 0
        });
    }
}

/*
 ** Debugger Detatch
 */
function debuggerAttach(tabId = webData.tabId) {
    chrome.debugger.attach({
        tabId: webData.tabId
    }, '1.0', function() {
        if (exPrefs.debug) console.log("debugger.attach");
        if (chrome.runtime.lastError) {
            errorOnWebRequest('debugger.attach', -1, chrome.runtime.lastError.message);
            return;
        }
        chrome.debugger.onEvent.addListener(debuggerEvent);
        chrome.debugger.onDetach.addListener(debuggerDetatched);
        chrome.debugger.sendCommand({
            tabId: webData.tabId
        }, "Network.enable", function(result) {
            if (exPrefs.debug) console.log("debugger.sendCommand: Network.enable");
            if (chrome.runtime.lastError) {
                errorOnWebRequest('debugger.Network.enable', -1, chrome.runtime.lastError.message);
                return;
            }
            webData.bugId = webData.tabId;
        });
    });
}

/*
 ** Debugger Detatch
 */
function debuggerDetach() {
    if (webData.bugId) {
        chrome.debugger.detach({
            tabId: webData.bugId
        }, function() {
            webData.bugId = 0;
            if (exPrefs.debug) console.log("debugger.detatch");
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }
        });
        webData.bugId = 0;
        chrome.debugger.onDetach.removeListener(debuggerDetatched);
        chrome.debugger.onEvent.removeListener(debuggerEvent);
    }
}

/*
 ** Debugger "Detatched" Handler
 */
function debuggerDetatched(bugId, reason) {
    if (exPrefs.debug) console.log("debuggerDetatched", bugId, reason);
    if (bugId.tabId == webData.tabId) {
        webData.bugId = 0;
        errorOnWebRequest('debugger.detatched', -2, reason);
        /*
        if (exPrefs.syncDebug) {
            exPrefs.syncDebug = false;
            chrome.storage.sync.set(exPrefs);
        }
        */
    }
}

/*
 ** Debugger "Event" Handler
 */
function debuggerEvent(bugId, message, params) {
    switch (message) {
        case 'Network.requestWillBeSent':
            var url = urlObject({
                'url': params.request.url
            });
            if (url.pathname == '/miner/generator.php') {
                if (exPrefs.debug) console.log("debuggerEvent", message, url.pathname, params);
                debuggerEvent.requestID = params.requestId;
                debuggerEvent.requestURL = url;
            }
            break;

        case 'Network.responseReceived':
            var url = urlObject({
                'url': params.response.url
            });
            if (url.pathname == '/miner/generator.php') {
                if (params.response.status == 200) {
                    daGame.notification("dataLoading", "gameSniffing", params.response.url);
                    debuggerEvent.requestID = params.requestId;
                    debuggerEvent.requestURL = url;
                    debuggerEvent.file = url.pathname;
                } else {
                    debuggerEvent.requestID = 0;
                    errorOnWebRequest('debugger.' + message,
                        params.response.statusCode,
                        params.response.statusText,
                        url
                    );
                }
            } else if ((exPrefs.syncDebug) && url.pathname == '/miner/synchronize.php') {
                if (params.response.status == 200) {
                    debuggerEvent.requestID = params.requestId;
                    debuggerEvent.requestURL = url;
                    debuggerEvent.file = url.pathname;
                } else {
                    debuggerEvent.requestID = 0;
                    console.error('debugger', url, message);
                }
            }
            break;

        case 'Network.loadingFinished':
            if (debuggerEvent.requestID == params.requestId) {
                chrome.debugger.sendCommand({
                        tabId: bugId.tabId
                    },
                    "Network.getResponseBody", {
                        "requestId": params.requestId
                    },
                    function(response) {
                        if (chrome.runtime.lastError) {
                            errorOnWebRequest('debugger.' + message, -1,
                                chrome.runtime.lastError.message,
                                debuggerEvent.requestURL
                            );
                            return;
                        }
                        debuggerEvent.requestID = 0;

                        if ((exPrefs.gameDebug) && debuggerEvent.file == '/miner/generator.php') {
                            if (!exPrefs.syncDebug)
                                debuggerDetach();
                            daGame.processXml(parseXml(response.body)).then(function(success) {
                                if (exPrefs.debug) console.log("Success:", success, webData.tabId);
                                chrome.tabs.sendMessage(webData.tabId, {
                                    cmd: 'gameDone'
                                });
                            });
                        } else if ((exPrefs.syncDebug) && debuggerEvent.file == '/miner/synchronize.php') {
                            try {
                                // This needs to be quick to process otherwise, will impact game performance
                                // Maybe, store sync data in local.storage and message foreground when new
                                // data available etc.
                                //
                                // For now, this gets us going :-)
                                //
                                daGame.syncData(webData.tabId, parseXml(webData.requestForm.xml[0]), parseXml(response.body));
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    });
            }
            break;

        default:
            break;
    }
}

/*
 ** investigateTabs
 */
function investigateTabs(onInstall = false) {
    if (exPrefs.debug) console.log("Investigate Tabs");
    chrome.tabs.query({}, function(tabs) {
        if (exPrefs.debug) console.log("Investigate Tabs", tabs);
        for (var i = tabs.length - 1; i >= 0; i--) {
            onNavigation(tabs[i], tabs[i].status);
        }
    });
}

/*
 ** onNavigation
 */
function onNavigation(info, status) {
    let url = urlObject({
        'url': info.url
    });
    let site = isGameURL(info.url);
    let tab = (info.hasOwnProperty('tabId') ? info.tabId : info.id);

    if (site && tab && !webData.tabId) {
        webData.tabId = tab;
        if ((exPrefs.syncDebug) && webData.bugId != webData.tabId)
            debuggerAttach();
    }

    // since the injection is done at a later time, we need to inject the auto portal login code first
    if (site == 'portal' && exPrefs.autoPortal) {
        console.log("injecting auto portal login");
        chrome.tabs.executeScript(tab, {
                file: '/manifest/content_portal_login.js',
                allFrames: false,
                frameId: 0
            },
            function(results) {
                console.log('executeScript:', results);
            });
    }
}

/*
 ** isGameURL - Test for a known game URL
 */
function isGameURL(string) {
    for (key in gameUrls) {
        if (wildCompare(string, gameUrls[key] + '*'))
            return key;
    }

    return false;
}

/*
 ** Show Status on the Extension Badge
 */
function badgeStatus() {
    if ((exPrefs.autoData) || gameSniff) {
        chrome.browserAction.setBadgeText({
            text: ((!exPrefs.autoData) && gameSniff) ? chrome.i18n.getMessage("badgeOn") : ""
        });
        badgeColor('grey');
    } else {
        chrome.browserAction.setBadgeText({
            text: chrome.i18n.getMessage("badgeOff")
        });
        badgeColor('grey');
    }
}

/*
 ** Handle requests from the game page
 */
function onMessage(request, sender, sendResponse) {
    var status = 'ok',
        result = null;

    if (exPrefs.debug) console.log(request, sender);

    switch (request.cmd) {
        case 'setPref':
            if (request.hasOwnProperty('name') && request.hasOwnProperty('value')) {
                exPrefs[request.name] = request.value;
                chrome.storage.sync.set(exPrefs);
            } else {
                status = 'error';
                result = false;
                break;
            }
            /* NO break; */
        case 'getPref':
            if (!exPrefs.hasOwnProperty(request.name)) {
                if (!request.hasOwnProperty('default')) {
                    status = 'error';
                    result = false;
                } else
                    result = request.default;
            } else
                result = exPrefs[request.name];
            break;
        case 'getPrefs':
            result = exPrefs;
            break;
        case 'show':
            showIndex();
            break;
        case 'reload':
            gameData = true; // Mark for forced data capture
            badgeStatus();
            chrome.tabs.reload(sender.tab.id);
            break;
        case 'i18n':
            if (exPrefs.hasOwnProperty(request.name))
                result = daGame.i18n(request.name);
            break;
        case 'string':
            if (exPrefs.hasOwnProperty(request.name))
                result = daGame.string(request.name);
            break;
        case 'getNeighbours':
            result = daGame ? daGame.getNeighbours() : {};
            break;
        case 'friends-captured':
            // delegate daGame to handle this
            daGame.friendsCaptured(request.mode, request.data);
            break;
        case 'sendValue':
            chrome.tabs.sendMessage(sender.tab.id, request);
            break;
        default:
            status = 'error';
            result = 'Invalid command: ' + request.cmd;
            break;
    }
    if (exPrefs.debug)
        console.log('Status', status, 'Result', result);
    sendResponse({
        status: status,
        result: result
    });

    return false; // all synchronous responses
}

/*
 ** END
 *******************************************************************************/