console.log('setup on before request at',(new Date()).toString());

var pending = undefined;
var lastDebugger = 0;

chrome.webRequest.onBeforeRequest.addListener(
    obrSetupDebugger, { urls: [ 'https://diggysadventure.com/miner/img/header_menu/logo.png' ]});

chrome.browserAction.onClicked.addListener(function() {
    chrome.tabs.create({ url: chrome.extension.getURL('ui.html') });
});

chrome.debugger.onEvent.addListener(onDebuggerEvent);

function obrSetupDebugger(info) {
    if (!pending) {
        console.log('setting up debugger for', info.tabId);
        chrome.debugger.attach({tabId: info.tabId}, '1.0', function() { onDebuggerAttach(info.tabId); });
    } else {
        console.log('already pending, no attach again');
    }
}    

function onDebuggerAttach(tabId) {
    console.log('debugger attached', tabId);
    if (chrome.runtime.lastError) {
        console.log('oda', chrome.runtime.lastError);
        return;
    }
    console.log('network enable', tabId);
    chrome.debugger.sendCommand({tabId: tabId}, "Network.enable");
}

function onDebuggerEvent(info, message, params) {
    if (message == 'Network.requestWillBeSent') {
        if (params.request.url.includes('://diggysadventure.com/miner/generator.php?rnd')) {
            pending = null;
            console.log('N.rWBS', params.requestId, params.request.url, params);
            var pd = params.request.postData;
            if (!pd) {
                console.log('no pd');
            } else {
                var s = 'player%5Fid=';
                var n = pd.indexOf(s);
                if (n >= 0) {
                    pd = pd.substring(n + s.length, pd.length);
                    console.log('eric', pd);
                    n = pd.indexOf('&');
                    if (n >= 0) {
                        pd = pd.substr(0, n);
                        console.log('eric2', pd);
                    }
                    var id = parseInt(pd);
                    if (id) {                       
                        pending = { playerID: id, tabId: info.tabId };
                    }
                }
            }
            if (!pending) {
                console.log('did not init, aborting');
                chrome.debugger.detach({tabId: info.tabId}, onDebuggerDetach);
                return;
            }
            pending.generatorReqId = params.requestId;
        }
    }
    if (pending == null) {
        // console.log('pending null');
        return;
    }
    if (message == 'Network.loadingFinished' && pending.generatorReqId == params.requestId) {
        console.log('sendGRB', pending.tabId, info.tabId, params.requestId, info, params);
        chrome.debugger.sendCommand({tabId: info.tabId}, 'Network.getResponseBody',
                                    { 'requestId': params.requestId }, getResponseBody);
    }
}

function getResponseBody(response) {
    console.log('gRB', pending, response);
    chrome.debugger.detach({tabId: pending.tabId}, onDebuggerDetach);
    if (response.body.length < 10 * 1000) {
        console.log('Only got', http.responseText.length, 'bytes back; assuming broken');
        console.log(http.responseText);
        pending = null;
        return;
    }
    chrome.storage.local.set({lastDownload: Date.now(), rawData: response.body, playerID: pending.playerID}, onStored);
}    
    
function onDebuggerDetach() {
    console.log('debugger detached');
}

function onStored() {
    console.log('Stored raw response for', pending.playerID);
    pending = undefined;
}
