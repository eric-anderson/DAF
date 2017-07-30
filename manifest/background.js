/*
 ** DA Friends - background.js
 */
const storageSpace = "5,242,880";

var exPrefs = {
    debug: false,
    toolbarStyle: 2,
    fullWindow: false,
    cssTheme: 'default',
    cacheFiles: true,
    autoPortal: true,
    autoClick: false,
    autoFocus: true,
    autoData: true,
    gameDebug: true,
    gameSync: false,
    gameLang: 'EN',
    gameNews: null,
    gameSite: null,
    gcTable: false,
    gcTableSize: 'large',
    gcTableFlipped: true,
    tabIndex: 0,
    nFilter: 'NG',
    cFilter: 'ALL',
    crownGrid: false,
    capCrowns: true,
    trackGift: true,
    hidePastEvents: false,
    hideGiftTime: true,
    toggle_camp1: '',
    toggle_camp2: ''
};

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
const facebook_friends_re = /\/www.facebook.com\/[^\/]+\/friends/;
/*
 ** Get extension settings and initialize
 */
chrome.storage.sync.get(exPrefs, function (loaded) {
    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
    } else {
        exPrefs = loaded;
    }
    if (exPrefs.debug) console.info("exPrefs", exPrefs);
});

/*
 ** Monitor for prefrence changes etc.
 */
