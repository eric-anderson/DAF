/*
 ** DA Friends - kitchen.js
 */
var guiTabs = (function(self) {
    var pots, table, tbody, tgrid, tabID;
    var lokImg = '<img class="fb" src="/img/locked.png" width="16" height="16"/>';

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        pots = 0;
        tabID = id;
        table = document.getElementById("rcTable");
        tbody = document.getElementById("rctb1");
        tfoot = document.getElementById("rctf1");
        guiText_i18n(table);

        var f = document.getElementsByName('rFilter');
        for (var i = 0; i < f.length; i++) {
            if (f[i].getAttribute('value') == bgp.exPrefs.rFilter) {
                f[i].setAttribute('checked', 'checked');
            } else
                f[i].removeAttribute('checked');

            f[i].addEventListener('click', function(e) {
                var rFilter = e.target.getAttribute('value');
                if ((!e.target.disabled) && bgp.exPrefs.rFilter != rFilter) {
                    self.setPref('rFilter', rFilter);
                    self.refresh(tabID);
                }
            });
        }

        sorttable.makeSortable(table);
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

        //console.log(bgp.daGame.daUsables);
        //console.log(bgp.daGame.daProduce);
        //console.log(bgp.daGame.daRecipes);
        //console.log(bgp.daGame.daUser.pots);

        tbody.innerHTML = '';

        if (bgp.daGame.daUser.pots) {
            if ((pots = bgp.daGame.daUser.pots.length) > 1)
                document.getElementById("potTimeHeader").innerHTML = Dialog.escapeHtmlBr(guiString("totalPotTime", [pots]));
        }

        Object.keys(bgp.daGame.daProduce).sort(function(a, b) {
            var o1 = bgp.daGame.daProduce[a];
            var o2 = bgp.daGame.daProduce[b];
            var u1 = 0,
                u2 = 0;

            if ((o1.eid - o2.eid) != 0)
                return o1.eid - o2.eid;

            if ((o1.rql - o2.rql) != 0)
                return o2.rql - o1.rql;

            if (bgp.daGame.daUsables.hasOwnProperty(o1.cgo.oid))
                u1 = bgp.daGame.daUsables[o1.cgo.oid].amt;

            if (bgp.daGame.daUsables.hasOwnProperty(o2.cgo.oid))
                u2 = bgp.daGame.daUsables[o2.cgo.oid].amt;

            return u2 - u1;
        }).forEach(function(did, i, a) {
            var o = bgp.daGame.daProduce[did];
            var level = parseInt(bgp.daGame.daUser.level);
            var region = parseInt(bgp.daGame.daUser.region);
            var show = true;

            // Don't know why, but "Fried Mushrooms" and "Berry Muffin"
            // data is incorrect so we'll plug them here for now.
            //
            if (did == 52) {
                o.rql = 1;
                o.ulk = 0;
                o.cgo.oid = 1;
            }

            if (did == 58) {
                o.cgo.oid = 8;
            }
            /*********************************************************/

            if (o.rql > level || o.rid > region)
                show = false;

            if ((show) && bgp.exPrefs.rFilter != 'ALL') {
                if (o.ulk == '0') {
                    if (bgp.exPrefs.rFilter == 'PRD' && o.eid != 0)
                        show = false;
                    if (bgp.exPrefs.rFilter == 'PED' && o.eid == 0)
                        show = false;
                } else
                    show = false;
            }

            if (did != 0 && o.typ == 'recipe' && o.hde == 0 && show /*&& o.eid == 0*/ ) {
                var name = bgp.daGame.string(o.nid);
                var lock = bgp.daGame.daUser.pot_recipes.indexOf(did) == -1;
                var rspan = o.req.length;
                var potTime = 0,
                    energy = 0,
                    gold = 0;
                var potImg = '';
                var html = [];

                //console.log(did, name, rspan, lock, o);

                if (o.eid != 0) {
                    potImg = '<img src="/img/events.png" width="16" height="16" data-wiki-title="' +
                        self.eventName(o.eid) +
                        '"' + self.eventWiki(o.eid) +
                        '/>';
                } else
                    potImg = '<img src="/img/recipes/' + did + '.png" width="32" height="32"/>';

                html.push('<tr>');
                html.push('<td rowspan="', rspan, '">', potImg, '</td>');
                html.push('<td rowspan="', rspan, '">', (o.ulk != '0' ? lokImg : ''), name, '</td>');
                html.push('<td rowspan="', rspan, '">', numberWithCommas(o.rql), '</td>');
                html.push('<td rowspan="', rspan, '" sorttable_customkey="', o.rid, '">', self.regionImage(o.rid, true), '</td>');
                html.push('<td rowspan="', rspan, '" sorttable_customkey="', o.drn, '">', duration(o.drn), '</td>');

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

                var energyHour = o.drn ? (energy / (o.drn / 60) * 60) : 0;
                html.push('<td rowspan="', rspan, '">', numberWithCommas(Math.round(energyHour)), '</td>');

                if (rspan > 0) {
                    ingredient(o.req[0].mid, o.req[0].amt, html);
                    var maxPossible = Math.floor(self.materialInventory(o.req[0].mid) / o.req[0].amt);

                    for (m = 1; m < rspan; m++) {
                        maxPossible = Math.min(
                            maxPossible,
                            Math.floor(self.materialInventory(o.req[m].mid) / o.req[m].amt)
                        );
                    }

                    potTime = o.drn * Math.floor((maxPossible + pots - 1) / pots);

                    html.push('<td rowspan="', rspan, '">', numberWithCommas(maxPossible), '</td>');
                    html.push('<td rowspan="', rspan, '">', numberWithCommas(energy * maxPossible), '</td>');
                    html.push('<td rowspan="', rspan, '" sorttable_customkey="', o.drn * maxPossible, '">', duration(o.drn * maxPossible), '</td>');

                    if (bgp.exPrefs.rFilter != 'ALL' && !maxPossible)
                        show = false;

                } else {
                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');

                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');
                    if (bgp.exPrefs.rFilter != 'ALL')
                        show = false;
                }

                html.push('</tr>')

                for (m = 1; m < rspan; m++) {
                    html.push('<tr>');
                    ingredient(o.req[m].mid, o.req[m].amt, html);
                    html.push('</tr>');
                }

                if (show)
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
    self.tabs.Calculators.menu.kitchen = {
        title: 'Kitchen',
        image: 'kitchen.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate
    };

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/