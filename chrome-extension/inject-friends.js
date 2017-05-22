console.log('INJECT FRIENDS');

// my fbid 110521316110227
// https://m.facebook.com/friends/center/friends
var simpleTable, convertedCount = 0, lastConvertedCountChange = Date.now();

var debugBrokenNode;
var finalize = false;
var onWeb = true;  // web or mobile website for friends

main();

function main() {
    finalize = false;
    var e;
    if (window.location.href.includes('/eric.anderson')) {
        e = document.getElementById('timeline_top_section');
        if (e == undefined) {
            console.log('error no timeline');
            return;
        }
        e = e.nextSibling;
        if (e == undefined) {
            console.log('error no nextSibling');
            return;
        }
        console.log('onWeb-true');
    } else if (window.location.href.includes('/center/friends')) {
        onWeb = false;
        e = document.getElementById('friends_center_main');
        if (e == undefined) {
            console.log('error no friends_center_main');
            return;
        }
        console.log('onWeb-false');
    } else {
        console.log('error should not be here');
        return;
    }
        
    simpleTable = makeTable();
    e.parentNode.insertBefore(simpleTable, e);
    var final = document.createElement('a');
    final.innerHTML = 'Finalize';
    final.setAttribute('href', '#');
    final.onclick = function() { finalize = true; console.log('Finalizing'); };
    e.parentNode.insertBefore(final, simpleTable);
    console.log('inserted table before', e.nextSibling);

    setTimeout(rewrite, 2000);
}

function makeTable() {
    var table = document.createElement('table');
    table.setAttribute('border', 1);
    table.appendChild(makeTableHeader());
    var tbody = document.createElement('tbody');
    tbody.setAttribute('id', 'SimpleFriendsBody');
    table.appendChild(tbody);
    return table;
}

function makeTableHeader() {
    var header = document.createElement('thead');
    header.appendChild(makeTH('Name'));
    header.appendChild(makeTH('Friends'));
    header.appendChild(makeTH('ID'));
    return header;
}

function makeTH(name) {
    var th = document.createElement('th');
    th.innerHTML = name;
    return th;
}

function walkDOM(node, fn) {
    fn(node);
    node = node.firstChild;
    while (node) {
        walkDOM(node, fn);
        node = node.nextSibling;
    }
}

function rewrite() {
    var lastConvertedCount = convertedCount;
    var allFriendsList = getFriendsList();
    // console.log('RewriteAll', allFriendsList.length);
    var seenSoFar = 0;
    var unremoved = 0;
    for (var i = 0; i < allFriendsList.length; i++) {
        var friendsList = allFriendsList[i];
        var removeTo = i < (allFriendsList.length - 1) ? 0 : 4;
        if (finalize) {
          removeTo = 0;
        }
        var friends = [];
        for (var v = friendsList.firstElementChild; v; v = v.nextElementSibling) {
            friends.push(v);
        }
        // console.log('Rewrite', i, friendsList.childNodes.length, removeTo);
        while (friends.length > removeTo) {
            // console.log('rewrite friend', friendsList.firstElementChild);
            var info = extractFriendInfo(friends[0]);
            if (info == undefined) {
                console.log('no friend info', friends[0]);
                return;
            }
            if (!info.inactive) {
                appendTableRow(info.name, info.friends, info.id);
                friendsList.removeChild(friends[0]);
                convertedCount++;
            }
            friends = friends.slice(1);
        }
        unremoved += friends.length;
    }
    console.log('Done Rewrite!', convertedCount, '+', unremoved, '=', convertedCount + unremoved);
    if (convertedCount != lastConvertedCount) {
        lastConvertedCountChange = Date.now();
    }

    var changed = Date.now() - lastConvertedCountChange;
    if (changed < 60 * 1000) {
        setTimeout(rewrite, 500);
    } else if (changed < 10 * 60 * 1000 && !finalize) {
        setTimeout(rewrite, 15 * 1000);
    } else {
        console.log("no progress for 60 seconds, stopping");
    }
}

function getFriendsList() {
    if (onWeb) {
        return getFriendsListWeb();
    } else {
        return getFriendsListMobile();
    }
}

function getFriendsListWeb() {
    var e = document.getElementById('pagelet_timeline_medley_friends');
    var friendsElem = [];
    walkDOM(e, function(n) {
        if (typeof n.getAttribute != 'function') {
            return;
        }
        if (n.getAttribute('data-pnref') == 'friends') {
            friendsElem.push(n);
        }
    });

    return friendsElem;
}