chrome.storage.onChanged.addListener(function (changes, area) {
    // Any changes to 'sync' storage? - If so, update our status etc.
    // We also need to track changes from the injected content script(s)
    //
    if (area == 'sync') {
        for (var key in changes) {
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
                case 'gameSync':
                    daGame.syncScript();
                    break;
                default: break;
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
var resumedTimer = window.setTimeout(function () {
    if (exPrefs.debug) console.log("resumedTimer - Fired!");
    investigateTabs();
    setDataListeners();
}, 110);

/*******************************************************************************
 ** Event Handlers/Listeners
 */
const sniffFilters = {
    urls: [
        "*://diggysadventure.com/*.php*",
        "*://portal.pixelfederation.com/_da/miner/*.php*",
        "*://www.facebook.com/dialog/apprequests?app_id=470178856367913&*"
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
chrome.runtime.onInstalled.addListener(function (info) {
    if (exPrefs.debug) console.log("chrome.runtime.onInstalled", info);

    // Cancel our resumed timer, as we initialize within here!
    if (resumedTimer)
        window.clearTimeout(resumedTimer);
    resumedTimer = null;

    var persistent = chrome.app.getDetails().background.persistent;
    var versionName = chrome.app.getDetails().version_name;
    var version = chrome.app.getDetails().version;
    var now = new Date();

    // Save information
    localStorage.timeUpdated = now;
    localStorage.version = version;
    localStorage.versionName = (typeof versionName === 'undefined') ? version : versionName;
    localStorage.persistent = (typeof persistent === 'undefined') ? true : persistent;

    chrome.management.getSelf(function (self) {
        localStorage.installType = self.installType;
        self = null;
    });

    if (exPrefs.debug) console.log(chrome.app.getDetails());

    // If being updated to a different version, we may have to do
    // some processing/migration work.
    if (info.reason == 'update' && info.previousVersion != version) {
        // Do any upgrade work here if required
        if (info.previousVersion < '0.3.0.0') {
            var migrate = {
                portalLogin: exPrefs.autoPortal,
                loadFocus: exPrefs.autoFocus,
                monitor: exPrefs.autoData,
                keepSync: exPrefs.gameSync,
                useDebugger: exPrefs.gameDebug
            };

            chrome.storage.sync.get(exPrefs, function (loaded) {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                } else {
                    exPrefs.autoPortal = loaded.portalLogin;
                    exPrefs.autoFocus = loaded.loadFocus;
                    exPrefs.autoData = loaded.monitor;
                    exPrefs.gameSync = loaded.keepSync;
                    exPrefs.gameDebug = loaded.useDebugger;

                    if (!exPrefs.debug) {
                        chrome.storage.sync.remove('tabNeighbours');
                        chrome.storage.sync.remove('tabFriendship');
                        chrome.storage.sync.remove('tabCamp');
                        chrome.storage.sync.remove('tabCrowns');
                        chrome.storage.sync.remove('tabOptions');
                        chrome.storage.sync.remove('fbTimout');
                        chrome.storage.sync.remove('fbFriends');
                        chrome.storage.sync.remove('version');
                        chrome.storage.sync.remove('lastTime');
                        chrome.storage.sync.remove('lastSite');
                        chrome.storage.sync.remove('fFilter');
                        chrome.storage.sync.remove(Object.keys(migrate));
                    }
                }
                chrome.storage.sync.set(exPrefs);
                investigateTabs(true);
                setDataListeners();

            });

            return;
        }
    }

    investigateTabs(true);
    setDataListeners();
});

/*
 ** onStartup
 */
chrome.runtime.onStartup.addListener(function () {
    if (exPrefs.debug) console.log("chrome.runtime.onStartup");

    // Cancel our resumed timer, as we initialize within here!
    if (resumedTimer)
        window.clearTimeout(resumedTimer);
    resumedTimer = null;

    localStorage.timeStarted = new Date();
    setDataListeners();
});

/*
 ** browserAction.onClicked
 */
chrome.browserAction.onClicked.addListener(function (activeTab) {
    if (exPrefs.debug) console.log("chrome.browserAction.onClicked", activeTab);
    showIndex();
});

function showIndex() {
    chrome.tabs.query({}, function (tabs) {
        var doFlag = true;

        for (var i = tabs.length - 1; i >= 0; i--) {
            if (tabs[i].url.indexOf("chrome-extension://" + chrome.runtime.id + "/") != -1) {
                // we are alive, so focus it instead
                doFlag = false;
                chrome.tabs.update(tabs[i].id, {
                    active: true
                });
                break;
            }
        }

        if (doFlag) { // didn't find anything, so create tab
            chrome.tabs.create({
                url: "/manifest/index.html",
                "selected": true
            }, function (tab) {});
        }
    });
}

/*
 ** tabs.onActivated
 */
chrome.tabs.onActivated.addListener(function (info) {
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
    chrome.webNavigation.onCommitted.addListener(function (event) {
        onNavigation(event, 'loading');
    }, pageFilters);
    chrome.webNavigation.onCompleted.addListener(function (event) {
        onNavigation(event, 'complete');
    }, pageFilters);
} else if (1) {
    chrome.tabs.onUpdated.addListener(function (id, info, tab) {
        onNavigation(tab, info.status);
    });
}

/*
 ** onSuspend - Not called as we are having to be persistent at the moment
 */
chrome.runtime.onSuspend.addListener(function () {
    if (exPrefs.debug) console.log("chrome.runtime.onSuspend");
});

/*
 ** onSuspendCanceled - Not called as we are having to be persistent at the moment
 */
chrome.runtime.onSuspendCanceled.addListener(function () {
    if (exPrefs.debug) console.log("chrome.runtime.onSuspendCanceled");
});

/*
 ** onUpdateAvailable
 */
chrome.runtime.onUpdateAvailable.addListener(function (info) {
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
function setDataListeners() {
    // Initialise main game processor
    chrome.browserAction.setIcon({
        path: "/img/icon.png"
    });
    daGame = new window.gameDiggy();
    daGame.cachedData().then(function () {
        //daGame.testData();
    });

    // Listen for web requests to detect the game traffic
    chrome.webRequest.onBeforeRequest.addListener(function (info) {
        onWebRequest('before', info);
    }, sniffFilters, ['requestBody']);
    chrome.webRequest.onSendHeaders.addListener(function (info) {
        onWebRequest('headers', info);
    }, sniffFilters, ['requestHeaders']);
    chrome.webRequest.onCompleted.addListener(function (info) {
        onWebRequest('complete', info);
    }, sniffFilters, ['responseHeaders']);
    chrome.webRequest.onErrorOccurred.addListener(function (info) {
        onWebRequest('error', info);
    }, sniffFilters);

    badgeStatus();
    if (exPrefs.debug) console.log("setDataListeners", localStorage);
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
                        if ((webData.requestForm) && webData.requestForm.hasOwnProperty('player_id'))
                            daGame.player_id = webData.requestForm.player_id[0]
                    } catch (e) {}

		    delete daGame.daUser.time_generator_local;
                    // Using the debugger?
                    if (exPrefs.gameDebug) {
                        debuggerAttach(webData.tabId);
                    }
                    chrome.tabs.get(webData.tabId, function (tab) {
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
                debuggerDetach(); // Just in case!
                webData.tabId = request.tabId;
                daGame.syncData(parseXml(webData.requestForm.xml[0]), webData);
            } else if (url.pathname == '/dialog/apprequests' && url.search.indexOf('app_id=470178856367913&') >= 0) {
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
		    daGame.daUser.time_generator_local = Math.floor((new Date())/1000);
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
                        daGame.gameData(request.url, form).then(function (success) {
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
    daGame.notification("dataError", "dataError", url);
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

/*
 ** Debugger Detatch
 */
function debuggerAttach(tabId = webData.tabId) {
    chrome.debugger.attach({
        tabId: webData.tabId
    }, '1.0', function () {
        if (exPrefs.debug) console.log("debugger.attach");
        if (chrome.runtime.lastError) {
            errorOnWebRequest('debugger.attach', -1, chrome.runtime.lastError.message);
            return;
        }
        chrome.debugger.onEvent.addListener(debuggerEvent);
        chrome.debugger.onDetach.addListener(debuggerDetatched);
        chrome.debugger.sendCommand({
            tabId: webData.tabId
        }, "Network.enable", function (result) {
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
        }, function () {
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
            } else
            ; //console.log(params.request.url);
            break;

        case 'Network.responseReceived':
            var url = urlObject({
                'url': params.response.url
            });
            if (url.pathname == '/miner/generator.php') {
                if (exPrefs.debug) console.log("debuggerEvent", message, params);
                if (params.response.status == 200) {
                    daGame.notification("dataLoading", "gameSniffing", params.response.url);
                    debuggerEvent.requestID = params.requestId;
                    debuggerEvent.requestURL = url;
                } else {
                    debuggerEvent.requestID = 0;
                    errorOnWebRequest('debugger.' + message,
                        params.response.statusCode,
                        params.response.statusText,
                        url
                    );
                }
            }
            break;

        case 'Network.loadingFinished':
            if (debuggerEvent.requestID == params.requestId) {
                if (exPrefs.debug) console.log("debuggerEvent", bugId.tabId, debuggerEvent.requestID, message, params);

                chrome.debugger.sendCommand({
                        tabId: bugId.tabId
                    },
                    "Network.getResponseBody", {
                        "requestId": params.requestId
                    },
                    function (response) {
                        if (chrome.runtime.lastError) {
                            errorOnWebRequest('debugger.' + message, -1,
                                chrome.runtime.lastError.message,
                                debuggerEvent.requestURL
                            );
                            return;
                        }
                        debuggerEvent.requestID = 0;
                        debuggerDetach();
                        daGame.processXml(parseXml(response.body)).then(function (success) {
                            if (exPrefs.debug) console.log("Success:", success, webData.tabId);
                            chrome.tabs.sendMessage(webData.tabId, {
                                cmd: 'gameDone'
                            });
                        });
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
    chrome.tabs.query({}, function (tabs) {
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
    var url = urlObject({
        'url': info.url
    });
    var site = isGameURL(info.url);
    var tab = (info.hasOwnProperty('tabId') ? info.tabId : info.id);

    if (true || exPrefs.debug) console.log("onNavigation", site, status, info.url);

    if (site && status == 'complete') {
        //daGame.inject(tab);
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

    console.log(request, sender);

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
            result = daGame.getNeighbours();
            break;
        case 'saveFacebookFriends':
            if (typeof request.fbFriends == 'object' && request.fbFriends.at > 0) {
		daGame.daUser.facebookFriends = request.fbFriends;
		result = 'ok';
	    } else {
		console.log('fail');
		status = 'error';
		result = 'Bad sFF request';
	    }
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

// Inject content javascript in development mode only
if (localStorage.installType == 'development') {
    chrome.tabs.query({}, function (tabs) {
        tabs.forEach(tab => {
            if (isGameURL(tab.url)) {
                chrome.tabs.executeScript(tab.id, {
                    file: '/manifest/content_tab.js',
                    allFrames: false,
                    frameId: 0
                });

                chrome.webNavigation.getAllFrames({
                    tabId: tab.id
                }, function(frames) {
                    for (var i = 0; i < frames.length; i++) {
                        if (frames[i].parentFrameId == 0 && frames[i].url.includes('/miner/')) {
                            chrome.tabs.executeScript(tab.id, {
                                file: '/manifest/content_da.js',
                                allFrames: false,
                                frameId: frames[i].frameId
                            });
                        }
                    }
                });
            }
	    if (tab.url.match(facebook_friends_re)) {
		console.log('ERIC found fb friends');
                chrome.tabs.executeScript(tab.id, {
                    file: '/manifest/content_facebook_friends.js',
                    allFrames: false,
                    frameId: 0
                });
	    }
        });
    });
}

/*
 ** END
 *******************************************************************************/
