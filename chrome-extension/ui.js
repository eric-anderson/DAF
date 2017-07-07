'use strict';
console.log('ui');

// main page
// https://www.facebook.com/lists/170460713449620?dpr=2&ajaxpipe=1&ajaxpipe_token=AXh2enW_hcqy3CWv&quickling[version]=2990821%3B0%3B&__user=100014570768803&__a=1&__dyn=7AmajEzUGByA5Q9UoHaEWC5ER6yUmyVbGAFp8yeqrYw8ovyui9zob4q2i5U4e2DgaUZ1ebkwy6UnGiex3BKuEjKexKcxaFQEd8HDBxe6rCxaLGqu545KczUO5u5od8tyECQum2m4oqyUfe5FL-4VZ1G7WAxx4ypKbG5pK5EG68GVQh1q4988VEf8Cu4rGUkJ6x7yoyEW9GcwnVFbw&__af=iw&__req=jsonp_9&__be=-1&__pc=PHASED%3ADEFAULT&__rev=2990821&__adt=9
var objectURLs = {};
var playerID = 0;
var lastFriends, lastDerived;

window.onload = onLoad;

function onLoad() {
    sorttable.makeSortable(document.getElementById('friendsTable'));
    reprocess();
}

function reprocess() {
    console.log('loading rawData...');
    chrome.storage.local.get(['rawData', 'lastDownload', 'playerID', 'derived', 'friendlistData'], gotRaw);
}

function gotRaw(items) {
    document.getElementById('friendSelect').onchange = function() { friendsToTable(lastFriends, lastDerived); };
    if (typeof items.rawData != 'string') {
        console.log('rawData is not string?', items);
        return;
    }
    var parts = processRaw(items);
    if (parts === undefined) {
	console.log('error: processRaw failed');
        return;
    }
    replaceDownloadElement('neighboursXML', parts.neighbours);
    replaceDownloadElement('giftsXML', parts.gifts);
    replaceDownloadElement('friendlistData', items.friendlistData);

    var friends = parseNeighboursXML(parts.neighbours);
    var gifts = parseGiftsXML(parts.gifts);
    items.derived = deriveState(items.derived, friends, gifts, items.lastDownload, items.playerID);
    console.log('derived', items.derived);
    replaceDownloadElement('derivedJSON', JSON.stringify(items.derived));
    chrome.storage.local.set({derived: items.derived});
    friendsToTable(friends, items.derived);
    friendsToGodChildrenTable(friends);
    friendsAboutToExpire(friends);
    lastDerived = items.derived;
    lastFriends = friends;
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

    var gifts = filterXML(items.rawData, 'un_gifts');
    if (gifts === undefined) {
	console.log("Internal error, unable to find un_gifts in raw data");
	return undefined;
    }
    
    return { neighbours: neighbours, gifts: gifts };
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
    console.log('neighbours.xmldoc', xmlDoc);
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

function parseGiftsXML(gifts) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(gifts, 'text/xml');
    console.log('gifts.xmlDoc', xmlDoc);
    var items = xmlDoc.getElementsByTagName('item');
    var gift_received = {};
    for (var i = 0; i < items.length; i++) {
        var g = items.item(i);
	var sender_id, gift_id;
        for (var j = 0; j < g.childNodes.length; j++) {
            var n = g.childNodes.item(j);
	    if (n.nodeName == 'sender_id') {
		sender_id = parseInt(n.innerHTML);
	    } else if (n.nodeName == 'gift_id') {
		gift_id = parseInt(n.innerHTML);
	    }
	}
	if (sender_id && gift_id) {
	    gift_received[sender_id] = gift_id;
	}
    }

    console.log('gift_received', gift_received);

    return gift_received;
}

var selectToFn = {
    nonGifter: selectNonGifter,
    all: function() { return true; },
    active: selectActive,
    miscTest: selectMiscTest,
    newFriend: selectNewFriend,
};

