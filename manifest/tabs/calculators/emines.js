/*
 ** DA Friends Calculator = emines.js
 */
var guiTabs = (function(self) {
    var tabID, tab, div, level, region, emStats;
    var tblSum, tb1sum, tb2sum, tf1sum, tf2sum, tf3sum, em1Loot, em2Loot;
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
    function onInit(tid, cel) {
        region = parseInt(bgp.daGame.daUser.region);
        level = parseInt(bgp.daGame.daUser.level);
        tab = self.tabs.Calculators.menu[tid];
        tabID = tid;
        div = tab.html;
        tblSum = document.getElementById("emineSum");
        tb1sum = document.getElementById("emineSumTb1");
        tb2sum = document.getElementById("emineSumTb2");
        tf1sum = document.getElementById("emineSumTf1");
        tf2sum = document.getElementById("emineSumTf2");
        tf3sum = document.getElementById("emineSumTf3");
        em1Loot = document.getElementById("emineLoot1");
        em2Loot = document.getElementById("emineLoot2");
        emStats = document.getElementById("emineStats");
        buildFilters();
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(tabID, reason) {
        document.getElementById("emine-wrapper").style.display = 'none';
        if (!bgp.daGame.daEvents)
            throw Error(guiString('errorData'));

        if ((!mapID) || !bgp.daGame.daEvents.hasOwnProperty(mapID))
            return true;

        emStats.innerHTML = guiString('gameGetData');
        return bgp.daGame.eventDetails(mapID, true).catch(function(error) {
            emStats.innerHTML = '';
            mapID = 0;
            throw Error(error);
        }).then(function(evt) {
            let prg1 = 0,
                prg2 = 0,
                egy1 = 0,
                egy2 = 0,
                rxp1 = 0,
                rxp2 = 0,
                bxp1 = 0,
                bxp2 = 0;

            let xlo = evt.xlo.length;
            tb1sum.innerHTML = '';
            tb2sum.innerHTML = '';
            tf1sum.innerHTML = '';
            tf2sum.innerHTML = '';
            tf3sum.innerHTML = '';
            emStats.innerHTML = '';
            
            mapLoot = {
                name: evt.name,
                total: {},
                ql: {},
                xl: {}
            };

            console.log('EVENT', xlo, evt);
            console.log("Segmented", evt.isSeg, region);          
            //console.log(bgp.daGame);

            document.getElementById("emine-wrapper").style.display = '';
            document.getElementById("emine0Img").src = '/img/' + (isBool(evt.prm) ? 'shop' : 'events') + '.png';
            document.getElementById("emine0Name").innerText = evt.name;
            document.getElementById('emineRegion').disabled = !evt.isSeg; 
            region = (evt.isSeg ? parseInt(bgp.exPrefs.eMineRID) : parseInt(bgp.daGame.daUser.region));
           
            Object.keys(evt.mines).sort(function(a, b) {
                let ta = evt.mines[a];
                let tb = evt.mines[b];
                return ta.ord - tb.ord;
            }).forEach(function(idx) {
                let mine = evt.mines[idx];
                let cdn = parseInt(mine.cdn);                
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
                if ((xlo > 0) && evt.xlo.indexOf('' + mine.lid) !== -1) {
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

            if (xlo > 0) {
                mapTotals(tf1sum, 'ql', 'subTotal', prg1, egy1, bxp1, rxp1);
                mapTotals(tf2sum, 'xl', 'subTotal', prg2, egy2, bxp2, rxp2);
            }
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
            case 'rl':
                lootTotals(mapLoot.rl, guiString('rlMines'));
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
                            html.push('<td></td><td>', numberWithCommas(loot.avg), '</td><td></td>');

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
        html.push('<td>', numberWithCommas(Math.round(parseInt(egy) / parseInt(prg))), '</td>');
        html.push('<td>', numberWithCommas(egy), '</td>');
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
            let rid = (loot.hasOwnProperty('rid') ? loot.rid : 0);

            if (qty && (rid == 0 || rid == region)) {
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

    /*
     ** Build List of Events to choose from (and Region for segmented events)
     */
    function buildFilters() {
        if (!bgp.daGame.daEvents)
            return;

        // Event Filter
        let select = document.getElementById('emineFilter');
        let list = Object.keys(bgp.daGame.daEvents).sort(function(a, b) {
            // Use the end date/time as the order_id seems wrong
            return bgp.daGame.daEvents[b].et - bgp.daGame.daEvents[a].et;
        });

        list.forEach(function(eid) {
            let evt = bgp.daGame.daEvents[eid];
            if (evt.loc.length > 0) {
                let option = document.createElement('option');
                select.appendChild(option);
                if (!evt.hasOwnProperty('name'))
                    evt.name = bgp.daGame.string(evt.nid);
                option.innerText = evt.name;
                option.value = eid;
            }
        });

        if ((!bgp.exPrefs.eMineLID) || list.indexOf(bgp.exPrefs.eMineLID) === -1)
            bgp.exPrefs.eMineLID = list[0];
        select.value = mapID = bgp.exPrefs.eMineLID;

        select.addEventListener('change', function(e) {
            bgp.exPrefs.eMineLID = mapID = document.getElementById('emineFilter').value;
            self.setPref('eMineLID', mapID);
            self.update();
        });

        // Region Filter
        let max = bgp.daGame.maxRegions();
        select = document.getElementById('emineRegion');
        for (let rid = 1; rid <= max; rid++) {
            let option = document.createElement('option');
            let name = self.regionName(rid);
            select.appendChild(option);
            option.innerText = (name ? name : rid);
            option.value = rid;
        }

        if ((!bgp.exPrefs.eMineRID) || bgp.exPrefs.eMineRID > max)
            bgp.exPrefs.eMineRID = parseInt(bgp.daGame.daUser.region);
        select.value = region = bgp.exPrefs.eMineRID;
        
        select.addEventListener('change', function(e) {
            bgp.exPrefs.eMineRID = region = document.getElementById('emineRegion').value;
            self.setPref('eMineRID', region);
            self.update();
        });
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/