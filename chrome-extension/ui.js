'use strict';
console.log('ui');

// main page
// https://www.facebook.com/lists/170460713449620?dpr=2&ajaxpipe=1&ajaxpipe_token=AXh2enW_hcqy3CWv&quickling[version]=2990821%3B0%3B&__user=100014570768803&__a=1&__dyn=7AmajEzUGByA5Q9UoHaEWC5ER6yUmyVbGAFp8yeqrYw8ovyui9zob4q2i5U4e2DgaUZ1ebkwy6UnGiex3BKuEjKexKcxaFQEd8HDBxe6rCxaLGqu545KczUO5u5od8tyECQum2m4oqyUfe5FL-4VZ1G7WAxx4ypKbG5pK5EG68GVQh1q4988VEf8Cu4rGUkJ6x7yoyEW9GcwnVFbw&__af=iw&__req=jsonp_9&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2990821&__adt=9
var objectURLs = {};
var playerID = 0;

reprocess();

function reprocess() {
    console.log('loading rawData...');
    chrome.storage.local.get(['rawData', 'lastDownload', 'playerID', 'derived', 'friendlistData'], gotRaw);
}

function gotRaw(items) {
    if (typeof items.rawData != 'string') {
        console.log('rawData is not string?', items);
        return;
    }
    var neighbours = processRaw(items);
    if (neighbours === undefined) {
        return;
    }
    replaceDownloadElement('neighboursXML', neighbours);
    replaceDownloadElement('friendlistData', items.friendlistData);

    var friends = parseNeighboursXML(neighbours);
    items.derived = deriveState(items.derived, friends, items.lastDownload, items.playerID);
    console.log('derived', items.derived);
    replaceDownloadElement('derivedJSON', JSON.stringify(items.derived));
    chrome.storage.local.set({derived: items.derived});
    friendsToTable(friends, items.derived);
    friendsToGodChildrenTable(friends);
    friendsAboutToExpire(friends);
}

function processRaw(items) {
    console.log('rawData is', items.rawData.length, 'bytes, from', items.lastDownload);
    if (typeof items.lastDownload == 'number') {
        var lastDownload = new Date(items.lastDownload);
        var hoursAgo = (Date.now() - items.lastDownload)/(1000 * 3600);
        var at = lastDownload.toLocaleString();
        var lastSync = document.getElementById('lastSync');
        lastSync.innerHTML = '(last sync ' + hoursAgo.toFixed(1) + ' hours ago at ' + at + ')';
        var reSync = document.getElementById('reSync');
        reSync.innerHTML = 'ReSync';
        reSync.onclick = function() { chrome.storage.local.set({lastDownload: 0}); };
    } else {
        console.log("No lastDownload?!");
    }

    playerID = items.playerID;

    replaceDownloadElement('rawData', items.rawData);

    var neighbours = filterXML(items.rawData, 'neighbours');
    if (neighbours === undefined) {
        console.log("Internal error, unable to find neighbours in raw data");
        return undefined;
    }

    return neighbours;
}

function replaceDownloadElement(name, data) {
    var data = new Blob([data], {type: 'text/plain'});
    if (objectURLs.hasOwnProperty(name)) {
        window.URL.revokeObjectURL(objectURLs[name]);
    }
    var url = window.URL.createObjectURL(data);
    objectURLs[name] = url;
    document.getElementById(name).innerHTML = '<a href="' + url + '">' + name + '</a>';
}

function filterXML(raw, part) {
    var start = raw.indexOf('<' + part + '>');
    if (start == -1) {
        return undefined;
    }
    var endStr = '</' + part + '>';
    var end = raw.indexOf(endStr, start);
    if (end == -1) {
        return undefined;
    }
    return '<xml>' + raw.substring(start, end + endStr.length) + '</xml>';
}

function parseNeighboursXML(neighbours) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(neighbours, 'text/xml');
    console.log('xmlDoc', xmlDoc);
    var items = xmlDoc.getElementsByTagName('item');
    var friends = [];
    var columns = [];
    for (var i = 0; i < items.length; i++) {
        var friend = {};
        var f = items.item(i);
        for (var j = 0; j < f.childNodes.length; j++) {
            var n = f.childNodes.item(j);
            friend[n.nodeName] = n.innerHTML;
            if (i==0) {
                columns.push(n.nodeName);
            }
        }
        friends.push(friend);
    }

    console.log('columns & friends', columns, friends);

    friendsToTSV(columns, friends);

    return friends;
}