function selectNonGifter(f, d) {
    var now = Math.floor(Date.now()/1000);
    if (d.firstSeen > now -  7 * 24 * 3600) {
        return false; // everyone gets a free pass for a week
    }
    if (f.c_list == "1") {
        return false; // everyone still on custom list gets free pass
    }
    var rec_gift = parseInt(f.rec_gift);
    if (rec_gift > now - 2 * 24 * 3600) {
        return false; // everyone gifting in the last 2 days is ok
    }
    if (d.gifts[2] >= 28/2) {
        return false; // everyone above 50% long-term is ok
    }
    var days = 7;
    var lt33 = 0;
    for (var i = 0; i < 3; i++) {
        if (d.gifts[i] >= 0 && d.gifts[i] < days / 3) {
            lt33++;
        }
        days = days * 2;
    }
    if (lt33 >= 2 && rec_gift < now - 4 * 24 * 3600) {
        return true; // < 33% gifting in at least 2 of the 3 periods; 4 days since last gift
    }
    return false;
}

function selectActive(f, d) {
    return d.gifts[1] >= 13 && d.gifts[2] >= 26;
}

function selectMiscTest(f, d) {
    var now = Math.floor(Date.now()/1000);
    var rec_gift = parseInt(f.rec_gift);
    var back = d.giftReceived.length > 0 ? d.giftReceived[d.giftReceived.length-1] : 0;
    if (rec_gift != 0 || d.gifts[0] < 5 || (now - back) > 3*86400) {
	return false;
    }
    console.log(d.name, d.gifts[0], '@', now - back, d, f);
    return true;
}

function selectNewFriend(f, d) {
    var now = Math.floor(Date.now()/1000);
    if (d.firstSeen > now -  2 * 24 * 3600) {
        return true; // everyone recent
    }
    return false;
}

function friendsToTable(friends, derived) {
    var selectHow = document.getElementById('friendSelect').value;
    var selectFn = selectToFn[selectHow];
    if (!selectFn) {
        console.log('internal error, missing', selectHow);
        selectFn = selectToFn['all'];
    }
            
    var tbody = document.getElementById('friendsTableBody');
    tbody.innerHTML = '';
    var now = Math.floor(Date.now()/1000);
    var count = 0;
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];

        if (f.level == 1 && f.uid == 1 || f.uid == playerID) { // Mr. Bill
            continue;
        }
        var d = derived.friends[f.uid];

        if (!selectFn(f, d)) {
            continue;
        }
        count++;

        var name = getName(f);
        var gift_age = dayAge(now, parseInt(f.rec_gift));
        var url = 'http://facebook.com/' + f.fb_id;
        var fb_href = '<a href="' + url + '">' + escapeHTML(name) + '</a>';
        if (f.c_list == "1") {
          fb_href = '<B>' + fb_href + '</B>';
        }
        var friend_age = dayAge(now, d.firstSeen);
        if (gift_age <= 20 || (friend_age <= 14 && gift_age >= 500)) {
//            continue;
        }
        var g7d = tableGiftCount(d.gifts[0], 7);
        var g14d = tableGiftCount(d.gifts[1], 14);
        var g28d = tableGiftCount(d.gifts[2], 28);

        tbody.appendChild(makeRow('td', [ fb_href, parseInt(f.level), gift_age, g7d, g14d, g28d, friend_age ]));
    }
    document.getElementById('friendCount').innerHTML = count + ' friends';
}

function getName(f) {
    var name = f.name + " " + f.surname
    if (name == ' ') {
        name = '(unknown, id ' + f.uid + ')';
    }
    return name;
}

function tableGiftCount(count, max) {
    if (count < 0) {
        return '';
    }
    if (count > max) {
        return max;
    }
    return count;
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

function deriveState(derived, inFriends, gifts, lastDownloadMS, playerID) {
    var lastUTS = parseInt((lastDownloadMS/1000).toFixed(0)); // unix time stamp
    derived = deriveInit(derived);

    if (derived.lastUpdate == lastUTS) {
        return derived;
    }

    if (lastUTS < (Date.now() / 1000 - 86400)) {
	console.log("ERROR, lastUTS more than a day ago?!", lastUTS);
	return;
    }
    
    if (inFriends[inFriends.length-1].uid == playerID && inFriends[inFriends.length-2].uid == 1) {
        // ok, Player & Mr. Bill
    } else {
        console.log("derivation internal error", inFriends[inFriends.length-1], inFriends[inFriends.length-2]);
        return derived;
    }

    var friends = inFriends.slice(0, -2);

    deriveFirstLastSeen(derived, friends, lastUTS);
    deriveGiftTracking(derived, friends, gifts, lastUTS);

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
	if (d.firstSeen == 0) {
	    d.firstSeen = lastUTS;
	}
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
	if (d.name == 'Diggy Archer') {
	    console.log(d);
	}
    }

    for (var id in derived.friends) {
        if (!derived.friends.hasOwnProperty(id)) {
            continue;
        }
        var d = derived.friends[id];
        if (!seen[id] && !d.hasOwnProperty('lastSeen')) {
            d.lastSeen = lastUTS;
            console.log('friend', id, 'disappeared', d);
        }
    }
}

