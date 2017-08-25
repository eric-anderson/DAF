/*
 ** DA Friends Calculator = emines.js
 */
var guiTabs = (function(self) {
    var tab, div, level, region, tb1sum, tb2sum, tf1sum, tf2sum, tf3sum;

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.emines = {
        title: 'Events',
        image: 'mine.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tabID, cel) {
        region = parseInt(bgp.daGame.daUser.region);
        level = parseInt(bgp.daGame.daUser.level);
        tab = self.tabs.Calculators.menu.emines;
        div = document.getElementById("calcMine");
        tb1sum = document.getElementById("emineSumTb1");
        tb2sum = document.getElementById("emineSumTb2");
        tf1sum = document.getElementById("emineSumTf1");
        tf2sum = document.getElementById("emineSumTf2");
        tf3sum = document.getElementById("emineSumTf3");
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(tabID, reason) {
        let eid = 81;

        return bgp.daGame.eventDetails(eid, true).then(function(event) {
            let eLoot = {
                    total: {}
                },
                prg1 = 0,
                prg2 = 0,
                egy1 = 0,
                egy2 = 0,
                rxp1 = 0,
                rxp2 = 0,
                bxp1 = 0,
                bxp2 = 0;

            tb1sum.innerHTML = '';
            tb2sum.innerHTML = '';

            console.log('EVENT', event);

            document.getElementById("emineName").innerText = event.name;
            Object.keys(event.mines).sort(function(a, b) {
                let ta = event.mines[a];
                let tb = event.mines[b];
                return ta.ord - tb.ord;
            }).forEach(function(idx) {
                let mine = event.mines[idx];
                let html = [],
                    bxp = 0,
                    egy = 0;

                console.log(idx, mine.lid, mine);

                eLoot[idx] = getFloors(mine);
                eLoot.total = sumLoot(eLoot.total, eLoot[idx].total);

                html.push('<tr>');
                html.push('<td>', self.regionImage(mine.rid, false, 32), '</td>');
                html.push('<td>', mine.name, '</td>');
                html.push('<td>', (mine.rql > 0 ? numberWithCommas(mine.rql) : ''), '</td>');
                html.push('<td>', numberWithCommas(mine.flr), '</td>');
                html = statsEvent(html, mine.prg, egy, bxp, mine.rxp);
                html.push('</tr>');

                // Extended (Challenge) Mines
                if (event.xlo.indexOf('' + mine.lid) !== -1) {
                    prg2 += parseInt(mine.prg);
                    rxp2 += parseInt(mine.rxp);
                    bxp2 += bxp;
                    egy2 += egy;
                    tb2sum.innerHTML += html.join('');
                } else {
                    // Standard Quest Mines
                    prg1 += parseInt(mine.prg);
                    rxp1 += parseInt(mine.rxp);
                    bxp1 += bxp;
                    egy1 += egy;
                    tb1sum.innerHTML += html.join('');
                }
            });

            totalEvent(tf1sum, 'subTotal', prg1, egy1, bxp1, rxp1);
            totalEvent(tf2sum, 'subTotal', prg2, egy2, bxp2, rxp2);
            totalEvent(tf3sum, 'grandTotal', prg1 + prg2, egy1 + egy2, bxp1 + bxp2, rxp1 + rxp2);
            console.log('Loot Totals', eLoot);

            return true;
        });
    }

    function totalEvent(el, txt, prg, egy, bxp, rxp) {
        let html = [];
        html.push('<tr class="sub-footer">');
        html.push('<td colspan="4">', guiString(txt), '</td>');
        html = statsEvent(html, prg, egy, bxp, rxp);
        html.push('</tr>');
        el.innerHTML = html.join('');
    }

    function statsEvent(html, prg, egy, bxp, rxp) {
        html.push('<td>', numberWithCommas(prg), '</td>');
        html.push('<td>', numberWithCommas(egy), '</td>');
        html.push('<td>', numberWithCommas(Math.round(egy / prg)), '</td>');
        html.push('<td>', numberWithCommas(bxp), '</td>');
        html.push('<td>', numberWithCommas(rxp), '</td>');
        html.push('<td>', numberWithCommas(egy + bxp + rxp), '</td>');
        return html;
    }

    function getFloors(mine) {
        let mLoot = {
            total: {}
        };

        Object.keys(mine.floors).sort(function(a, b) {
            let ta = mine.floors[a];
            let tb = mine.floors[b];
            return ta.fid - tb.fid;
        }).forEach(function(fid) {
            let floor = mine.floors[fid];
            console.log(mine.lid, fid, floor);
            mLoot[fid] = getLoot(floor);
            mLoot.total = sumLoot(mLoot.total, mLoot[fid]);
        });

        return mLoot;
    }

    function getLoot(floor) {
        let count = {};

        Object.keys(floor.loot).forEach(function(id) {
            let loot = floor.loot[id];
            let coef = parseFloat(loot.cof);
            let min = parseInt(loot.min) + (coef != 0.0 ? Math.floor((level * coef) * parseInt(loot.min)) : 0);
            let max = parseInt(loot.max) + (coef != 0.0 ? Math.floor((level * coef) * parseInt(loot.max)) : 0);
            let avg = Math.floor((min + max) / 2);
            let qty = loot.tle.length;

            if (qty) {
                min *= qty;
                max *= qty;
                avg *= qty;
                count = addLoot(count, loot.typ, loot.oid, min, max, avg, qty);
            }
        });

        return count;
    }

    function addLoot(count, typ, oid, min, max, avg, qty) {
        if (!count.hasOwnProperty(typ))
            count[typ] = {};

        if (!count[typ].hasOwnProperty(oid)) {
            count[typ][oid] = {
                name: self.objectName(typ, oid),
                oid: oid,
                min: min,
                max: max,
                avg: avg,
                qty: qty
            };
        } else {
            count[typ][oid].min += min;
            count[typ][oid].max += max;
            count[typ][oid].avg += avg;
            count[typ][oid].qty += qty;
        }

        return count;
    }

    function sumLoot(dLoot, sLoot) {
        Object.keys(sLoot).forEach(function(typ) {
            Object.keys(sLoot[typ]).forEach(function(oid) {
                let loot = sLoot[typ][oid];
                dLoot = addLoot(dLoot, typ, oid, loot.min, loot.max, loot.avg, loot.qty);
            });
        });

        return dLoot;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/