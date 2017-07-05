/*
** DA Friends - background.js
*/
const storageSpace = "5,242,880";

var exPrefs = {
    debug: false,
    cssTheme: 'default',
    cacheFiles: true,
    autoPortal: true,       // portalLogin
    autoClick: false,
    autoFocus: true,        // loadFocus
    autoData: true,         // monitor:
    gameDebug: true,        // useDebugger
    gameSync: false,        // keepSync
    gameLang: 'EN',
    gameNews: null,
    gameSite: null,
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

/*
** Get extension settings and initialize
*/
chrome.storage.sync.get(exPrefs, function(loaded)
{
   if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
   }else {
      exPrefs = loaded;
   }
   if (exPrefs.debug) console.info("exPrefs", exPrefs);
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
               chrome.runtime.sendMessage({ cmd: 'exPrefs', name: key, changes: changes[key]});
               if (exPrefs.debug) console.log(key, changes[key].oldValue, '->', changes[key].newValue);
            }else
               continue;
         }

         // Anything to do per specific preference change?
         switch(key) {
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
    "*://portal.pixelfederation.com/_da/miner/*.php*"
]};

const pageFilters = {
  url: [
    { urlMatches: 'apps.facebook.com/diggysadventure' },
    { urlMatches: 'portal.pixelfederation.com/(.*)/diggysadventure' },
    { urlMatches: 'wiki.diggysadventure.com' },
  ]
};

var gameUrls = {
    facebook: "https://apps.facebook.com/diggysadventure*",
    portal:   "https://portal.pixelfederation.com/*/diggysadventure*",
};

var wikiLink = "https://wiki.diggysadventure.com";
var wikiVars = "/index.php?title=";