function friendsToTSV(columns, friends) {
    var tsv = [];
    tsv.push(columns.join('\t'));
    for (var i = 0; i < friends.length; i++) {
        var vals = [];
        for (var j = 0; j < columns.length; j++) {
            vals.push(friends[i][columns[j]]);
        }
        tsv.push(vals.join('\t'));
    }
    tsv.push('');
    replaceDownloadElement('neighboursTSV', tsv.join('\n'));
}

function friendsToTable(friends, derived) {
    var tbody = document.getElementById('friendsTableBody');
    tbody.innerHTML = '';
    var now = Math.floor(Date.now()/1000);
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];

        if (f.level == 1 && f.uid == 1 || f.uid == playerID) { // Mr. Bill
            continue;
        }

        var name = getName(f);
        var gift_age = dayAge(now, parseInt(f.rec_gift));
        var url = 'http://facebook.com/' + f.fb_id;
        var fb_href = '<a href="' + url + '">' + escapeHTML(name) + '</a>';
        if (f.c_list == "1") {
          fb_href = '<B>' + fb_href + '</B>';
        }
        var friend_age = dayAge(now, derived.friends[f.uid].firstSeen);
        if (gift_age <= 20 || (friend_age <= 14 && gift_age >= 500)) {
//            continue;
        }
        tbody.appendChild(makeRow('td', [ fb_href, parseInt(f.level), gift_age, friend_age ]));
    }
    sorttable.makeSortable(document.getElementById('friendsTable'));
}

function getName(f) {
    var name = f.name + " " + f.surname
    if (name == ' ') {
        name = '(unknown, id ' + f.uid + ')';
    }
    return name;
}

function makeRow(type, values) {
    var row = document.createElement('tr');

    for (var i = 0; i < values.length; i++) {
        var cell = document.createElement(type);
        cell.innerHTML = values[i];
        row.appendChild(cell);
    }

    return row;
}

function dayAge(now, old) {
    var age = Math.floor((now - old) / (24*60*60) + 0.5);
    if (age < 0) {
        age = 0;
    } else if (age > 1000) {
        age = 1000;
    }
    return age;
}

function escapeHTML(unsafe) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return unsafe.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function friendsToGodChildrenTable(friends) {
    // https://codepen.io/sambible/pen/yOqKaN for maybe how to make this wide and scrolly
    var row = document.getElementById('godChildrenRow');
    row.innerHTML = '';
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];

        if (f.spawned == 0) {
            continue;
        }

        row.appendChild(makeGodChildrenCell(f.name, f.level, f.pic_square));
    }
}

function makeGodChildrenCell(name, level, pic) {
    var cell = document.createElement('td');
    cell.setAttribute('class', 'friend');

    var img = document.createElement('img');
    img.setAttribute('width', 64);
    img.setAttribute('src', pic);
    cell.appendChild(img);
    cell.appendChild(makeGodChildrenSpan('levelbg', ''));
    cell.appendChild(makeGodChildrenSpan('level', level));
    cell.appendChild(makeGodChildrenSpan('name', name));

    return cell;
}

function makeGodChildrenSpan(sClass, text) {
    var span = document.createElement('span');
    span.setAttribute('class', sClass);
    span.innerHTML = text;
    return span;
}

function deriveState(derived, inFriends, lastDownloadMS, playerID) {
    var lastUTS = parseInt((lastDownloadMS/1000).toFixed(0)); // unix time stamp
    derived = deriveInit(derived);

    if (derived.lastUpdate == lastUTS) {
        return derived;
    }

    if (inFriends[inFriends.length-1].uid == playerID && inFriends[inFriends.length-2].uid == 1) {
        // ok, Player & Mr. Bill
    } else {
        console.log("derivation internal error", inFriends[inFriends.length-1], inFriends[inFriends.length-2]);
        return derived;
    }

    var friends = inFriends.slice(0, -2);

    deriveFirstLastSeen(derived, friends, lastUTS);
    deriveGiftTracking(derived, friends, lastUTS);

    return derived;
}

function deriveInit(derived) {
    if (derived === undefined) {
        derived = {};
    }
    if (!derived.hasOwnProperty('friends')) {
        derived.friends = {};
    }
    if (!derived.hasOwnProperty('giftTracked')) {
        derived.giftTracked = [];
    }

    return derived;
}

