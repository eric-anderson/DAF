/*
 ** DA Friends Calculator = emines.js
 */
var guiTabs = (function(self) {
    var tab, div, level, region, tblSum, tb1sum, tb2sum, tf1sum, tf2sum, tf3sum, em1Loot, em2Loot;
    var mapID = 0,
        mapLoot = {};

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
        div = tab.html;
        tb1sum = document.getElementById("emineSumTb1");
        tb2sum = document.getElementById("emineSumTb2");
        tf1sum = document.getElementById("emineSumTf1");
        tf2sum = document.getElementById("emineSumTf2");
        tf3sum = document.getElementById("emineSumTf3");
        tblSum = document.getElementById("emineSum");
        em1Loot = document.getElementById("emineLoot1");
        em2Loot = document.getElementById("emineLoot2");
        mapID = 81;
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(tabID, reason) {
        let eid = mapID;

        document.getElementById("emine-wrapper").style.display = 'none';

        return bgp.daGame.eventDetails(eid, true).then(function(event) {
            let prg1 = 0,
                prg2 = 0,
                egy1 = 0,
                egy2 = 0,
                rxp1 = 0,
                rxp2 = 0,
                bxp1 = 0,
                bxp2 = 0;

            tb1sum.innerHTML = '';
            tb2sum.innerHTML = '';
            mapLoot = {
                name: event.name,
                total: {},
                ql: {},
                xl: {}
            };

            console.log('EVENT', event, self.objectName('usable', 1815));
            console.log(bgp.daGame);

            document.getElementById("emine-wrapper").style.display = '';
            document.getElementById("emine0Name").innerText = event.name;
            document.getElementById("emine0Img").src = '/img/' + (isBool(event.prm) ? 'shop' : 'events') + '.png';

            Object.keys(event.mines).sort(function(a, b) {
                let ta = event.mines[a];
                let tb = event.mines[b];
                return ta.ord - tb.ord;
            }).forEach(function(idx) {
                let mine = event.mines[idx];
                let html = [],
                    bxp = 0,
                    egy = 0;

                //console.log(idx, mine.lid, mine);

                mapLoot[idx] = getFloors(mine);
                mapLoot.total = sumLoot(mapLoot.total, mapLoot[idx].total);

                // Add any XP loot as well
                if (mapLoot[idx].total.hasOwnProperty('system')) {
                    //console.log(mapLoot[idx].total.system);
                    if (mapLoot[idx].total.system.hasOwnProperty(1)) {
                        bxp = mapLoot[idx].total.system[1].avg;
                        //console.log("BXP", bxp);
                    }
                }

                // Clearance Reward XP - Calculate for "Segmented" Events
                let rxp = parseInt(mine.rxp);
                if (mine.hasOwnProperty('ovr')) {
                    mine.ovr.forEach(function(ovr) {
                        //console.log(ovr);
                        if (ovr.region_id == region)
                            rxp = parseInt(ovr.override_reward_exp);
                    });
                }

                html.push('<tr id="emine-', idx, '" data-emine-lid="', mine.lid, '">');
                html.push('<td>', self.regionImage(mine.rid, false, 32), '</td>');
                html.push('<td>', mine.name, '</td>');
                html.push('<td>', (mine.rql > 0 ? numberWithCommas(mine.rql) : ''), '</td>');
                html.push('<td>', numberWithCommas(mine.flr), '</td>');
                html = statsTotals(html, mine.prg, egy, bxp, rxp);
                html.push('</tr>');

                // Extended (Challenge) Mines
                if (event.xlo.indexOf('' + mine.lid) !== -1) {
                    mapLoot.xl = sumLoot(mapLoot.xl, mapLoot[idx].total);
                    prg2 += parseInt(mine.prg);
                    rxp2 += rxp;
                    bxp2 += bxp;
                    egy2 += egy;
                    tb2sum.innerHTML += html.join('');
                } else {
                    // Standard Quest Mines
                    mapLoot.ql = sumLoot(mapLoot.ql, mapLoot[idx].total);
                    prg1 += parseInt(mine.prg);
                    rxp1 += rxp;
                    bxp1 += bxp;
                    egy1 += egy;
                    tb1sum.innerHTML += html.join('');
                }
            });

            mapTotals(tf1sum, 'ql', 'subTotal', prg1, egy1, bxp1, rxp1);
            mapTotals(tf2sum, 'xl', 'subTotal', prg2, egy2, bxp2, rxp2);
            mapTotals(tf3sum, 'all', 'grandTotal', prg1 + prg2, egy1 + egy2, bxp1 + bxp2, rxp1 + rxp2);
            lootUpdate();

            for (let i = 0, row; row = tblSum.rows[i]; i++) {
                row.addEventListener('click', lootUpdate);
            }

            return true;
        });
    }

    function lootUpdate(e = null, lid = 'all') {
        if (e) {
            e.preventDefault();
            e = e.target;
            if (e.tagName != 'TR')
                e = e.parentElement;
            if (!e.id.startsWith('emine-'))
                return;

            lid = e.id.substring(6);
        }

        switch (lid) {
            case 'ql':
                lootTotals(mapLoot.ql, guiString('qlMines'));
                return;
            case 'xl':
                lootTotals(mapLoot.xl, guiString('xlMines'));
                return;
            case 'all':
                lootTotals(mapLoot.total, guiString('allMines'));
                return;
        }

        // Single Location Loot
        if (mapLoot.hasOwnProperty(lid)) {
            lootTotals(mapLoot[lid].total, mapLoot[lid].name);
        }
    }

    function lootTotals(count, name) {
        document.getElementById("emine1Name").innerText = name;
        em1Loot.innerHTML = '';
        em2Loot.innerHTML = '';
        if (count) {
            //console.log(name, count);       
            Object.keys(count).forEach(function(typ) {
                Object.keys(count[typ]).forEach(function(oid) {
                    if (typ != 'token') {
                        let loot = count[typ][oid];
                        let html = [];

                        html.push('<tr data-oid="', oid, '">');
                        html.push('<td>', loot.name, '</td>');
                        if (loot.min != loot.max) {
                            html.push('<td>', numberWithCommas(loot.min), '</td>');
                            html.push('<td>', numberWithCommas(loot.avg), '</td>');
                            html.push('<td>', numberWithCommas(loot.max), '</td>');
                        } else
                            html.push('<td colspan="2"></td><td>', numberWithCommas(loot.avg), '</td>');

                        html.push('</tr>');

                        if (typ == 'material') {
                            em1Loot.innerHTML += html.join('');
                        } else
                            em2Loot.innerHTML += html.join('');
                    }
                });
            });
        }
    }

    function mapTotals(el, id, txt, prg, egy, bxp, rxp) {
        let html = [];
        html.push('<tr id="emine-', id, '" title="', guiString(id + 'Mines'), '">');
        html.push('<td colspan="4">', guiString(txt), '</td>');
        html = statsTotals(html, prg, egy, bxp, rxp);
        html.push('</tr>');
        el.innerHTML = html.join('');
    }

    function statsTotals(html, prg, egy, bxp, rxp) {
        html.push('<td>', numberWithCommas(prg), '</td>');
        html.push('<td>', numberWithCommas(egy), '</td>');
        html.push('<td>', numberWithCommas(Math.round(parseInt(egy) / parseInt(prg))), '</td>');
        html.push('<td>', numberWithCommas(bxp), '</td>');
        html.push('<td>', numberWithCommas(rxp), '</td>');
        html.push('<td>', numberWithCommas(parseInt(egy) + parseInt(bxp) + parseInt(rxp)), '</td>');
        return html;
    }

    function getFloors(mine) {
        let mLoot = {
            total: {},
            name: mine.name
        };

        Object.keys(mine.floors).sort(function(a, b) {
            let ta = mine.floors[a];
            let tb = mine.floors[b];
            return ta.fid - tb.fid;
        }).forEach(function(fid) {
            let floor = mine.floors[fid];
            //console.log(mine.lid, fid, floor);
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
            let oid = parseInt(loot.oid);

            if (qty) {
                min *= qty;
                max *= qty;
                avg *= qty;
                count = addLoot(count, loot.typ, oid, min, max, avg, qty);
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