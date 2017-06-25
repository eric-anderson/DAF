/*
** DA Friends - background.js
*/
const storageSpace = "5,242,880";
var debug = false;
var exPrefs = {
    debug: debug,
    cssTheme: 'default',
    daFullWindow: false,
    cacheFiles: true,
    autoPortal: true,       // portalLogin
    autoClick: false,
    autoFocus: false,       // loadFocus
    autoData: true,         // monitor:
    gameDebug: true,        // useDebugger
    gameSync: false,        // keepSync
    gameLang: 'EN',
    gameSite: null,
    tabIndex: 0,
    nFilter: 14,
    fFilter: 0,
    cFilter: 'ALL',
    tabNeighbours: true,
    tabFriendship: false,
    tabCamp: false,
    tabCrowns: true,
    tabOptions: true
};

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

/*
** Get extension settings and initialize
*/
chrome.storage.sync.get(exPrefs, function(loaded)
{
   if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
   }else {
      exPrefs = loaded;
      debug = exPrefs.debug = true;
      exPrefs.autoData = true;
      exPrefs.gameSync = false;
      exPrefs.gameDebug = false;
      exPrefs.autoFocus = true;
      exPrefs.cacheFiles = true;
   }
   if (debug) console.info("exPrefs", exPrefs);
});