function deriveGiftTracking(derived, friends, gifts, lastUTS) {
    var prevUTS = derived.giftTracked.length == 0 ? 0 : derived.giftTracked[derived.giftTracked.length - 1];

    if (prevUTS == lastUTS) {
        deriveGiftTrackingSummary(derived, lastUTS);
        console.log('no deriving to do');
        return;
    }
    deriveGiftTrackingReceived(derived, friends, gifts, prevUTS, lastUTS);
    deriveGiftTrackingSummary(derived, lastUTS);
    var recentWarn = /^At \w+ Jun/;
    for (var id in derived.friends) {
        if (!derived.friends.hasOwnProperty(id)) {
            continue;
        }
        var d = derived.friends[id];
        if (d.hasOwnProperty('warning')) {
            if (d.warning.match(recentWarn)) {
                console.log('Warning', d.warning, d);
            }
        }
    }
    derived.giftTracked.push(lastUTS);
}

function deriveGiftTrackingReceived(derived, friends, gifts, prevUTS, lastUTS) {
    var count = { noActiveNoRec: 0, noActiveRec: 0, activeNoRec: 0, activeRec: 0, noRec: 0, rec: 0, noActive: 0, active: 0, delayedGift: 0, outOfOrderGift: 0, noGifts: 0, outOfOrderSeen: 0, outOfOrderNotSeen: 0, properOrderGift: 0 };
    var fUid = {};
    // Thu 12:30 -- no sends; noActiveNoRec 2182 ; noActiveRec 684 ; activeNoRec 680 ; activeRec 1300
    //           -- identical on reload
    // after accept --        noActiveNoRec 2723 ; noActiveRec 1786 ; activeNoRec 139 ; activeRec 198
    //     14:01 -- gifts 566 ; noActiveNoRec 2584 ; noActiveRec 1702 ; activeNoRec 278 ; activeRec 282
    // next day       Final counts: gifts 2000 ; noActiveNoRec 1418 ; noActiveRec 1448 ; activeNoRec 1444 ; activeRec 536 ; rec 1984 ; noRec 2862 ; active 1980 ; noActive 2866 ; giftNotFriend 20
    // after accept   Final counts: gifts 1981 ; noActiveNoRec 2098 ; noActiveRec 793 ; activeNoRec 764 ; activeRec 1191 ; rec 1984 ; noRec 2862 ; active 1955 ; noActive 2891 ; giftNotFriend 26
    // slightly later Final counts: gifts 2000 ; noActiveNoRec 2091 ; noActiveRec 781 ; activeNoRec 771 ; activeRec 1203 ; rec 1984 ; noRec 2862 ; active 1974 ; noActive 2872 ; giftNotFriend 26
    // evening        Final counts: gifts 1589 ; noActiveNoRec 1795 ; noActiveRec 1478 ; activeNoRec 1067 ; activeRec 506 ; rec 1984 ; noRec 2862 ; active 1573 ; noActive 3273 ; giftNotFriend 16
    // saturday       Final counts: gifts 2000 ; noActiveNoRec 2048 ; noActiveRec 829 ; activeNoRec 813 ; activeRec 1154 ; rec 1983 ; noRec 2861 ; active 1967 ; noActive 2877 ; giftNotFriend 33
    // sat evening    Final counts: gifts 2000 ; noActiveNoRec 2048 ; noActiveRec 829 ; activeNoRec 813 ; activeRec 1154 ; rec 1983 ; noRec 2861 ; active 1967 ; noActive 2877 ; giftNotFriend 33
    // sun            Final counts: gifts 2000 ; noActiveNoRec 2002 ; noActiveRec 869 ; activeNoRec 859 ; activeRec 1114 ; rec 1983 ; noRec 2861 ; active 1973 ; noActive 2871 ; giftNotFriend 27
    // mon            Final counts: gifts 2000 ; noActiveNoRec 1546 ; noActiveRec 1325 ; activeNoRec 1316 ; activeRec 658 ; rec 1983 ; noRec 2862 ; active 1974 ; noActive 2871 ; giftNotFriend 26
    // mon2           Final counts: gifts 2000 ; noActiveNoRec 2036 ; noActiveRec 831 ; activeNoRec 826 ; activeRec 1152 ; rec 1983 ; noRec 2862 ; active 1978 ; noActive 2867 ; giftNotFriend 22
    // mon3           Final counts: gifts 172 ; noActiveNoRec 2772 ; noActiveRec 1902 ; activeNoRec 90 ; activeRec 81 ; rec 1983 ; noRec 2862 ; active 171 ; noActive 4674 ; giftNotFriend 1
    console.log('processing', friends.length, 'friends with', Object.keys(gifts).length,'gifts');
    var delayedGift = [];
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];
        var d = derived.friends[f.uid];
	delete d.warning;  // warnings broken right now
	fUid[f.uid] = true;

        if (!d.giftTrackStart) {
            d.giftTrackStart = lastUTS;
        }
        if (!d.hasOwnProperty('giftReceived')) {
            d.giftReceived = [];
        }
        var rec_gift = parseInt(f.rec_gift);
        var back = d.giftReceived.length == 0 ? 0 : d.giftReceived[d.giftReceived.length-1];
	if (rec_gift == 0) {
	    count.noRec++;
	    if (back == 0) {
		count.noGifts++;
	    } else if (gifts[f.uid]) {
		count.active++;
		count.activeNoRec++;
		// console.log('active no rec', f, d, 'gift', rec_gift, back, 'ts', prevUTS, lastUTS);
		if (d.lastGiftId == gifts[f.uid]) {
		    // console.log('duplicate gift id');
		    rec_gift = back;
		    f.rec_gift = back;
		} else {
		    if (d.lastGiftId && d.lastGiftId > gifts[f.uid]) {
			// console.log('old? gift id', d.lastGiftId, gifts[f.uid], f, d);
		    } else {
			// console.log('new gift id', d.lastGiftId, gifts[f.uid], f, d);
		    }

		    d.lastGiftId = gifts[f.uid];
		    rec_gift = lastUTS;
		    f.rec_gift = lastUTS;
		}
	    } else {
		count.noActive++;
		count.noActiveNoRec++;
		// no rec_gift, so use the tracking data
		rec_gift = back;
		f.rec_gift = back;
	    }
	} else {
	    count.rec++;
	    if (gifts[f.uid]) {
		count.active++;
		count.activeRec++;
		// got rec_gift and active gift
		if (!d.lastGiftId || gifts[f.uid] > d.lastGiftId) {
		    d.lastGiftId = gifts[f.uid];
		}
	    } else {
		count.noActive++;
		count.noActiveRec++;
		// console.log('got rec_gift, missing gift entry', f);
	    }
	}
	if (rec_gift == 0) {
	    if (back == 0) {
		continue;
	    }
	    console.log('did not fix', rec_gift, back, f, d, gifts[f.uid]);
	    throw "FIXME";
	}

        if (back == rec_gift) {
            // unchanged; ignore
        } else {
            // - 120 to give a little time for the download; seeing a bunch
            // of cases where the timestamp for the downloaded data is a little
            // behind the timestamp we store, and so we see occasional out of
            // orders that aren't real.
            if (back < rec_gift) {
		if (rec_gift < prevUTS - 120) {
                    d.warning = 'At ' + (new Date()).toString() + ' uid=' + f.uid + ' Delayed gift notification prev=' + back + ' cur=' + rec_gift + ' < prevUTS=' + prevUTS + ' by ' + (prevUTS - rec_gift) + '; curUTS=' + lastUTS;
                    if (count.delayedGift < 5) {
			console.log('DelayedGift',f,d,d.warning);
		    }
		    count.delayedGift++;
		    delayedGift.push(prevUTS - rec_gift);
		} else {
		    count.properOrderGift++;
		}
                d.giftReceived.push(rec_gift); // new
            } else {
                d.warning = 'At ' + (new Date()).toString() + ' Out of order gifts: ' + back + ' > ' + rec_gift;
                if (d.giftReceived.includes(rec_gift)) {
                    d.warning = d.warning + ' not seen before';
                    d.giftReceived.push(rec_gift);
                    d.giftReceived.sort(function(a,b) { return a - b; });
		    count.outOfOrderNotSeen++;
                } else {
                    d.warning = d.warning + ' already seen';
		    count.outOfOrderSeen++;
                }
		if (count.outOfOrderGift < 5) {
		    console.log('OutOfOrderGift', f,d,d.warning);
		}
		count.outOfOrderGift++;
            }
            // console.log('id',f.uid,'rg',rec_gift, d);
        }
    }
    var giftNotFriend = 0;
    for (var i in gifts) {
	if (!gifts.hasOwnProperty(i)) {
	    continue;
	}
	if (fUid[i]) {
	    // console.log('have friend', i, 'derived', derived.friends[i]);
	} else {
	    ++giftNotFriend;
	    console.log('missing friend from ', i, ' derived ', derived.friends[i]);
	} 
    }
    console.log('Final counts: gifts', Object.keys(gifts).length, '; noActiveNoRec', count.noActiveNoRec, '; noActiveRec', count.noActiveRec, '; activeNoRec', count.activeNoRec, '; activeRec', count.activeRec, '; rec', count.rec, '; noRec', count.noRec, '; active', count.active, '; noActive', count.noActive, '; giftNotFriend', giftNotFriend, '; delayedGift', count.delayedGift, '; outOfOrderGift', count.outOfOrderGift, '; noGifts', count.noGifts, '; outOfOrderSeen', count.outOfOrderSeen, '; outOfOrderNotSeen', count.outOfOrderNotSeen, '; properOrderGift', count.properOrderGift);
    if (delayedGift.length > 0) {
	var n = delayedGift.length;
        delayedGift.sort(function(a,b) { return a - b; });
	// not actually correct quantiles but close enough.
	// Final counts: gifts 64 ; noActiveNoRec 393 ; noActiveRec 4384 ; activeNoRec 0 ; activeRec 62 ; rec 4446 ; noRec 398 ; active 62 ; noActive 4777 ; giftNotFriend 2 ; delayedGift 76 ; outOfOrderGift 755 ; noGifts 5 ; outOfOrderSeen 755 ; outOfOrderNotSeen 0
	// Delayed gift: 10%: 30165 ; 50%: 84376 ; 90%: 91395 ; 95%: 92298 ; max: 92921
	// Final counts: gifts 329 ; noActiveNoRec 395 ; noActiveRec 4120 ; activeNoRec 0 ; activeRec 324 ; rec 4444 ; noRec 400 ; active 324 ; noActive 4515 ; giftNotFriend 5 ; delayedGift 231 ; outOfOrderGift 414 ; noGifts 5 ; outOfOrderSeen 414 ; outOfOrderNotSeen 0
	// Delayed gift: 10%: 38650 ; 50%: 76842 ; 90%: 86648 ; 95%: 88498 ; max: 91878	
	// Final counts: gifts 1697 ; noActiveNoRec 380 ; noActiveRec 2780 ; activeNoRec 0 ; activeRec 1676 ; rec 4456 ; noRec 386 ; active 1676 ; noActive 3160 ; giftNotFriend 21 ; delayedGift 1404 ; outOfOrderGift 0 ; noGifts 6 ; outOfOrderSeen 0 ; outOfOrderNotSeen 0 ; properOrderGift 132
	// Delayed gift: 10%: 45583 ; 50%: 67747 ; 90%: 83035 ; 95%: 85738 ; max: 92757
	// Final counts: gifts 246 ; noActiveNoRec 378 ; noActiveRec 4213 ; activeNoRec 0 ; activeRec 245 ; rec 4458 ; noRec 384 ; active 245 ; noActive 4591 ; giftNotFriend 1 ; delayedGift 264 ; outOfOrderGift 0 ; noGifts 6 ; outOfOrderSeen 0 ; outOfOrderNotSeen 0 ; properOrderGift 20
	// Delayed gift: 10%: 48792 ; 50%: 82592 ; 90%: 89554 ; 95%: 90486 ; max: 92987
	// Final counts: gifts 472 ; noActiveNoRec 379 ; noActiveRec 3989 ; activeNoRec 0 ; activeRec 469 ; rec 4458 ; noRec 384 ; active 469 ; noActive 4368 ; giftNotFriend 3 ; delayedGift 231 ; outOfOrderGift 0 ; noGifts 5 ; outOfOrderSeen 0 ; outOfOrderNotSeen 0 ; properOrderGift 18
	// Delayed gift: 10%: 53036 ; 50%: 83222 ; 90%: 89385 ; 95%: 90393 ; max: 92622
	// Final counts: gifts 1586 ; noActiveNoRec 375 ; noActiveRec 2892 ; activeNoRec 0 ; activeRec 1570 ; rec 4462 ; noRec 380 ; active 1570 ; noActive 3267 ; giftNotFriend 16 ; delayedGift 897 ; outOfOrderGift 0 ; noGifts 5 ; outOfOrderSeen 0 ; outOfOrderNotSeen 0 ; properOrderGift 114
	// Delayed gift: 10%: 38947 ; 50%: 72665 ; 90%: 86046 ; 95%: 88354 ; max: 92743

	console.log('Delayed gift: 10%:', delayedGift[Math.floor(n * 0.1)], '; 50%:', delayedGift[Math.floor(n* 0.5)], '; 90%:',
		    delayedGift[Math.floor(n*0.9)], '; 95%:', delayedGift[Math.floor(n*0.95)], '; max:', delayedGift[n-1]);
    }
