console.log('setup on before request at',(new Date()).toString());

var pending = undefined;

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

function onBeforeRequest(info) {
    if (typeof pending != 'undefined') {
        console.log('pending request', pending.requestID, 'still in progress, ignoring request', info.requestId);
        return;
    }
    var params = [];
    var f = info.requestBody.formData;
    for (var p in f) {
       if (!f.hasOwnProperty(p)) { continue; };
       params.push(p + '=' + f[p]);
    }
    console.log('Saw diggy request: ', info.url, params, info);
    pending = {
        url: info.url,
        params: params.join('&', params),
        requestID: info.requestId,
        playerID: f.player_id,
        tabId: info.tabId,
    };
    console.log('waiting for request', info.requestId, 'to complete');
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
    
function onCompleted(info) {
    if (info.requestId != pending.requestID) {
        console.log('ignoring likely XMLHttpRequest', info.requestId);
        return;
    }
    console.log('request', info.requestId, 'completed');
}

function onDebuggerDetach() {
    console.log('debugger detached');
}

function gotLastTimestamp(items) {
    if (typeof items.lastDownload != 'number') {
        items.lastDownload = 0;
    }
    var elapsed = Date.now() - items.lastDownload;
    var max_elapsed_ms = 10 * 11 * 3600 * 1000;
    if (elapsed < max_elapsed_ms) {
        console.log('too soon since last download, ' + (elapsed / 1000) + ' seconds');
        pending = undefined;
        return;
    }
    
    console.log('sending xmlHttpRequest for', pending.requestID, 'to', pending.url, 'with', pending.params);

    // Sending request after previous one has completed because we run after
    // onCompleted for the original request.

    if (false) {
        var http = new XMLHttpRequest();
        http.open('POST', pending.url, true);
        http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        http.onreadystatechange = function() { onDownload(http); }
        http.send(pending.params);
    }
}

function onDownload(http) {
    console.log('onDownload', http.readyState, http.status);
    if (http.readyState != XMLHttpRequest.DONE) {
        return;
    }
    if (http.status != 200) {
        console.log('Download of user state failed:', http.statusText);
        return;
    }
    if (http.responseText.length < 10 * 1000) {
        console.log('Only got', http.responseText.length, 'bytes back; assuming broken');
        console.log(http.responseText);
        return;
    }
    console.log('xmlHttpRequest for', pending.requestID, 'finished');
    chrome.storage.local.set({lastDownload: Date.now(), rawData: http.responseText, playerID: pending.playerID}, onStored);
}

function onStored() {
    console.log('Stored raw response for', pending.playerID);
    pending = undefined;
}

var profile_re = /xx\.fbcdn\.net\/.*\/t3?1.0-1\/.*_n\.jpg\?/;
// Robert Kubat
// https://scontent-dft4-1.xx.fbcdn.net/v/t1.0-1/17554189_196258387541605_1062308711086435103_n.jpg
// https://scontent-dft4-1.xx.fbcdn.net/v/t1.0-1/c1.0.179.179/14051772_1811805939030778_9051966790165132945_n.jpg
// https://scontent-dft4-1.xx.fbcdn.net/v/t31.0-1/c298.74.510.510/s200x200/1622312_743388235727414_8464097760327535146_o.jpg?oh=688f6e32ed98934d7c861c1fd7e68e7a&amp;oe=597909BD
// KEEP: https://scontent-dft4-1.xx.fbcdn.net/v/t1.0-1/c59.0.200.200/p200x200/10354686_10150004552801856_220367501106153455_n.jpg
function blockProfilePhotos(info) {
//    console.log(profile_re);
    if (info.url.includes('10354686_10150004552801856_220367501106153455_n.jpg')) {
        return { cancel: false };
    }
    if (info.url.match(profile_re)) {
        console.log(info);
        return { cancel: true };
    }
    if (info.url.includes('200x200')) {
        console.log(info.url);
    }
    return { cancel: false };
}
