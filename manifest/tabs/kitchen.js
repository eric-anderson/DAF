/*
 ** DA Friends - kitchen.js
 */
var guiTabs = (function(self) {
    var table, tbody, thead, tgrid, theadSaved, tabID;
    var lokImg = '<img class="fb" src="/img/locked.png" width="16" height="16"/>';
    
    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        tabID = id;
        table = document.getElementById("rcTable");
        thead = document.getElementById("rcth1");
        tbody = document.getElementById("rctb1");
        tfoot = document.getElementById("rctf1");
        guiText_i18n(table);
        theadSaved = thead.innerHTML;
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        if (reason == 'active')
            return true;

        if ((!bgp.daGame.daUser) || !bgp.daGame.daProduce || !bgp.daGame.daUsables) {
            guiStatus('errorData', 'ERROR', 'error');
            return false;
        }

        tbody.innerHTML = '';
        thead.innerHTML = theadSaved;

        //console.log(bgp.daGame.daUsables);
        //console.log(bgp.daGame.daProduce);
        //console.log(bgp.daGame.daRecipes);

        Object.keys(bgp.daGame.daProduce).sort(function(a, b) {
            var o1 = bgp.daGame.daProduce[a];
            var o2 = bgp.daGame.daProduce[b];
            var u1 = 0,
                u2 = 0;

            if (bgp.daGame.daUsables.hasOwnProperty(o1.cgo.oid)) {
                u1 = bgp.daGame.daUsables[o1.cgo.oid].amt;
            }

            if (bgp.daGame.daUsables.hasOwnProperty(o2.cgo.oid)) {
                u2 = bgp.daGame.daUsables[o2.cgo.oid].amt;
            }

            if ((o1.ord - o2.ord) != 0)
                return o2.ord - o1.ord;

            return u2 - u1;
        }).forEach(function(did, i, a) {
            var o = bgp.daGame.daProduce[did];

            if (did != 0 && o.typ == 'recipe' && o.eid == 0 && o.hde == 0) {
                var html = [];
                var name = bgp.daGame.string(o.nid);
                var lock = bgp.daGame.daUser.pot_recipes.indexOf(did) == -1;
                var rspan = o.req.length;
                var energy = 0,
                    gold = 0;

                // Don't know why, but "Fried Mushrooms" and "Berry Muffin"
                // data is incorrect so we'll plug them here for now.
                //
                if (did == 52) {
                    o.rql = 1;
                    o.ulk = 0;
                    o.cgo.oid = 1;
                }

                if (did == 58) {
                    o.cgo.oid = 1;
                }
                
                console.log(did, name, rspan, lock, o);

                html.push('<tr>');
                html.push('<td rowspan="', rspan, '">', '</td>');
                html.push('<td rowspan="', rspan, '">', (o.ulk != '0' ? lokImg : ''), name, '</td>');
                html.push('<td rowspan="', rspan, '">', numberWithCommas(o.rql), '</td>');
                html.push('<td rowspan="', rspan, '">', self.regionImage(o.rid, true), '</td>');
                html.push('<td rowspan="', rspan, '">', duration(o.drn), '</td>');

                if (bgp.daGame.daUsables.hasOwnProperty(o.cgo.oid)) {
                    var u = bgp.daGame.daUsables[o.cgo.oid];
                    energy = (u.act == 'add_stamina' ? u.val : 0);
                    gold = u.gld;
                    html.push('<td rowspan="', rspan, '">', numberWithCommas(energy), '</td>');
                    //html.push('<td rowspan="', rspan, '">', numberWithCommas(gold), '</td>');
                } else {
                    html.push('<td rowspan="', rspan, '">', '</td>');
                    html.push('<td rowspan="', rspan, '">', '</td>');
                }

                if (rspan > 0) {
                    ingredient(o.req[0].mid, o.req[0].amt, html);
                    var maxPossible = Math.floor(self.materialInventory(o.req[0].mid) / o.req[0].amt);

                    for (m = 1; m < rspan; m++) {
                        maxPossible = Math.min(
                            maxPossible,
                            Math.floor(self.materialInventory(o.req[m].mid) / o.req[m].amt)
                        );
                    }

                    html.push('<td rowspan="', rspan, '">', numberWithCommas(maxPossible), '</td>');
                    html.push('<td rowspan="', rspan, '">', numberWithCommas(energy * maxPossible), '</td>');
                    html.push('<td rowspan="', rspan, '">', duration(o.drn * maxPossible), '</td>');

                } else {
                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');

                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');
                }

                html.push('</tr>')

                for (m = 1; m < rspan; m++) {
                    html.push('<tr>');
                    ingredient(o.req[m].mid, o.req[m].amt, html);
                    html.push('</tr>');
                }


                tbody.innerHTML += html.join('');
            }
        });

        return true;
    }

    function ingredient(mid, amt, html) {
        html.push('<td>', numberWithCommas(amt), '</td>');
        html.push('<td>', self.materialName(mid), '</td>');
        html.push('<td class="right">', numberWithCommas(self.materialInventory(mid)), '</td>');
        return html;
    }

    function duration(drn) {
        var mm = Math.floor((drn / 60) % 60);
        var hh = Math.floor((drn / (60 * 60)) % 24);
        var dd = Math.floor(drn / (60 * 60 * 24));

        var timeString = ((dd) ? dd + 'd:' : '') +
            (hh < 10 ? '0' : '') + parseInt(hh) + 'h:' +
            (mm < 10 ? '0' : '') + parseInt(mm) + 'm';

        return timeString;
    }

    /*
     ** Define this tab's details
     */
    self.tabs.Kitchen = {
        title: 'Kitchen',
        image: 'kitchen.png',
        order: 30,
        html: true,
        onInit: onInit,
        onUpdate: onUpdate
    };

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/