function getFriendsListMobile() {
    var e = document.getElementById('friends_center_main');
    var friendsElem = [];
    e = e.firstChild;
    while (e) {
        if (e.tagName == 'DIV' && e.firstChild != null && e.firstChild.tagName == 'DIV'
            && e.firstChild.getAttribute('data-sigil') == 'undoable-action') {
            friendsElem.push(e);
        } else {
            // console.log('Not friend div container', e);
        }
        e = e.nextSibling;
    }

    return friendsElem;
}

function extractFriendInfo(node) {
    // console.log('EFI', node);
    var ret = { };

    var fn;
    if (onWeb) {
        fn = extractFriendInfoOneNodeWeb;
    } else {
        fn = extractFriendInfoOneNodeMobile;
    }
    
    walkDOM(node, function(node) { fn(node, ret); })

    if (ret.inactive !== undefined) {
        console.log("INACTIVE", ret, node);
        return ret;
    }
    if (ret.friends == undefined) {
        ret.friends = 'UNKNOWN';
    }
    // console.log('EFI-x', name, friends, id, node);
    if (ret.name == undefined || ret.friends == undefined || ret.id == undefined) {
        console.log('no name/friends/id', ret, node);
        debugBrokenNode = node;
        return;
    }
    return ret;
}

function extractFriendInfoOneNodeWeb(node, ret) {
    if (typeof(node.getAttribute) != 'function') {
        return;
    }
    if (node.nodeName == 'A') {
        var href = node.getAttribute('href');
        if (href == undefined) {
            return;
        }
        // console.log('EFI HREF', href);
        if (href.includes('https://www.facebook.com/') && href.includes('hc_location=friends_tab')) {
            // console.log('EFI name', node);
            ret.name = node.innerHTML;
        } else if (href.includes('/browse/mutual_friends/?uid=')) {
            // console.log('EFI friends', node);
            ret.friends = node.innerHTML;
            var n = href.indexOf('uid=');
            if (n > 0) {
                ret.id = href.substring(n+4);
                //console.log('id',id);
            }
        } else if (href.endsWith('/friends')) {
            ret.friends = node.innerHTML;
        } else if (href.endsWith('&sk=friends')) {
            ret.friends = node.innerHTML;
        } else if (href == '#') {
            // console.log('1', node);
            // Tzoanna
            var ajaxify = node.getAttribute('ajaxify');
            // console.log('1a', typeof(ajaxify), ajaxify);
            if (!ajaxify) {
                // console.log('2');
                return;
            }
            // console.log('3');
            if (ajaxify.includes('/friends/inactive/')) {
                console.log('INACTIVE!', node);
                ret.inactive = true;
                var n = ajaxify.indexOf('id=');
                if (n > 0) {
                    ret.id = ajaxify.substring(n+3);
                }
            }
        }
    } else if (node.nodeName == 'BUTTON') {
        // console.log('BUTTON!', node);
        var profileid = node.getAttribute('data-profileid');
        if (profileid !== undefined) {
            ret.id = profileid;
        }
    }
}

function extractFriendInfoOneNodeMobile(node, ret) {
    if (typeof(node.getAttribute) != 'function') {
        return;
    }
    if (node.nodeName == 'A') {
        var href = node.getAttribute('href');
        if (href == undefined) {
            return;
        }
        if (href.startsWith('/') && node.parentNode != null && (node.parentNode.nodeName == 'H3' || node.parentNode.nodeName == 'H1')) {
            ret.name = node.innerHTML;
        }
    } else if (node.nodeName == 'DIV') {
        if (node.getAttribute('data-sigil') == 'm-add-friend-source-replaceable'
            && node.innerHTML.toString().includes('mutual friends')) {
            ret.friends = node.innerHTML;
        }
        var ds = node.getAttribute('data-sigil');
        if (ds != null && ds.includes('friends') && ds.includes('touchable')) {
            ds = node.getAttribute('data-store');
            if (ds != null) {
                var start = ds.indexOf('"id":') + 5;
                var end = ds.indexOf(',', start);
                ret.id = ds.substring(start, end);
                // console.log('ID', ret.id, 'from', ds);
            }
        }
    }
}

function appendTableRow(name, friends, id) {
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.innerHTML = name;
    tr.appendChild(td);
    td = document.createElement('td');
    td.innerHTML = friends;
    tr.appendChild(td);
    td = document.createElement('td');
    td.innerHTML = id;
    tr.appendChild(td);

    var tbody = document.getElementById('SimpleFriendsBody');
    // console.log('atr', tbody, tr);
    tbody.appendChild(tr);
}