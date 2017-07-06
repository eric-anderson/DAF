/*
 ** DA Friends - children.js
 */
var guiTabs = (function (self) {
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
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        if (reason == 'active')
            return true;

        var neighbours = Object.keys(bgp.daGame.daUser.neighbours).length;
        var counter = 0;
        grid.innerHTML = '';

        Object.keys(bgp.daGame.daUser.neighbours).sort(function (a, b) {
            return bgp.daGame.daUser.neighbours[a].level - bgp.daGame.daUser.neighbours[b].level;
        }).forEach(function (uid) {
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

                // TODO: at some point do this properly and create the elements
                //
                if (uid > 1) {
                    html += '<a class="gallery" href="https://www.facebook.com/' + fid + '"';
                    html += ' title="' + fullName + '"';
                } else
                    html += '<div class="gallery"';
                html += ' data-player-uid="' + pal.uid + '"';
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
        stats.innerHTML = numberWithCommas(counter) + " / " +
            numberWithCommas((Math.floor(Math.sqrt(neighbours - 1) + 3) + 1));

        return true;
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
        onUpdate: onUpdate
    };

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/