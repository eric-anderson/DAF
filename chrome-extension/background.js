console.log('setup on before request at',(new Date()).toString());

var pending = undefined;
var generatorFilter = { urls: [ 'https://diggysadventure.com/miner/generator.php?rnd=*' ] };

// chrome.webRequest.onBeforeRequest.addListener(debuggerHack, { urls: [ 'https://www.facebook.com/lists/*' ] });

chrome.webRequest.onBeforeRequest.addListener(
    onBeforeRequest, generatorFilter, ['requestBody']);

// https://scontent-dft4-1.xx.fbcdn.net/v/t1.0-1/p200x200/11403043_1606890676253923_8535430944263986045_n.jpg?oh=5d14923a13b107c63adb29def884d7cd&oe=59836EE6
// chrome.webRequest.onBeforeRequest.addListener(blockProfilePhotos, { urls: [ 'https://*.fbcdn.net/*' ] }, ['blocking']);
    

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
    var max_elapsed_ms = 11 * 3600 * 1000;
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
    console.log('Stored raw response for', pending.requestID);
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


////////////////////////// DEBUGGER HACK

var attach = false;

function debuggerHack(info) {
    console.log('dh', info.url);
    if (attach) {
        console.log('skip-dh', info.url);
        return;
    }
    if (!info.url.includes('/lists/170')) {
        return;
    }
    attach = true;
    chrome.debugger.attach({tabId: info.tabId}, "1.0", function() { onAttach(info.tabId) });
}

function onAttach(tabID) {
    chrome.debugger.sendCommand({tabId: tabID}, 'Network.enable');
    chrome.debugger.onEvent.addListener(function(a,b,c) { onDebuggerEvent(tabID,a,b,c); });
    console.log('oa', tabID);
}

var networkRequests = {};

function onDebuggerEvent(tabID, bugInfo, message, params) {
    if (tabID != bugInfo.tabId) {
        return;
    }
    if (message == 'Network.requestWillBeSent') {
        // console.log('Requesting', params.request.url, 'id', params.requestId);
        networkRequests[params.requestId] = { url: params.request.url };
    } else if (message == 'Network.loadingFinished') {
        var p = networkRequests[params.requestId];
        if (p !== undefined) {
            // console.log('GotResponse', p.url, 'id', params.requestId);
            chrome.debugger.sendCommand({tabId: tabID}, "Network.getResponseBody", { requestId: params.requestId }, function(r) { gotData(p.url, r); });
        } else {
            console.log('Missing request', params.requestId);
        }
    } else {
        // console.log('ode', bugInfo, message, params);
    }
}

// https://www.facebook.com/ajax/typeahead/first_degree.php?dpr=2&viewer=100014570768803&filter[0]=user&filter[1]=page&options[0]=include_s&options[1]=nm&options[2]=sort_alpha&options[3]=likes_only&token=v7&context=friend_list_members_lp&request_id=d89097ee-95f6-4841-aebe-1ce47dec8185&__user=100014570768803&__a=1&__dyn=7AmajEzUGByA5Q9UoHaEWC5ER6yUmyVbGAEG8zCC-C267UDAyoeAq2i5U4e2CEaUZ1ebkwy6UnGiex3BKuEjKexKcxaFQ3uaVVojxCVEiHWCDxi5-czUO5u5o5aayrhVo9ohxGbwYUmC_UjDQ6EvGi64i9CUKEly8myE8XDh45EgAwzCwYypUhKHxiQq4UC8Geyqz85-qiU&__af=iw&__req=m&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2990926
// https://www.facebook.com/ajax/typeahead/first_degree.php?dpr=2&viewer=100014570768803&filter[0]=user&filter[1]=page&options[0]=include_s&options[1]=nm&options[2]=sort_alpha&options[3]=likes_only&token=v7&context=friend_list_members_lp&request_id=d89097ee-95f6-4841-aebe-1ce47dec8185&__user=100014570768803&__a=1&__dyn=7AmajEzUGByA5Q9UoHaEWC5ER6yUmyVbGAEG8zCC-C267UDAyoeAq2i5U4e2CEaUZ1ebkwy6UnGiex3BKuEjKexKcxaFQ3uaVVojxCVEiHWCDxi5-czUO5u5o5aayrhVo9ohxGbwYUmC_UjDQ6EvGi64i9CUKEly8myE8XDh45EgAwzCwYypUhKHxiQq4UC8Geyqz85-qiU&__af=iw&__req=m&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2990926

function gotData(url, response) {
    if (typeof response.body != 'string') {
        console.log('nsr',response);
    }
    var firstmatch = true;
    var names = ['Lamminmaki', 'Mittelstaedt', 'Mounia', 'Celinha', 'Finocchiaro', 'Botrugno', 'Eriksson', 'Benjaminsson', 'Leeuwen', 'Klimecka'];
    for (var i = 0; i < names.length; i++) {
        if (response.body.includes(names[i])) {
            if (firstmatch) {
                console.log('FIRSTMATCH');
                firstmatch = false;
            }
            console.log('Found', names[i], 'in', url);
        }
    }
    if (!firstmatch) {
        console.log('trying to store', response.body.length,'bytes');
        chrome.storage.local.set({friendlistData: response.body}, function() { console.log('stored'); });
    }
}