/*
** Monitor for prefrence changes etc.
*/
chrome.storage.onChanged.addListener(function(changes, area)
{
   // Any changes to 'sync' storage? - If so, update our status etc.
   // We also need to track changes from the injected content script(s)
   //
   if (area == 'sync') {
      for (var key in changes) {
         if (exPrefs.hasOwnProperty(key)) {
            if (exPrefs[key] != changes[key].newValue) {
               exPrefs[key] = changes[key].newValue;
               if (debug) console.log(key, changes[key].oldValue, '->', changes[key].newValue);
            }else
               continue;
         }

         // Anything to do per specific preference change?
         switch(key) {
            case 'debug':     debug = exPrefs[key];      break;
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
chrome.browserAction.setIcon({path:"/img/iconGrey.png"});
var resumedTimer = window.setTimeout(function() {
    if (debug) console.log("resumedTimer - Fired!");
    investigateTabs();
    setDataListeners();
}, 110);

/*******************************************************************************
** Event Handlers/Listeners
*/
const sniffFilters = {
  urls: [
    "*://diggysadventure.com/*.php*",
    "*://portal.pixelfederation.com/_da/miner/*.php*"
]};

const pageFilters = {
  url: [
    { urlMatches: 'apps.facebook.com/diggysadventure' },
    { urlMatches: 'portal.pixelfederation.com/(.*)/diggysadventure' },
  ]
};

const gameUrls = {
    facebook: "https://apps.facebook.com/diggysadventure*",
    portal:   "https://portal.pixelfederation.com/*/diggysadventure*",
};

/*
** onInstalled
*/
chrome.runtime.onInstalled.addListener(function(info)
{
   if (debug) console.log("chrome.runtime.onInstalled", info);

    // Cancel our resumed timer, as we initialize within here!
   if (resumedTimer)
      window.clearTimeout(resumedTimer);
   resumedTimer = null;

   var persistent = chrome.app.getDetails().background.persistent;
   var versionName = chrome.app.getDetails().version_name;
   var version = chrome.app.getDetails().version;
   var now = new Date();

   // If being updated to a different version, we may have to do
   // some processing/migration work.
   if (info.reason == 'update' && info.previousVersion != version) {
      // Do any upgrade work here if required
      if (info.previousVersion < '0.3.0.0') {
         delete exPrefs['fbTimout'];
         chrome.storage.sync.remove('fbTimout');
         delete exPrefs['fbFriends'];
         chrome.storage.sync.remove('fbFriends');
         delete exPrefs['version'];
         chrome.storage.sync.remove('version');
         delete exPrefs['lastTime'];
         chrome.storage.sync.remove('lastTime');
         delete exPrefs['lastSite'];
         chrome.storage.sync.remove('lastSite');

         if (exPrefs.hasOwnProperty('loadFocus')) {
            exPrefs.autoFocus = exPrefs.loadFocus;
            delete exPrefs['loadFocus'];
         }
         chrome.storage.sync.remove('loadFocus');
         if (exPrefs.hasOwnProperty('portalLogin')) {
            exPrefs.autoPortal = exPrefs.portalLogin;
            delete exPrefs['portalLogin'];
         }
         chrome.storage.sync.remove('portalLogin');
         if (exPrefs.hasOwnProperty('monitor')) {
            exPrefs.autoData = exPrefs.monitor;
            delete exPrefs['monitor'];
         }
         chrome.storage.sync.remove('monitor');
         if (exPrefs.hasOwnProperty('keepSync')) {
            exPrefs.gameSync = exPrefs.keepSync;
            delete exPrefs['keepSync'];
         }
         chrome.storage.sync.remove('keepSync');
         if (exPrefs.hasOwnProperty('useDebugger')) {
            exPrefs.gameDebug = exPrefs.useDebugger;
            delete exPrefs['useDebugger'];
         }
         chrome.storage.sync.remove('useDebugger');
         //localstorage.clear();   // !!!!!!
      }
   }

    // Save information
    localStorage.timeUpdated = now;
    localStorage.version = version;
    localStorage.versionName = (typeof versionName === 'undefined') ? version : versionName;
    localStorage.persistent = (typeof persistent === 'undefined') ? true : persistent;

    chrome.management.getSelf(function(self) {
        localStorage.installType = self.installType;
        self = null;
    });

    if (debug) console.log(chrome.app.getDetails());
    investigateTabs(true);
    setDataListeners();
});

/*
** onStartup
*/
chrome.runtime.onStartup.addListener(function()
{
    if (debug) console.log("chrome.runtime.onStartup");

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
chrome.browserAction.onClicked.addListener(function(activeTab)
{
   if (debug) console.log("chrome.browserAction.onClicked", activeTab);
   chrome.tabs.query({}, function(tabs)
   {
      var doFlag = true;

      for (var i = tabs.length - 1; i >= 0; i--) {
        if (tabs[i].url.indexOf("chrome-extension://" + chrome.runtime.id + "/") != -1) {
          // we are alive
          doFlag = false;
          chrome.tabs.update(tabs[i].id, {active: true}); //focus it
          break;
        }
      }

      if (doFlag) { // didn't find anything, so create tab
          chrome.tabs.create({url: "index.html", "selected": true}, function(tab)
          {
          });
      }
   });
});

/*
** tabs.onActivated
*/
chrome.tabs.onActivated.addListener(function(info)
{
   activeTab = info.tabId;
});

/*
** webNavigation.onCompleted/tabs.onUpdated
*/
if (typeof chrome.webNavigation !== 'undefined') {
    chrome.webNavigation.onCompleted.addListener(function(event) {
        onNavigation(event, 'loading');
    }, pageFilters);
}else if (1) {
    chrome.tabs.onUpdated.addListener(function(id, info, tab) {
        onNavigation(tab, info.status);
    });
}

/*
** onSuspend
*/
chrome.runtime.onSuspend.addListener(function()
{
    if (debug) console.log("chrome.runtime.onSuspend");
});

/*
** onSuspendCanceled
*/
chrome.runtime.onSuspendCanceled.addListener(function()
{
    if (debug) console.log("chrome.runtime.onSuspendCanceled");
});

/*
** onUpdateAvailable
*/
chrome.runtime.onUpdateAvailable.addListener(function(info)
{
    if (debug) console.log("chrome.runtime.onUpdateAvailable", info);
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
function setDataListeners()
{
   // Initialise main game processor
   daGame = new window.gameDiggy();
   daGame.cachedData().then(function() {
      //daGame.testData();
   });

   // Listen for web requests to detect the game traffic
   chrome.webRequest.onBeforeRequest.addListener(function(info) {
     onWebRequest('before', info);
   }, sniffFilters, ['requestBody']);
   chrome.webRequest.onSendHeaders.addListener(function(info) {
     onWebRequest('headers', info);
   }, sniffFilters, ['requestHeaders']);
   chrome.webRequest.onCompleted.addListener(function(info) {
     onWebRequest('complete', info);
   }, sniffFilters, ['responseHeaders']);
   chrome.webRequest.onErrorOccurred.addListener(function(info) {
     onWebRequest('error', info);
   }, sniffFilters);

   chrome.browserAction.setIcon({path:"/img/icon.png"});
   badgeStatus();
   if (debug) console.log("setDataListeners", localStorage);
}

/*
** onWebRequest
*/
function onWebRequest(action, request)
{
    var url = urlObject({'url': request.url});

    // What's going on then?
    switch (action) {
        case 'before':
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
                  }catch(e){}

                    // Using the debugger?
                    if (exPrefs.gameDebug) {
                        debuggerAttach(webData.tabId);
                    }
                    chrome.tabs.get(webData.tabId, function (tab) {
                        daGame.site = isGameURL(tab.url);
                        if (exPrefs.gameSite === null) {
                           exPrefs.gameSite = daGame.site;
                           chrome.storage.sync.set({gameSite: daGame.site});
                        }
                        if (exPrefs.debug) console.log("Game Lang", exPrefs.gameLang);
                        if (exPrefs.debug) console.log("Game Site", daGame.site);
                        if (exPrefs.debug) console.log("Game Player", daGame.player_id);
                    });
                }
            }else if (url.pathname == '/miner/webgltracking.php') {

               // Are we collecting game data?
               if (!gameData) {
                    gameData = exPrefs.autoData;
               }else {
                    // Must be a forced data collection!
                    if (debug) console.log("Forced Data Collection Detected");
               }

               if (gameData) {
                  daGame.notification("gameLoading", chrome.i18n.getMessage("gameLoading"));
                  gameSniff = true;
                  badgeStatus();
                  // Need to switch to the game tab?
                  if (exPrefs.autoFocus) {
                     if (reshowTab == 0 && webData.tabId != activeTab)
                        reshowTab = activeTab;
                     chrome.tabs.update(webData.tabId, {active: true});
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

            //if (debug) console.log("onWebRequest", action, gameData, url.pathname, webData, request);

            // process it
            if (url.pathname == '/miner/maintenance.php') {
                daGame.notification("gameMaintenance", chrome.i18n.getMessage("gameMaintenance"));
                errorOnWebRequest(action, 'game', 'maintenance', url);
            }else if (url.pathname == '/miner/user_maintenance.php') {
                daGame.notification("userMaintenance", chrome.i18n.getMessage("userMaintenance"));
                errorOnWebRequest(action, 'user', 'maintenance', url);
            }else if (url.pathname == '/miner/synchronize.php') {

               if (reshowTab != 0) {
                 chrome.tabs.update(reshowTab, {active: true});
                 reshowTab = 0;
               }

                debuggerDetach();   // Just in case!
                if (exPrefs.autoData && exPrefs.gameSync) {
                    webData.tabId = request.tabId;
                    daGame.syncData(webData, parseXml(webData.requestForm.xml[0]));
                }
            }else if (gameData) {
                // process it
                if (url.pathname == '/miner/generator.php') {
                    daGame.notification("dataLoading", chrome.i18n.getMessage("gameGenData"), url);

                    if (exPrefs.autoFocus && webData.tabId != activeTab)
                        chrome.tabs.update(webData.tabId, {active: true});

                    if (!exPrefs.gameDebug) {
                        console.log("Calling webData()", webData.requestId);
                        var form = new FormData();
                        for (key in webData.requestForm) {
                            form.append(key, webData.requestForm[key]);
                        }
                        daGame.gameData(request.url, form);
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
function errorOnWebRequest(action, code, message, url = null)
{
    daGame.notification("dataError", chrome.i18n.getMessage("dataError"), url);
    gameSniff = gameData = false;
    badgeStatus();

    // TDO: Check for JSON string messages from crome.runtime.lasterror!

    webData.requestId = 0;
    webData.statusCode = code;
    webData.statusLine = message;
    debuggerDetach();
    console.error(action, code, message, url);
}

/*
** Debugger Detatch
*/
function debuggerAttach(tabId = webData.tabId)
{
    chrome.debugger.attach({ tabId: webData.tabId }, '1.0', function() {
        if (debug) console.log("debugger.attach");
        if (chrome.runtime.lastError) {
            var error = JSON.parse(chrome.runtime.lastError.message);
            errorOnWebRequest('debugger.attach',
                error.code,
                error.message
            );
            return;
        }
        chrome.debugger.onEvent.addListener(debuggerEvent);
        chrome.debugger.onDetach.addListener(debuggerDetatched);
        chrome.debugger.sendCommand({tabId: webData.tabId}, "Network.enable", function(result) {
            if (debug) console.log("debugger.sendCommand: Network.enable");
            if (chrome.runtime.lastError) {
                errorOnWebRequest('debugger.Network.enable',
                    -1, chrome.runtime.lastError.message
                );
                return;
            }
            webData.bugId = webData.tabId;
        });
    });
}

/*
** Debugger Detatch
*/
function debuggerDetach()
{
    if (webData.bugId) {
        chrome.debugger.detach({ tabId: webData.bugId }, function()
        {
            webData.bugId = 0;
            if (debug) console.log("debugger.detatch");
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
function debuggerDetatched(bugId, reason)
{
    if (debug) console.log("debuggerDetatched", bugId, reason);
    if (bugId.tabId == webData.tabId) {
        webData.bugId = 0;
        errorOnWebRequest('debugger.detatched', -2, reason);
    }
}

/*
** Debugger "Event" Handler
*/
function debuggerEvent(bugId, message, params)
{
    switch (message) {
        case 'Network.requestWillBeSent':
            var url = urlObject({'url': params.request.url});
            if (url.pathname == '/miner/generator.php') {
                if (debug) console.log("debuggerEvent", message, url.pathname, params);
                debuggerEvent.requestID = params.requestId;
                debuggerEvent.requestURL = url;
            }else
                ;   //console.log(params.request.url);
            break;

        case 'Network.responseReceived':
            var url = urlObject({'url': params.response.url});
            if (url.pathname == '/miner/generator.php') {
                if (debug) console.log("debuggerEvent", message, params);
                if (params.response.status == 200) {
                    daGame.notification("dataLoading", chrome.i18n.getMessage("gameSniffing"), params.response.url);
                    debuggerEvent.requestID = params.requestId;
                    debuggerEvent.requestURL = url;
                }else {
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
                if (debug) console.log("debuggerEvent", bugId.tabId, debuggerEvent.requestID, message, params);

                chrome.debugger.sendCommand({tabId: bugId.tabId},
                "Network.getResponseBody", {
                "requestId": params.requestId }, function(response)
                {
                    if (chrome.runtime.lastError) {
                        errorOnWebRequest('debugger.' + message,
                            -1,
                            chrome.runtime.lastError.message,
                            debuggerEvent.requestURL
                        );
                        return;
                    }
                    debuggerEvent.requestID = 0;
                    debuggerDetach();
                    daGame.processXml(parseXml(response.body));
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
function investigateTabs(onInstall = false)
{
   console.log("Investigate Tabs");
   chrome.tabs.query({}, function(tabs) {
      for (var i = tabs.length - 1; i >= 0; i--) {
         onNavigation(tabs[i], tabs[i].status);
      }
   });
}

/*
** onNavigation
*/
function onNavigation(info, status)
{
   var url = urlObject({'url': info.url});
   var site = isGameURL(info.url);
   var tab = (info.hasOwnProperty('tabId') ? info.tabId : info.id);

   if (debug) console.log("onNavigation", site, status, info);

   var runAt = 'document_end';

   if (site && status == 'complete') {
      chrome.tabs.executeScript(tab, { allFrames: true, file: "manifest/content_gm.js", runAt: runAt });
      chrome.tabs.executeScript(tab, { allFrames: true, file: "manifest/content_da.js", runAt: runAt });
      if (debug) console.log("Game Injection (GM/DA)", status, runAt, tab, info.url);
   }

   if (site == 'facebook') {
      if (status != 'complete') {
         chrome.tabs.executeScript(tab, { allFrames: true, file: "manifest/content_gm.js", runAt: runAt });
         if (debug) console.log("Game Injection (GM)", status, runAt, tab, info.url);
      }
      chrome.tabs.executeScript(tab, { allFrames: true, file: "manifest/content_fb.js", runAt: runAt });
      if (debug) console.log("Game Injection (FB)", status, runAt, tab, info.url);
   }
}

/*
** isGameURL - Test for a known game URL
*/
function isGameURL(string)
{
    for (key in gameUrls) {
        if (wildCompare(string, gameUrls[key] + '*'))
            return key;
    }

    return false;
}

/*
** Show Status on the Extension Badge
*/
function badgeStatus()
{
    if ((exPrefs.autoData) || gameSniff) {
        chrome.browserAction.setBadgeText({text: ((!exPrefs.autoData) && gameSniff) ? chrome.i18n.getMessage("badgeOn") : ""});
        badgeColor('grey');
    }else {
        chrome.browserAction.setBadgeText({text: chrome.i18n.getMessage("badgeOff")});
        badgeColor('grey');
    }
}

if (debug) console.log("Script End");
/*
** END
*******************************************************************************/