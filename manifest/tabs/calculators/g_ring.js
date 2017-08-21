/*
 ** DA Friends Calculator = g_ring.js
 */
var guiTabs = (function(self) {
    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.g_ring = {
        title: 'greenRings',
        image: 'materials/g_ring.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {}

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        var mines = [185, 1535];
        return self.ringLoot('gring', reason, mines, self.tabs.Calculators.menu.g_ring)
    }

    /*
     ** @Public - Display Ring Loot
     */
    self.ringLoot = function(tid, reason, mines, tab) {
        let region = parseInt(bgp.daGame.daUser.region);
        let level = parseInt(bgp.daGame.daUser.level);
        let div = tab.html;
        div.innerHTML = '';

        for (var m = 0; m < mines.length; m++) {
            let mine = bgp.daGame.mineDetails(mines[m]);
            let rows = 0;
            let html = [];

            //console.log(mine);

            if ((mine === null) || mine.region_id > region)
                continue;

            html.push('<div class="card clicker">', '<h1>');
            html.push(self.regionImage(mine.region_id, false, 32));
            html.push('<span>', mine.name, '</span>', '<img src="" />');
            html.push('</h1>', '<div id="', tid, m, '">');
            html.push('<table id="', tid, m, '-table" class="rings">');
            html.push('<thead>', '<tr>');
            html.push('<td>', '<img src="/img/chest.png"/>', '</td>');
            html.push('<td>', guiString('Loot'), '</td>');
            html.push('<td>', guiString('Min'), '</td>');
            html.push('<td>', guiString('Avg'), '</td>');
            html.push('<td>', guiString('Max'), '</td>');
            html.push('</tr>', '</thead>');

            Object.keys(mine.floors).forEach(function(fid) {
                if (mine.floors[fid].hasOwnProperty('loot')) {
                    let chest = 0;
                    let last = null;
                    html.push('<tbody id="', tid, m, '-tb-', fid, '">');
                    
                    //console.log(mine);

                    Object.keys(mine.floors[fid].loot).sort(function(a, b) {
                        let ta = mine.floors[fid].loot[a];                       
                        let tb = mine.floors[fid].loot[b];

                        if(ta.tle[0] < tb.tle[0]) return -1;
                        if(ta.tle[0] > tb.tle[0]) return 1;

                        return mine.floors[fid].loot[a].oid - mine.floors[fid].loot[b].oid;

                    }).forEach(function(lid) {
                        let loot = mine.floors[fid].loot[lid];
                        let coef = parseFloat(loot.cof);
                        let min = parseInt(loot.min) + (coef != 0.0 ? Math.floor((level * coef) * loot.min) : 0);
                        let max = parseInt(loot.max) + (coef != 0.0 ? Math.floor((level * coef) * loot.max) : 0);
                        let avg = Math.floor((min + max) / 2);
                        let tile = loot.tle[0];

                        if (last != tile) {
                            last = tile;
                            chest = chest + 1;
                        }
                        
                        //console.log(chest, loot.aid, loot.tle, tile, self.objectName(loot.typ, loot.oid));

                        if (loot.typ != 'token') {
                            html.push('<tr>');
                            html.push('<td>', chest, '</td>');
                            html.push('<td>', self.objectName(loot.typ, loot.oid), '</td>');
                            html.push('<td>', numberWithCommas(min), '</td>');
                            html.push('<td>', numberWithCommas(avg), '</td>');
                            html.push('<td>', numberWithCommas(max), '</td>');
                            html.push('</tr>');
                            rows += 1;
                        }
                    });
                    html.push('</tbody>');
                }
            });

            if (rows) {
                html.push('</table>', '<br />');
                html.push('</div>', '</div>');
                div.innerHTML += html.join('');
            }
        }

        if (div.innerHTML) {
            guiCardToggle(div);
        } else
            div.innerHTML = '<h1>' + guiString('ringsNotQualified', [guiString(tab.title)]) + '</h1>';

        return true;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/