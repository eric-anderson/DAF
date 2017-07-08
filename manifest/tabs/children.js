/*
 ** DA Friends - children.js
 */
var guiTabs = (function(self) {
    var tabID, info, opts, stats, grid;

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        tabID = id;
        info = document.getElementById("gcInfo");
        opts = document.getElementById("gcOpts");
        stats = document.getElementById("gcStats");
        grid = document.getElementById("gcGrid");
        opts.innerHTML = guiString('godsChildren');
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
        //console.log(id, "onAction", action, data);
        if (action == 'friend_child_charge') {
            var el = document.getElementById('gc-' + data.uid);
            if (el) {
                el.parentNode.removeChild(el);
                if (grid.childNodes.length == 0)
                    grid.style.display = 'none';
                var neighbours = Object.keys(bgp.daGame.daUser.neighbours).length;
                stats.innerHTML = numberWithCommas(grid.childNodes.length) + " / " +
                    numberWithCommas((Math.floor(Math.sqrt(neighbours - 1) + 3) + 1));
            }
        }
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        if (reason == 'active')
            return true;

        var neighbours = Object.keys(bgp.daGame.daUser.neighbours).length;
        var counter = 0;
        grid.innerHTML = '';

        Object.keys(bgp.daGame.daUser.neighbours).sort(function(a, b) {
            if (bgp.daGame.daUser.neighbours[a].uid == 1)
                return 9999;
            if (bgp.daGame.daUser.neighbours[b].uid == 1)
                return -9999;

            return bgp.daGame.daUser.neighbours[a].level - bgp.daGame.daUser.neighbours[b].level;
        }).forEach(function(uid) {
            var pal = bgp.daGame.daUser.neighbours[uid];
            var fid = pal.fb_id;
            var fullName, player = pal.name;
            var show = parseInt(pal.spawned) === 1 ? true : false;

            if (show) {
                counter = counter + 1;

                var html = '',
                    img;

                if (!player && !pal.surname)
                    player = 'Player ' + uid;
                fullName = player + ((!pal.surname) ? '' : ' ' + pal.surname);

                if (uid > 1) {
                    html += '<a class="gallery" href="https://www.facebook.com/' + fid + '"';
                    html += ' title="' + fullName + '"';
                } else
                    html += '<div class="gallery"';
                html += ' id="gc-' + pal.uid + '"';
                html += ' style="background-image: url(' + pal.pic_square + ');">';
                html += '<span class="level">' + pal.level + '</span>';
                html += '<span class="name">' + player + '</span>';
                html += '</div>';
                if (uid > 1)
                    html += '</a>';

                grid.innerHTML += html;
            }
        });

        grid.style.display = (counter == 0) ? 'none' : '';
        self.linkTabs(grid);

        var realNeighbours = neighbours - 1;
        var next = nextGC(realNeighbours);
        var nextInfo;
        switch (next) {
            case 0:
                nextInfo = guiString('GCnext0');
                break;
            case 1:
                nextInfo = guiString('GCnext1');
                break;
            default:
                nextInfo = guiString('GCnext', [next]);
                break;
        }

        opts.innerHTML = guiString('godsChildren')
            + ' - ' 
            + numberWithCommas(counter) + " / " 
            + numberWithCommas(getGC(realNeighbours) + 1);
        
        stats.innerHTML = nextInfo;

        return true;
    }

    // realNeighbours = # of neighbours excluding Mr. Bill
    function getGC(realNeighbours) {
        var max = Math.floor(Math.sqrt(realNeighbours)) + 3;
        return max > realNeighbours ? realNeighbours : max;
    }

    function nextGC(realNeighbours) {
        if (realNeighbours < 5) return 1;
        var next = Math.floor(Math.sqrt(realNeighbours)) + 1;
        var goal = next * next;
        // Facebook hard limit of 5000 friends
        return goal > 5000 ? 0 : goal - realNeighbours;
    }

    /*
     ** Define this tab's details
     */
    self.tabs.Children = { // Until gifting issues resolved, this tab will pretend to be Neighbours
        title: (localStorage.installType != 'development') ? 'Neighbours' : 'godsChildren',
        image: (localStorage.installType != 'development') ? 'neighbours.png' : 'gc.png',
        order: 5,
        html: true,
        onInit: onInit,
        onAction: onAction,
        onUpdate: onUpdate
    };

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/