function deriveFirstLastSeen(derived, friends, lastUTS) {
    var seen = {};
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];
        seen[f.uid] = true;
        if (!derived.friends.hasOwnProperty(f.uid)) {
            derived.friends[f.uid] = {firstSeen: lastUTS};
            console.log('first time seeing', f);
        }
        var d = derived.friends[f.uid];
        if (d.hasOwnProperty('lastSeen')) {
            if (!d.reappearCount) {
                d.reappearCount = 0;
            }
            d.reappearCount++;
            d.firstSeen = lastUTS;
            delete d.lastSeen;
            console.log('friend reappeared', d.reappearCount, 'times', f);
        }
        d.name = getName(f);
    }

    for (var id in derived.friends) {
        if (!derived.hasOwnProperty(id)) {
            continue;
        }
        var d = derived.friends[id];
        if (!seen[id] && !d.hasOwnProperty('lastSeen')) {
            d.lastSeen = lastUTS;
            console.log('friend disappeared', d);
        }
    }
}

function deriveGiftTracking(derived, friends, lastUTS) {
    var prevUTS = derived.giftTracked.length == 0 ? 0 : derived.giftTracked[derived.giftTracked.length - 1];

    if (prevUTS == lastUTS) {
        console.log('no deriving to do');
        return;
    }
    var giftDelta = 24 * 60 * 60 * 1000;
    deriveGiftTrackingReceived(derived, friends, prevUTS, lastUTS, giftDelta);

    for (var id in derived.friends) {
        if (!derived.friends.hasOwnProperty(id)) {
            continue;
        }
        var d = derived.friends[id];
        if (d.hasOwnProperty('warning')) {
            console.log('Warning', d.warning, d);
        }
    }
    derived.giftTracked.push(lastUTS);
}

function deriveGiftTrackingReceived(derived, friends, prevUTS, lastUTS, giftDelta) {
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];
        var d = derived.friends[f.uid];
        
        if (!d.giftTrackStart) {
            d.giftTrackStart = lastUTS;
        }
        if (!d.hasOwnProperty('giftReceived')) {
            d.giftReceived = [];
        }
        var rec_gift = parseInt(f.rec_gift);
        if (rec_gift < (lastUTS - giftDelta)) {
            // console.log('dgtr', rec_gift, (lastUTS - giftDelta));
            continue;
        }
        var back = d.giftReceived.length == 0 ? 0 : d.giftReceived[d.giftReceived.length-1];
        if (back == rec_gift) {
            // unchanged; ignore
        } else {
            // - 120 to give a little time for the download; seeing a bunch
            // of cases where the timestamp for the downloaded data is a little
            // behind the timestamp we store, and so we see occasional out of
            // orders that aren't real.
            if (rec_gift < prevUTS - 120) {
                d.warning = 'At ' + (new Date()).toString() + ' Delayed gift notification ' + rec_gift + ' < ' + prevUTS + ' by ' + (prevUTS - rec_gift);
                console.log('CrossCheck',f,d,d.warning);
            }
            if (back < rec_gift) {
                d.giftReceived.push(rec_gift); // new
            } else {
                d.warning = 'At ' + (new Date()).toString() + ' Out of order gifts: ' + back + ' > ' + rec_gift;
                if (d.giftReceived.includes(rec_gift)) {
                    d.warning = d.warning + ' not seen before';
                    d.giftReceived.push(rec_gift);
                    d.giftReceived.sort(function(a,b) { return a - b; });
                } else {
                    d.warning = d.warning + ' already seen';
                }
            }
            // console.log('id',f.uid,'rg',rec_gift, d);
        }
    }
}

function friendsAboutToExpire(friends) {
    return;
    var nowSeconds = (Date.now() / 1000).toFixed(0);
    var twoDaysAgo = nowSeconds - 2 * 24 * 3600;
    var min = twoDaysAgo - 20 * 60;
    var max = min + 1 * 60 * 60;
    console.log('miscFriends',min,max);
    var expire = [];
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];
        var rec = parseInt(f.rec_gift);
        if (rec >= min && rec <= max) {
            expire.push(f);
        }
    }
    // 1493317983 1493321583
    // Jozsef Nagy(1493488230), Ray-De Oh(1493485310), Karina Oliveira(1493489059),
    // Christine Delvallee(1493492762), Valery Antonov(1493485891)
    expire.sort(function(a, b) { return parseInt(a.rec_gift) - parseInt(b.rec_gift); });
    //expire.sort(function(a, b) { return a.name < b.name ? -1 : 1; });
    for (var i = 0; i < expire.length; i++) {
        var f = expire[i];
        var rec = parseInt(f.rec_gift);
        var foureight = rec + 2 * 24 * 3600;
        console.log('Friend',f.name, f.surname, 'level', f.level, 'will expire at', (new Date(foureight*1000)).toString());
    }
}
