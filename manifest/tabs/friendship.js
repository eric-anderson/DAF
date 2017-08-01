/*
 ** DA Friends - friendship.js
 */
var guiTabs = (function(self) {
    var tabID, ifTable, theadSaved;
    var numFriends = 0,
        numDisabled = 0,
        numNeighbours = 0,
        numMatched = 0,
        numAnalyzed = 0,
        numToAnalyze = 0;

    /*
     ** Define this tab's details
     */
    var thisTab = {
        title: 'Friendship',
        image: 'friends.png',
        order: 10,
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
        onAction: onAction
    };
    self.tabs.Friendship = thisTab;

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        // Do any one time initialisation stuff in here
        tabID = id;


        document.getElementById('ifCollect').addEventListener('click', collectFriends);
        document.getElementById('ifMatch').addEventListener('click', matchStoreAndUpdate);

        ifTable = document.getElementById('ifTable');
        guiText_i18n(ifTable);
        theadSaved = ifTable.tHead.innerHTML;

        Array.from(document.getElementsByName('fFilter')).forEach(input => {
            if (input.getAttribute('value') == bgp.exPrefs.fFilter) {
                input.setAttribute('checked', 'checked');
            } else
                input.removeAttribute('checked');

            input.addEventListener('click', function(e) {
                var filter = e.target.getAttribute('value');
                bgp.exPrefs.fFilter = filter;
                filterTable();
            });
        });

        chrome.storage.local.get(['friends', 'friendsCollectDate'], (obj) => {
            bgp.daGame.friends = (obj && obj.friends) || [];
            bgp.daGame.friendsCollectDate = (obj && obj.friendsCollectDate) || 0;
            updateTable();
        });
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
        //console.log(id, "onAction", action, data);
        if (action == 'friends-captured') {
            if (data && data.length) {
                bgp.daGame.friends = data;
                matchStoreAndUpdate();
            }
        }
    }

    function filterTable() {
        var filter = bgp.exPrefs.fFilter;
        var input = document.getElementById('fFilter' + filter);
        if (input) input.checked = true;
        ifTable.tBodies[0].setAttribute('filter', filter);
        // Dispatch the scroll event to load lazy images brought into view by the filter
        window.dispatchEvent(new Event("scroll"));
    }

    function storeFriends() {
        chrome.storage.local.set({
            friends: bgp.daGame.friends
        });
    }

    function collectFriends() {
        var width = 1000,
            height = 600;
        chrome.windows.create({
            width: width,
            height: height,
            left: Math.floor((screen.availWidth - width) / 2),
            top: Math.floor((screen.availHeight - height) / 2),
            type: 'popup',
            url: 'https://www.facebook.com/profile.php'
        }, function(w) {
            var tabId = w.tabs[0].id;
            bgp.injectFriendCollectCode(tabId);
        });
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        // We ignore an activated tab condition.
        if (reason == 'active')
            return true;

        // Called everytime the page is/needs updating
        updateTable();

        return true;
    }

    function updateTable() {
        var tbody = ifTable.getElementsByTagName("tbody")[0];
        tbody.innerHTML = '';
        ifTable.tHead.innerHTML = theadSaved;
        sorttable.makeSortable(ifTable);

        var neighbours = bgp.daGame.daUser.neighbours;
        var friends = bgp.daGame.friends instanceof Array ? bgp.daGame.friends : [];
        numFriends = friends.length;
        numNeighbours = Object.keys(neighbours).length - 1;
        numMatched = 0;
        numDisabled = 0;
        var html = [];
        var notmatched = Object.assign({}, neighbours);
        bgp.daGame.friends.forEach(friend => {
            var fb_id = friend.fb_id;
            var info = getNeighbourCellData(neighbours, friend.uid, true);
            var classes = [];
            if (friend.disabled) {
                numDisabled++;
                classes.push('friend-disabled');
            }
            if (info) classes.push('friend-matched');
            if (!info) classes.push('friend-notmatched');
            html.push('<tr id="fb-', fb_id, '" class="', classes.join(' '), '">');
            var a = getFBFriendAnchor(fb_id);
            html.push('<td>', a, '<img height="50" width="50" lazy-src="', getFBFriendAvatarUrl(fb_id), '"/></a></td>');
            html.push('<td>', a, friend.realFBname, '</a></td>');
            if (info) {
                numMatched++;
                html.push('<td>', friend.score, '</td>');
                html.push('<td>', info.anchor, info.image, '</a></td>');
                html.push('<td>', info.anchor, info.name, '</a></td>');
                html.push('<td>', info.level, '</td>');
                delete notmatched[friend.uid];
            } else {
                html.push('<td></td><td></td><td></td><td></td>');
            }
            html.push('</tr>');
        });
        delete notmatched[0];
        delete notmatched[1];
        Object.keys(notmatched).forEach(uid => {
            var info = getNeighbourCellData(neighbours, uid, true);
            if (info) {
                html.push('<tr id="nb-', uid, '" class="neighbour-notmatched">');
                html.push('<td></td><td></td><td></td>');
                html.push('<td>', info.anchor, info.image, '</a></td>');
                html.push('<td>', info.anchor, info.name, '</a></td>');
                html.push('<td>', info.level, '</td>');
                html.push('</tr>');
            }
        });

        tbody.innerHTML = html.join('');

        self.collectLazyImages();
        filterTable();

        showStats();
    }

    function getFBFriendAvatarUrl(fb_id) {
        return 'https://graph.facebook.com/v2.8/' + fb_id + '/picture';
    }

    function getFBFriendAnchor(fb_id) {
        return '<a target="_blank" href="https://www.facebook.com/' + fb_id + '">';
    }

    function getNeighbourCellData(neighbours, uid, lazy) {
        if (uid && uid in neighbours) {
            var pal = neighbours[uid];
            return {
                anchor: getFBFriendAnchor(pal.fb_id),
                image: '<img height="50" width="50" ' + (lazy ? 'lazy-' : '') + 'src="' + pal.pic_square + '"/>',
                name: getPlayerNameFull(pal),
                level: pal.level
            };
        }
    }

    function showStats() {
        var div = document.getElementsByClassName('pleaseWait')[0];
        if (div) {
            div.style.display = numToAnalyze != numAnalyzed ? 'block' : 'none';
            div.firstChild.innerText = numToAnalyze > 0 ? guiString('AnalyzingMatches', [Math.floor(numAnalyzed / numToAnalyze * 100)]) : '';
        }
        var html = [];
        if (bgp.daGame.friendsCollectDate > 0) {
            html.push('<br>');
            html.push(guiString('FriendUpdateInfo', [unixDate(bgp.daGame.friendsCollectDate, 'full')]));
        }
        if (numToAnalyze != numAnalyzed) {
            html.push('<br>');
            html.push(guiString('AnalyzingMatches', [Math.floor(numAnalyzed / numToAnalyze * 100)]));
        }
        document.getElementById('ifStats').innerHTML = html.join('');

        var params = {
            'fFilterA': [numberWithCommas(numFriends), numberWithCommas(numNeighbours)],
            'fFilterD': [numberWithCommas(numDisabled)],
            'fFilterM': [numberWithCommas(numMatched)],
            'fFilterF': [numberWithCommas(numFriends - numMatched)],
            'fFilterN': [numberWithCommas(numNeighbours - numMatched)]
        };
        Array.from(document.getElementById('ifFBar').getElementsByTagName('label')).forEach(label => {
            if (label.htmlFor in params) label.innerText = guiString(label.htmlFor, params[label.htmlFor]);
        })
    }

    function matchStoreAndUpdate() {
        if (!(bgp.daGame.friends instanceof Array)) return;
        var hashById = {},
            hashByName = {};
        var neighbours = bgp.daGame.daUser.neighbours;
        var friends = bgp.daGame.friends instanceof Array ? bgp.daGame.friends : [];
        numFriends = friends.length;
        numNeighbours = Object.keys(neighbours).length - 1;
        numMatched = 0;
        Object.keys(neighbours).forEach(uid => {
            if (uid != 0 && uid != 1) {
                var pal = neighbours[uid],
                    fullName = getPlayerNameFull(pal);
                hashById[pal.fb_id] = pal;
                // if the same name is already hashed, we set it to null to force an image comparison
                hashByName[fullName] = fullName in hashByName ? null : pal;
            }
        });
        // sort friends, disabled last
        friends.sort((a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0));
        // prepare friends
        friends.forEach(friend => {
            delete friend.uid;
            delete friend.score;
            friend.names = friend.realFBname.split(' ');
        });

        var rest = friends;

        function matchFriend(friend, pal, score) {
            if (friend && pal) {
                friend.uid = pal.uid;
                friend.score = score;
                delete hashById[pal.fb_id];
                delete hashByName[getPlayerNameFull(pal)];
                numMatched++;
            }
        }

        function matchRest(score, fn) {
            rest.forEach(friend => matchFriend(friend, fn(friend), score));
            rest = rest.filter(friend => !friend.uid);
        }
        // try to match, one method at a time

        // Match by FB id
        matchRest(100, friend => hashById[friend.fb_id]);
        // Match by full name
        matchRest(90, friend => hashByName[friend.realFBname]);
        // Match by first name + last name
        matchRest(80, friend => {
            var names = friend.names;
            return names.length > 1 ? hashByName[names[0] + ' ' + names[names.length - 1]] : null;
        });
        // Match by last name + first name
        matchRest(70, friend => {
            var names = friend.names;
            return names.length > 1 ? hashByName[names[names.length - 1] + ' ' + names[0]] : null;
        });
        // Chinese characters
        matchRest(60, friend => {
            var names = friend.names,
                ch = names[0],
                pal = null;
            if (names.length == 1 && ch.charCodeAt(0) >= 19968) {
                // Match by second character (as first name) + first character (as last name)
                pal = hashByName[ch.substr(1) + ' ' + ch.substr(0, 1)];
                // If there are at least 4 characters
                if (!pal && ch.length >= 4) {
                    // Match by 3rd-to-end characters (as first name) + 1st two characters (as last name)
                    pal = hashByName[ch.substr(2) + ' ' + ch.substr(0, 2)];
                }
            }
            return pal;
        });

        numToAnalyze = numAnalyzed = 0;

        // Match by image
        var images = [],
            friendData = [],
            neighbourData = [],
            canvas;
        rest.forEach(friend => addImage('f' + friend.fb_id, getFBFriendAvatarUrl(friend.fb_id)));
        var numFriendsToAnalyze = images.length;
        Object.values(hashById).forEach(pal => addImage('n' + pal.uid, pal.pic_square));
        var numNeighboursToAnalyze = images.length - numFriendsToAnalyze;

        // If there is at least one person in each group
        if (numFriendsToAnalyze > 0 && numFriendsToAnalyze > 0) {
            // analyzing is faster if there is a small number of visible rows
            bgp.exPrefs.fFilter = 'D';
            filterTable();
            canvas = document.createElement('canvas');
            // Start num parallel tasks to load images
            var num = 2;
            num = Math.min(images.length, num);
            while ((num--) > 0) collectNext(createImage());
        }

        storeFriends();
        updateTable();
        showStats();

        function addImage(id, url) {
            numToAnalyze++;
            images.push([id, url]);
        }

        function collectNext(img) {
            var a = images.pop();
            if (a) {
                img.id = a[0];
                img.src = a[1];
            }
        }

        function createImage() {
            var img = new Image();
            img.setAttribute('crossOrigin', 'anonymous');
            img.onload = imageOnLoad;
            img.onerror = imageOnLoad;
            return img;
        }

        function imageOnLoad() {
            numAnalyzed++;
            var img = this;
            if (img.complete && img.naturalHeight > 0) {
                // get picture as base64 string
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                var dataURL = canvas.toDataURL('image/png');

                var isFriend = img.id.charAt(0) == 'f',
                    id = img.id.substr(1),
                    col1 = isFriend ? friendData : neighbourData,
                    col2 = !isFriend ? friendData : neighbourData,
                    index = col2.findIndex(a => a[1] == dataURL);
                if (index < 0) {
                    col1.push([id, dataURL]);
                } else {
                    var fb_id = isFriend ? id : col2[index][0],
                        uid = !isFriend ? id : col2[index][0],
                        friend = friends.find(friend => friend.fb_id == fb_id),
                        pal = neighbours[uid];
                    matchFriend(friend, pal, 95);
                    // replace item found with last item, then remove last item
                    col2[index] = col2[col2.length - 1];
                    col2.pop();
                    var row = document.getElementById('fb-' + fb_id),
                        info = getNeighbourCellData(neighbours, uid, false);
                    if (row && info) {
                        row.classList.remove('friend-notmatched');
                        row.classList.add('friend-matched');
                        row.cells[2].innerText = friend.score;
                        row.cells[3].innerHTML = info.anchor + info.image + '</a>';
                        row.cells[4].innerHTML = info.anchor + info.name + '</a>';
                        row.cells[5].innerText = info.level;
                    }
                    // remove row for neighbour not matched
                    row = document.getElementById('nb-' + uid)
                    if (row) {
                        row.parentNode.removeChild(row);
                    }
                }
            }
            if (images.length == 0) {
                storeFriends();
                // Dispatch the scroll event to load lazy images brought into view by the filter
                window.dispatchEvent(new Event("scroll"));
            }
            collectNext(img);
            showStats();
        };
    }

    function getPlayerName(pal) {
        return pal.name || 'Player ' + pal.uid;
    }

    function getPlayerNameFull(pal) {
        var name = getPlayerName(pal);
        return pal.surname ? name + ' ' + pal.surname : name;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/