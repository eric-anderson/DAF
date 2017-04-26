console.log('setup on before request');

var pending = undefined;
var generatorFilter = { urls: [ 'https://diggysadventure.com/miner/generator.php?rnd=*' ] };
var sent = 0;

chrome.webRequest.onBeforeRequest.addListener(
    onBeforeRequest, generatorFilter, ['requestBody']
);

chrome.webRequest.onCompleted.addListener(onCompleted, generatorFilter);

chrome.browserAction.onClicked.addListener(function() {
    chrome.tabs.create({ url: chrome.extension.getURL('ui.html') });
});

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
        playerID: f.player_id
    };
    console.log('waiting for request', info.requestId, 'to complete');
}

function onCompleted(info) {
    if (info.requestId != pending.requestID) {
        console.log('ignoring likely XMLHttpRequest', info.requestId);
        return;
    }
    console.log('request', info.requestId, 'completed');
    chrome.storage.local.get('lastDownload', gotLastTimestamp);
}

function gotLastTimestamp(items) {
    if (typeof items.lastDownload != 'number') {
        items.lastDownload = 0;
    }
    var elapsed = Date.now() - items.lastDownload;
    var max_elapsed_ms = 6 * 3600 * 1000;
    if (elapsed < max_elapsed_ms) {
        console.log('too soon since last download, ' + (elapsed / 1000) + ' seconds');
        return;
    }
    
    console.log('sending xmlHttpRequest for', pending.requestID, 'to', pending.url, 'with', pending.params);

    ++sent;
    if (sent > 1) {
        console.log('internal eric abort');
        return;
    }

    // Sending request after previous one has completed because we run after
    // onCompleted for the original request.

    var http = new XMLHttpRequest();
    http.open('POST', pending.url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.onreadystatechange = function() { onDownload(http); }
    http.send(pending.params);
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
    console.log('Stored raw response for', pending.requestID);
    pending = undefined;
}