//    throw "fail";
}

function deriveGiftTrackingSummary(derived, lastUTS) {
    var weeks = [1, 2, 4, 8];
    var allCounts = weeks.map(function() { return []; });
    var tmp = 0;
    for (var id in derived.friends) {
        if (!derived.friends.hasOwnProperty(id) || derived.friends[id].lastSeen) {
            continue;
        }
//        if (tmp++ > 200) {
//            break;
//        }
        var gifts = countGifts(derived.friends[id], lastUTS, weeks);
        for (var i = 0; i < weeks.length; i++) {
            allCounts[i].push(gifts[i]);
        }
        derived.friends[id].gifts = gifts;
//        if (gifts[2] == 0) {
//            console.log('deriving for', id, derived.friends[id], gifts);
//        }
    }
    // sorts biggest to smallest
    allCounts.forEach(function(e) { e.sort(function(a, b) { return b - a; }) });
    // remove all the -1's at the end.
    allCounts.forEach(function(e) {
        var i = e.length - 1;
        for(; i >= 0 && e[i] < 0; i--) { }
        i++;
        if (i < e.length) {
            // console.log('splice from', i, e[i]);
            e.splice(i, e.length - i);
        }
    });
    var targetCount = [];
    for (var i = 0; i < weeks.length; i++) {
        var len = allCounts[i].length;
        if (len < 10) { // not enough data; skip
            targetCount.push(-1);
        } else {
            var days = weeks[i] * 7; // actual "max"
            var max = allCounts[i][Math.floor(len * 0.1)];
            if (max > days) { // counting overcounts by up to a day
                max = days;
            }
            targetCount.push(max);
        }
    }
    derived.targetCount = targetCount;

    console.log('allCounts', allCounts, 'targetCount', targetCount);
}

function countGifts(friend, lastUTS, weeks) {
    var day = 24*60*60;
    var week = 7 * day;
    var count = [];
    var j = friend.giftReceived.length - 1;
    for (var i = 0; i < weeks.length; i++) {
        var min = lastUTS - (weeks[i] * week + day);
        if (min < friend.giftTrackStart) {
            // console.log('stopCG', min, friend.giftTrackStart);
            break;
        }
        if (i == 0) {
            count[i] = 0;
        } else {
            count[i] = count[i-1];
        }
        for (; j >= 0 && min <= friend.giftReceived[j]; j--) {
            count[i]++;
        }
        // console.log('countCG', weeks[i], 'weeks', count[i], 'gifts, stop at', j, (j>=0 ? friend.giftReceived[j] : -1), min);
    }
    for (; count.length < weeks.length; ) {
        count.push(-1);
    }
    // console.log('finalCG', count);
    return count;
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
