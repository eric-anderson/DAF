/*
 ** DA Friends - friendship.js
 */
var guiTabs = (function(self) {
    var tabID, ifTable, theadSaved;
    var numFriends = 0,
        numInactive = 0,
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

        chrome.storage.local.get('friends', (obj) => {
            bgp.daGame.friends = (obj && obj.friends) || [];
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
            chrome.tabs.executeScript(w.tabs[0].id, {
                file: '/manifest/content_friendship.js',
                runAt: 'document_end',
                allFrames: false,
                frameId: 0
            });
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
        numInactive = 0;
        var html = [];
        var notmatched = Object.assign({}, neighbours);
        bgp.daGame.friends.forEach(item => {
            var fb_id = item.fb_id;
            var info = getNeighbourCellData(neighbours, item.uid, true);
            var classes = [];
            if (item.inactive) {
                numInactive++;
                classes.push('friend-inactive');
            }
            if (info) classes.push('friend-matched');
            if (!info) classes.push('friend-notmatched');
            html.push('<tr id="fb-', fb_id, '" class="', classes.join(' '), '">');
            var a = getFBFriendAnchor(fb_id);
            html.push('<td>', a, '<img height="50" width="50" lazy-src="', getFBFriendAvatarUrl(fb_id), '"/></a></td>');
            html.push('<td>', a, item.realFBname, '</a></td>');
            if (info) {
                numMatched++;
                html.push('<td>', item.score, '</td>');
                html.push('<td>', info.anchor, info.image, '</a></td>');
                html.push('<td>', info.anchor, info.name, '</a></td>');
                html.push('<td>', info.level, '</td>');
                delete notmatched[item.uid];
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
        var html = [];
        if (numToAnalyze != numAnalyzed) {
            html.push(guiString('AnalyzingMatches', [Math.floor(numAnalyzed / numToAnalyze * 100)]));
        }
        document.getElementById('ifStats').innerHTML = html.join('');

        var params = {
            'fFilterA': [numFriends, numNeighbours],
            'fFilterI': [numInactive],
            'fFilterM': [numMatched],
            'fFilterF': [numFriends - numMatched],
            'fFilterN': [numNeighbours - numMatched]
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
                var pal = neighbours[uid];
                hashById[pal.fb_id] = pal;
                hashByName[getPlayerNameFull(pal)] = pal;
            }
        });
        friends.forEach(item => {
            delete item.uid;
            delete item.score;
            var names = item.realFBname.split(' ');
            var score, pal;
            // Match by FB id
            score = 100;
            var pal = hashById[item.fb_id];
            if (!pal) {
                // Match by full name
                score = 90;
                pal = hashByName[item.realFBname];
            }
            if (!pal && names.length > 1) {
                // Match by first name + last name
                score = 80;
                pal = hashByName[names[0] + ' ' + names[names.length - 1]];
            }
            if (!pal && names.length > 1) {
                // Match by last name + first name
                score = 70;
                pal = hashByName[names[names.length - 1] + ' ' + names[0]];
            }
            // Chinese characters
            if (!pal && names.length == 1 && names[0].charCodeAt(0) >= 19968) {
                var ch = names[0];
                // Match by second character (as first name) + first character (as last name)
                score = 60;
                pal = hashByName[ch.substr(1) + ' ' + ch.substr(0, 1)];
                // If there are at least 4 characters
                if (!pal && ch.length >= 4) {
                    // Match by 3rd-to-end characters (as first name) + 1st two characters (as last name)
                    info = hashByName[ch.substr(2) + ' ' + ch.substr(0, 2)];
                }
            }
            if (pal) {
                item.uid = pal.uid;
                item.score = score;
                delete hashById[pal.fb_id];
                delete hashByName[getPlayerNameFull(pal)];
                numMatched++;
            }
        });

        // Match by image
        var canvas = document.getElementById('friendship-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'friendship-canvas';
        }

        numToAnalyze = numAnalyzed = 0;

        var images = [],
            friendsData = [],
            neighboursData = [];

        bgp.daGame.friends.forEach(item => {
            if (!item.uid) {
                addImage('f' + item.fb_id, getFBFriendAvatarUrl(item.fb_id));
            }
        });

        Object.values(hashById).forEach(pal => {
            addImage('n' + pal.uid, pal.pic_square);
        });

        if (images.length) {
            collectNext(createImage());
            collectNext(createImage());
        }

        storeFriends();
        updateTable();
        showStats();

        function addImage(id, url) {
            numToAnalyze++;
            images.push({
                id: id,
                url: url
            });
        }

        function collectNext(img) {
            var item = images.pop();
            if (item) {
                img.id = item.id, img.src = item.url;
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
                var isFriend = img.id.charAt(0) == 'f',
                    id = img.id.substr(1);
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                var dataURL = canvas.toDataURL('image/png');
                var col = isFriend ? neighboursData : friendsData;
                var index = col.findIndex(item => item.data == dataURL);
                if (index < 0) {
                    col = isFriend ? friendsData : neighboursData;
                    col.push({
                        id: id,
                        data: dataURL
                    });
                } else {
                    var fb_id = isFriend ? id : col[index].id;
                    var uid = isFriend ? col[index].id : id;
                    var item = friends.find(item => item.fb_id == fb_id);
                    if (item) {
                        item.uid = uid;
                        item.score = 95;
                    }
                    // replace item found with last item, then remove last item
                    col[index] = col[col.length - 1];
                    col.pop();
                    numMatched++;
                    var row = document.getElementById('fb-' + fb_id);
                    var info = getNeighbourCellData(neighbours, uid, false);
                    if (row && info) {
                        row.classList.remove('friends-notmatched');
                        row.classList.add('friend-matched');
                        row.cells[2].innerText = '95';
                        row.cells[3].innerHTML = info.anchor + info.image + '</a>';
                        row.cells[4].innerHTML = info.anchor + info.name + '</a>';
                        row.cells[5].innerText = info.level;
                    }
                    // remove row for neighbour not matched
                    var row = document.getElementById('nb-' + uid)
                    if (row) {
                        row.parentNode.removeChild(row);
                    }
                }
            }
            if (images.length == 0) storeFriends();
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