/*
** onInstalled
*/
chrome.runtime.onInstalled.addListener(function(info)
{
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

   chrome.management.getSelf(function(self) {
      localStorage.installType = self.installType;
      self = null;
   });

   if (exPrefs.debug) console.log(chrome.app.getDetails());

   // If being updated to a different version, we may have to do
   // some processing/migration work.
   if (info.reason == 'update' && info.previousVersion != version) {
      // Do any upgrade work here if required
      if (info.previousVersion < '0.3.0.0')
      {
         var migrate = {
            portalLogin:   exPrefs.autoPortal,
            loadFocus:     exPrefs.autoFocus,
            monitor:       exPrefs.autoData,
            keepSync:      exPrefs.gameSync,
            useDebugger:   exPrefs.gameDebug
         };

         chrome.storage.sync.get(exPrefs, function(loaded) {
            if (chrome.runtime.lastError) {
               console.error(chrome.runtime.lastError.message);
            }else {
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
chrome.runtime.onStartup.addListener(function()
{
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
chrome.browserAction.onClicked.addListener(function(activeTab)
{
   if (exPrefs.debug) console.log("chrome.browserAction.onClicked", activeTab);
   chrome.tabs.query({}, function(tabs)
   {
      var doFlag = true;

      for (var i = tabs.length - 1; i >= 0; i--) {
        if (tabs[i].url.indexOf("chrome-extension://" + chrome.runtime.id + "/") != -1) {
          // we are alive, so focus it instead
          doFlag = false;
          chrome.tabs.update(tabs[i].id, {active: true});
          break;
        }
      }

      if (doFlag) { // didn't find anything, so create tab
          chrome.tabs.create({url: "/manifest/index.html", "selected": true}, function(tab)
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
    chrome.webNavigation.onCommitted.addListener(function(event) {
        onNavigation(event, 'loading');
    }, pageFilters);
    chrome.webNavigation.onCompleted.addListener(function(event) {
        onNavigation(event, 'complete');
    }, pageFilters);
}else if (1) {
    chrome.tabs.onUpdated.addListener(function(id, info, tab) {
        onNavigation(tab, info.status);
    });
}

/*
** onSuspend - Not called as we are having to be persistent at the moment
*/
chrome.runtime.onSuspend.addListener(function()
{
    if (exPrefs.debug) console.log("chrome.runtime.onSuspend");
});

/*
** onSuspendCanceled - Not called as we are having to be persistent at the moment
*/
chrome.runtime.onSuspendCanceled.addListener(function()
{
    if (exPrefs.debug) console.log("chrome.runtime.onSuspendCanceled");
});

/*
** onUpdateAvailable
*/
chrome.runtime.onUpdateAvailable.addListener(function(info)
{
    if (exPrefs.debug) console.log("chrome.runtime.onUpdateAvailable", info);
    // On persistent (background) pages, we need to call reload!
    if (isBool(localStorage.persistent))
        chrome.runtime.reload();
});

/*
** onMesage
*/
chrome.runtime.onMessage.addListener(onMessage);

/*******************************************************************************
** Supporting Functions
*/

/*
** setDataListeners
*/
function setDataListeners()
{
   // Initialise main game processor
   chrome.browserAction.setIcon({path:"/img/icon.png"});
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

   badgeStatus();
   if (exPrefs.debug) console.log("setDataListeners", localStorage);
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
                        if (exPrefs.debug) console.log("Game Site", daGame.site);
                        if (exPrefs.debug) console.log("Game News", exPrefs.gameNews);
                        if (exPrefs.debug) console.log("Game Lang", exPrefs.gameLang);
                        if (exPrefs.debug) console.log("Game Player", daGame.player_id);
                    });
                }
            }else if (url.pathname.indexOf('webgltracking.php') != -1) {
               // Are we collecting game data?
               if (!gameData) {
                    gameData = exPrefs.autoData;
               }else {
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

            // process it
            if (url.pathname == '/miner/maintenance.php') {
                daGame.notification("gameMaintenance", "gameMaintenance");
                doneOnWebRequest();
            }else if (url.pathname == '/miner/user_maintenance.php') {
                daGame.notification("userMaintenance", "userMaintenance");
                doneOnWebRequest();
            }else if (url.pathname == '/miner/synchronize.php') {
               if (reshowTab != 0) {
                 chrome.tabs.update(reshowTab, {active: true});
                 reshowTab = 0;
               }
               debuggerDetach();   // Just in case!
               webData.tabId = request.tabId;
               daGame.syncData(parseXml(webData.requestForm.xml[0]), webData);
            }else if (gameData) {
                // process it
                if (url.pathname == '/miner/generator.php') {
                    daGame.notification("dataLoading", "gameGenData", url);

                    if (exPrefs.autoFocus && webData.tabId != activeTab)
                        chrome.tabs.update(webData.tabId, {active: true});

                    if (!exPrefs.gameDebug) {
                        if (exPrefs.debug) console.log("Calling webData()", webData.requestId);
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
   // TODO: Check for JSON string messages from crome.runtime.lasterror!
   daGame.notification("dataError", "dataError", url);
   console.error(action, code, message, url);
   webData.statusLine = message;
   webData.statusCode = code;
   doneOnWebRequest();
}

function doneOnWebRequest()
{
   webData.requestId = 0;
   gameSniff = gameData = false;
   badgeStatus();
   debuggerDetach();
}

/*
** Debugger Detatch
*/
function debuggerAttach(tabId = webData.tabId)
{
    chrome.debugger.attach({ tabId: webData.tabId }, '1.0', function() {
        if (exPrefs.debug) console.log("debugger.attach");
        if (chrome.runtime.lastError) {
            errorOnWebRequest('debugger.attach',
               -1, chrome.runtime.lastError.message
            );
            return;
        }
        chrome.debugger.onEvent.addListener(debuggerEvent);
        chrome.debugger.onDetach.addListener(debuggerDetatched);
        chrome.debugger.sendCommand({tabId: webData.tabId}, "Network.enable", function(result) {
            if (exPrefs.debug) console.log("debugger.sendCommand: Network.enable");
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
function debuggerDetatched(bugId, reason)
{
    if (exPrefs.debug) console.log("debuggerDetatched", bugId, reason);
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
                if (exPrefs.debug) console.log("debuggerEvent", message, url.pathname, params);
                debuggerEvent.requestID = params.requestId;
                debuggerEvent.requestURL = url;
            }else
                ;   //console.log(params.request.url);
            break;

        case 'Network.responseReceived':
            var url = urlObject({'url': params.response.url});
            if (url.pathname == '/miner/generator.php') {
                if (exPrefs.debug) console.log("debuggerEvent", message, params);
                if (params.response.status == 200) {
                    daGame.notification("dataLoading", "gameSniffing", params.response.url);
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
                if (exPrefs.debug) console.log("debuggerEvent", bugId.tabId, debuggerEvent.requestID, message, params);

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
                    daGame.processXml(parseXml(response.body))
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
   if (exPrefs.debug) console.log("Investigate Tabs");
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
   var runAt = 'document_end';

   //if (exPrefs.debug) console.log("onNavigation", site, status, info.url);

   if (site && status == 'complete') {
      chrome.tabs.executeScript(tab, { allFrames: true, file: "/manifest/content_gm.js", runAt: runAt });
      chrome.tabs.executeScript(tab, { allFrames: true, file: "/manifest/content_da.js", runAt: runAt });
      if (exPrefs.debug) console.log("Game Injection (GM/DA)", status, runAt, tab, info.url);
   }

   if (site == 'facebook') {
      if (status != 'complete') {
         chrome.tabs.executeScript(tab, { allFrames: true, file: "/manifest/content_gm.js", runAt: runAt });
         if (exPrefs.debug) console.log("Game Injection (GM)", status, runAt, tab, info.url);
      }
      chrome.tabs.executeScript(tab, { allFrames: true, file: "/manifest/content_fb.js", runAt: runAt });
      if (exPrefs.debug) console.log("Game Injection (FB)", status, runAt, tab, info.url);
      if (exPrefs.debug) console.log('Found DA tab ' + tab + ' at ' + site);
      // only inject GCTable if debugging (developers); injects cached friends so could be transiently confusing.
      if (exPrefs.debug) { console.log('InjectGCTable from window'); daGame.injectGCTable(tab); }
   }

   var wu = urlObject({url: wikiLink});
   //console.log(url, wu);
   if (url.host == wu.host && status == 'loading') {
      runAt = 'document_start';
      chrome.tabs.executeScript(tab, { allFrames: true, file: "/manifest/content_wk.js", runAt: runAt });
      if (exPrefs.debug) console.log("Wiki Injection", status, runAt, tab, info.url);
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

/*
** Handle requests to the game page
*/
function onMessage(request, sender, sendResponse) {
    var status = 'ok', result = null;

    switch (request.cmd) {
    case 'getGCTable':
	result = daGame.getNeighbours();
	break;
    default:
        status = 'error';
	result = 'Invalid command: ' + request.cmd;
	break;
    }
    if (exPrefs.debug) {
	console.log('Status', status, 'Result', result);
    }
    sendResponse({status: status, result: result});
    return false; // all synchronous responses
}
    
/*
** END
*******************************************************************************/
