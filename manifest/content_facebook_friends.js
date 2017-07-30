(function() {
    setup();

    var friends = [];
    var button;
    var onWeb = true;
    var lastCount, lastChange;
    var startCollect;
    
    function setup() {
	console.log('ERIC setup');
	var e = document.getElementById('medley_header_friends');
	if (e) {
	    onLoad();
	    return;
	}
	document.onload = onLoad;
    }

    function onLoad() {
	var e = document.getElementById('daf_collect_friends_list');
	if (e) {
	    console.log('Removing old element');
	    e.parentNode.removeChild(e);
	}
	e = document.getElementById('medley_header_friends');
	if (!e) {
	    console.error('Unable to find id=medley_header_friends');
	    return;
	}
	button = document.createElement('button');
	button.appendChild(document.createTextNode('Collect for DA Friends'));
	button.setAttribute('id', 'daf_collect_friends_list');
	e.appendChild(button);
	button.onclick = onClick;
    }

    function onClick() {
	console.log('ERIC onClick');
	button.disabled = true;
	button.innerHTML = 'Collecting. Found 0 friends';
	lastCount = 0;
	lastChange = Date.now();
	startCollect = lastChange;
	setTimeout(rewrite, 500);
    }

    function rewrite() {
	var allFriendsList = getFriendsList();

	console.log('begin rewrite at', friends.length);
	for (var i = 0; i < allFriendsList.length; i++) {
            var friendsList = allFriendsList[i];

	    var chunk = [];
            for (var v = friendsList.firstElementChild; v; v = v.nextElementSibling) {
		chunk.push(v);
            }

	    while (chunk.length > 0) {
		var info = extractFriendInfo(chunk[0]);
		if (!info) {
		    console.log('no friend info', chunk[0]);
		    return;
		}
		if (!info.inactive) {
		    friends.push(info);
		    friendsList.removeChild(chunk[0]);
		}
		chunk = chunk.slice(1);
	    }
	}
	console.log('end rewrite at', friends.length);
	if (document.body.scrollTop == 0) {
	    window.scroll(0, window.innerHeight);
	} else {
	    window.scroll(0, 0);
	}
	if (friends.length != lastCount) {
	    lastCount = friends.length;
	    lastChange = Date.now();
	    button.innerHTML = 'Collecting. Found ' + lastCount + ' friends';
	}
	if (document.getElementById('pagelet_timeline_medley_movies')
	    || document.getElementById('pagelet_timeline_medley_tv')
	    || document.getElementById('pagelet_timeline_medley_music')) {
	    doneRewrite();
	} else if ((lastChange + 30 * 1000) >= Date.now()) {
	    setTimeout(rewrite, 500);
	} else {
	    console.error('Giving up.  No change to friend count in 30 seconds');
	    button.innerHTML = 'Aborted.  Error.';
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

    function walkDOM(node, fn) {
	fn(node);
	node = node.firstChild;
	while (node) {
            walkDOM(node, fn);
            node = node.nextSibling;
	}
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

    function doneRewrite() {
	button.innerHTML = 'Done.  Found ' + friends.length + ' friends.';
	chrome.runtime.sendMessage({
	    cmd: 'saveFacebookFriends',
	    fbFriends: {
		friends: friends,
		at: Math.floor(startCollect/1000),
	    }
	}, function (response) {
	    if (response.status == 'ok') {
		console.log('Stored FB friends');
	    } else {
		console.error('Failed to store FB friends', response);
	    }
	});
    }
})();
