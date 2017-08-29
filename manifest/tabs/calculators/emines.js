/*
 ** DA Friends Calculator = emines.js
 */
var guiTabs = (function(self) {
    var tabID, tab, div, level, region, emStats, tblSum, em1Loot, em2Loot;
    var tb0sum, tb1sum, tb2sum, tf0sum, tf1sum, tf2sum, tf3sum;
    var youMine, youFloor, youProgress, emYou;
    var mapID = 0,
        mapEvt = {};
    mapLoot = {};
    var showLoot = 'all',
        showFloors = false,
        showTokens = true;

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.emines = {
        title: 'Events',
        image: 'mine.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
        onAction: onAction
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
        tb0sum = document.getElementById("emineSumTb0");
        tb1sum = document.getElementById("emineSumTb1");
        tb2sum = document.getElementById("emineSumTb2");
        tf0sum = document.getElementById("emineSumTf0");
        tf1sum = document.getElementById("emineSumTf1");
        tf2sum = document.getElementById("emineSumTf2");
        tf3sum = document.getElementById("emineSumTf3");
        em1Loot = document.getElementById("emineLoot1");
        em2Loot = document.getElementById("emineLoot2");
        emStats = document.getElementById("emineStats");
        emYou = document.getElementById("emineYou");
        buildFilters();
        leftMine();
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
        //console.log(id, "onAction", action, data);

        if (action == 'enter_mine' || action == 'change_level') {

            // So we have the Raw Sync 'Data' Response from the game.
            // Check to see if its a mine we are trying to track
            // So we can extract the Energy for each tile
            //
            bgp.daGame.mineDetails(data.id, true).then(function(mine) {

                //console.log("Entered", mine.eid, data.id, data.level_id, mine);

                if (mine.eid == 0) {
                    leftMine();
                    return;
                }

                youMine = data.id;
                youFloor = data.level_id;
                youProgress = data.floor_progress;

                emYou.innerHTML = '<hr />' + guiString('youAreIn', [mine.name, data.level_id, mine.flr]);

                try {
                    let total = data.rows * data.columns;
                    let tiles = data.tiles.split(';').reduce(function(i, t) {
                        let tid = t.split(',')[0];
                        if (bgp.daGame.daTiles.hasOwnProperty(tid)) {
                            let tile = bgp.daGame.daTiles[tid];
                            if (parseInt(tile.egy) > 0)
                                i.push(tid);
                        }
                        return i;
                    }, []);

                    // Keep energy somewhere safe for now
                    let lsk = data.id + '-' + data.level_id;
                    localStorage.setItem(lsk, tiles);
                    //console.log(lsk, tiles);

                    mine.floors[data.level_id].eTiles = tiles;
                } catch (e) {
                    console.error("Energy Count", e);
                }

                if (mine.event.isSeg)
                    region = bgp.exPrefs.eMineRID = bgp.daGame.daUser.region;

                if (mapID != mine.eid) {
                    bgp.exPrefs.eMineLID = mapID = '' + mine.eid;
                    self.setPref('eMineLID', mapID);
                    self.update();
                } else
                    eventUpdate();

            }).catch(leftMine);
        } else if (action == 'leave_mine')
            leftMine();
    }

    function leftMine(e) {
        youMine = youFloor = youProgress = 0;
        emYou.innerHTML = '';
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

        emStats.innerHTML = guiString('gameGetData') + '<hr />';
        return bgp.daGame.eventDetails(mapID, true).catch(function(error) {
            emStats.innerHTML = '';
            mapID = 0;
            throw Error(error);
        }).then(eventUpdate);
    }

    function eventUpdate(evt = mapEvt) {
        let xlo = evt.xlo.length,
            rlo = 0;
        tb0sum.innerHTML = '';
        tb1sum.innerHTML = '';
        tb2sum.innerHTML = '';
        tf0sum.innerHTML = '';
        tf1sum.innerHTML = '';
        tf2sum.innerHTML = '';
        tf3sum.innerHTML = '';
        emStats.innerHTML = '';

        mapEvt = evt;
        mapLoot = {
            rl: {},
            ql: {},
            xl: {},
            total: {},
            name: evt.name
        };

        region = (evt.isSeg ? parseInt(bgp.exPrefs.eMineRID) : parseInt(bgp.daGame.daUser.region));

        //console.log('EVENT', showFloors, showTokens, evt);

        document.getElementById("emine-wrapper").style.display = '';
        document.getElementById("emine0Img").src = '/img/' + (isBool(evt.prm) ? 'shop' : 'events') + '.png';
        document.getElementById("emine0Name").innerText = evt.name;
        document.getElementById('emineRegion').disabled = !evt.isSeg;
        document.getElementById('emineRegion').value = region;
        document.getElementById('emineFilter').value = mapID;

        Object.keys(evt.mines).sort(function(a, b) {
            let ta = evt.mines[a];
            let tb = evt.mines[b];
            return ta.ord - tb.ord;
        }).forEach(function(idx) {
            let mine = evt.mines[idx];
            let prg = parseInt(mine.prg);
            let cdn = parseInt(mine.cdn);
            let html = [],
                bxp = 0,
                egy = 0,
                et = 0,
                ev = 0;

            //console.log(idx, mine.lid, mine);

            mapLoot[idx] = getFloors(mine);
            mapLoot.total = sumLoot(mapLoot.total, mapLoot[idx].total);

            // Clearance Reward XP - Calculate for "Segmented" Events
            let rxp = parseInt(mine.rxp);
            if (mine.hasOwnProperty('ovr')) {
                mine.ovr.forEach(function(ovr) {
                    if (ovr.region_id == region)
                        rxp = parseInt(ovr.override_reward_exp);
                });
            }

            // Repeatable
            if (cdn != 0) {
                Object.keys(mine.floors).sort(function(a, b) {
                    let ta = mine.floors[a];
                    let tb = mine.floors[b];
                    return ta.fid - tb.fid;
                }).forEach(function(fid) {
                    let floor = mine.floors[fid];
                    let loot = mapLoot[idx][fid];
                    let chn = 100;

                    prg = parseInt(floor.prg);
                    egy = loot.energy;
                    et = loot.etiles;
                    et = loot.valid;
                    bxp = 0;

                    // Chance of repeatbale floor
                    if ((mine.flr > 1) && mine.hasOwnProperty('rot')) {
                        if (mine.rot.hasOwnProperty(fid)) {
                            let mchn = parseInt(mine.chn);
                            let fchn = parseInt(mine.rot[fid].chn);

                            try {
                                chn = Math.floor((fchn / mchn) * 100);
                            } catch (e) {
                                chn = 100;
                            }
                        }
                    }

                    // Bouns XP
                    if (loot.hasOwnProperty('system')) {
                        if (loot.system.hasOwnProperty(1)) {
                            bxp = loot.system[1].avg;
                        }
                    }

                    html.push('<tr id="emine-', idx, '-', fid, '" data-emine-lid="', mine.lid, '">');
                    html.push('<td>', self.regionImage(floor.rid, false, 32), '</td>');

                    html.push('<td>', mine.name);
                    if (parseInt(mine.flr) > 1) {
                        html.push(' (', fid);
                        if (chn < 100)
                            html.push(' - ', chn, '%');
                        html.push(')');
                    }
                    html.push('</td>');

                    html.push('<td>', ((mine.rql > 0) ? numberWithCommas(mine.rql) : ''), '</td>');
                    html.push('<td>', (ev ? ev : '-'), '</td>');

                    html = showStats(html, prg, egy, bxp, rxp, et);
                    html.push('</tr>');
                });
            } else {

                // Energy
                egy = mapLoot[idx].energy;
                et = mapLoot[idx].etiles;
                ev = mapLoot[idx].valid;

                // Add any XP loot as well
                if (mapLoot[idx].total.hasOwnProperty('system')) {
                    if (mapLoot[idx].total.system.hasOwnProperty(1)) {
                        bxp = mapLoot[idx].total.system[1].avg;
                    }
                }

                html.push('<tr id="emine-', idx, '-0', '" data-emine-lid="', mine.lid, '">');
                html.push('<td>', self.regionImage(mine.rid, false, 32), '</td>');
                html.push('<td>', mine.name, '</td>');
                html.push('<td>', ((mine.rql > 0) ? numberWithCommas(mine.rql) : ''), '</td>');
                html.push('<td>', ((ev != mine.flr) ? ev + ' / ' + mine.flr : ev), '</td>');
                html = showStats(html, prg, egy, bxp, rxp, et);
                html.push('</tr>');
                mapLoot = countStats(mapLoot, prg, rxp, bxp, egy, et);
            }

            // Extended (Challenge) Mines
            if ((xlo > 0) && evt.xlo.indexOf('' + mine.lid) !== -1) {
                mapLoot.xl = sumStats(mapLoot.xl, mapLoot[idx].total, prg, rxp, bxp, egy, et);
                tb2sum.innerHTML += html.join('');
            } else if (cdn != 0) {
                // Repeatable Mines
                mapLoot.rl = sumStats(mapLoot.rl, mapLoot[idx].total, prg, rxp, bxp, egy, et);
                tb0sum.innerHTML += html.join('');
                rlo += 1;
            } else {
                // Standard Quest Mines
                mapLoot.ql = sumStats(mapLoot.ql, mapLoot[idx].total, prg, rxp, bxp, egy, et);
                tb1sum.innerHTML += html.join('');
            }
        });

        if (rlo != evt.loc.length) {
            if (rlo > 0)
                mapTotals(tf0sum, 'arl', 'subTotal', mapLoot.rl, rlo);
            if (rlo > 0 || xlo > 0)
                mapTotals(tf1sum, 'aql', 'subTotal', mapLoot.ql, rlo);
            if (xlo > 0) {
                mapTotals(tf2sum, 'axl', 'subTotal', mapLoot.xl, rlo);
            }
            mapTotals(tf3sum, 'all', 'grandTotal', mapLoot, rlo);
            lootUpdate();
        } else {
            lootUpdate(null, 0, 1);
        }

        for (let i = 0, row; row = tblSum.rows[i]; i++) {
            row.addEventListener('click', lootUpdate);
        }

        return true;
    }

    function sumStats(total, loot, prg, rxp, bxp, egy, et) {
        return sumLoot(countStats(total, prg, rxp, bxp, egy, et), loot);
    }

    function countStats(total, prg, rxp, bxp, egy, et) {
        if (!total.hasOwnProperty('prg')) {
            total.prg = prg;
            total.egy = egy;
            total.bxp = bxp;
            total.rxp = rxp;
            total.et = et;
        } else {
            total.prg += prg;
            total.egy += egy;
            total.bxp += bxp;
            total.rxp += rxp;
            total.et += et;
        }
        return total;
    }

    function showStats(html, prg, egy, bxp, rxp, et) {
        let txp = parseInt(egy) + parseInt(bxp) + parseInt(rxp);
        let pxp = egy > 0 ? (((txp - egy) / egy) * 100) : 0;
        let ata = prg > 0 ? Math.round(parseInt(egy) / parseInt(prg)) : 0;
        let eta = et > 0 ? Math.round(parseInt(egy) / parseInt(et)) : 0;

        html.push('<td>', numberWithCommas(prg), '</td>');
        html.push('<td>', numberWithCommas(ata), '</td>');
        html.push('<td>', numberWithCommas(et), '</td>');
        html.push('<td>', numberWithCommas(eta), '</td>');
        html.push('<td>', numberWithCommas(egy), '</td>');
        html.push('<td>', numberWithCommas(bxp), '</td>');
        html.push('<td>', numberWithCommas(rxp), '</td>');
        html.push('<td>', numberWithCommas(txp), '</td>');
        html.push('<td>', pxp > 0 ? numberWithCommas(txp - egy) : '-', '</td>');
        html.push('<td>', numberWithCommas(pxp, 2), '</td>');

        return html;
    }

    function mapTotals(el, id, txt = null, count = null, rlo = 0) {
        let html = [];

        if (id == 'arl' || count === null) {
            html.push('<tr>');
            html.push('<td colspan="14">', '</td>');
        } else {
            let text = guiString(txt);
            if (id == 'all' && rlo != 0)
                text = '(' + guiString('excludeRepeatables') + ') ' + text;
            html.push('<tr id="emine-', id, '" title="', guiString(id + 'Mines'), '">');
            html.push('<td colspan="4">', text, '</td>');
            html = showStats(html, count.prg, count.egy, count.bxp, count.rxp, count.et);
        }
        html.push('</tr>');
        el.innerHTML = html.join('');
    }

    function lootTotals(count, name, floor = 0) {
        if (floor > 0)
            name = guiString('mineFloor', [name, floor]);
        document.getElementById("emine1Name").innerText = name;
        em1Loot.innerHTML = '';
        em2Loot.innerHTML = '';

        if (count) {
            let order = self.objectOrder();

            //console.log(showTokens, name, count);
            Object.keys(count).sort(function(a, b) {
                return order.indexOf(a) - order.indexOf(b);
            }).forEach(function(typ) {
                Object.keys(count[typ]).sort(function(a, b) {
                    let ta = count[typ][a];
                    let tb = count[typ][b];
                    let rank = 0;

                    if ((rank = self.objectRank(typ, a, 0) - self.objectRank(typ, b, 0)) != 0)
                        return rank;
                    return tb.avg - ta.avg;
                }).forEach(function(oid) {
                    if ((showTokens) || typ != 'token' && typ != 'artifact') {
                        let loot = count[typ][oid];
                        let html = [];

                        //console.log(loot);

                        if (loot.name) {
                            html.push('<tr data-oid="', oid, '">');
                            html.push('<td>', self.objectImage(typ, oid, 24), '</td>');
                            html.push('<td>', loot.name, '</td>');

                            if (loot.min != loot.max) {
                                html.push('<td>', numberWithCommas(loot.min), '</td>');
                                html.push('<td>', numberWithCommas(loot.avg), '</td>');
                                html.push('<td>', numberWithCommas(loot.max), '</td>');
                            } else
                                html.push('<td></td><td>', numberWithCommas(loot.avg), '</td><td></td>');
                            html.push('<td>', numberWithCommas(loot.qty), '</td>');
                            html.push('</tr>');

                            if ((typ == 'material') && bgp.daGame.daMaterials[oid].eid == 0) {
                                //console.log(loot.name, bgp.daGame.daMaterials[oid]);
                                em1Loot.innerHTML += html.join('');
                            } else
                                em2Loot.innerHTML += html.join('');
                        }
                    }
                });
            });
        }
    }

    function lootUpdate(e = null, lid = showLoot, floor = 0) {
        if (e) {
            e.preventDefault();
            e = e.target;
            if (e.tagName != 'TR')
                e = e.parentElement;
            if (!e.id.startsWith('emine-'))
                return;
            showLoot = e.id;
            floor = 0;
            let parts = e.id.split('-');
            lid = parts[1];
            if (parts.length > 2)
                floor = parts[2];
        } else
            showLoot = lid;

        switch (lid) {
            case 'arl':
                lootTotals(mapLoot.rl, guiString('arlMines'));
                return;
            case 'aql':
                lootTotals(mapLoot.ql, guiString('aqlMines'));
                return;
            case 'axl':
                lootTotals(mapLoot.xl, guiString('axlMines'));
                return;
            case 'all':
                let text = guiString('allMines');
                if (mapLoot.rl.hasOwnProperty('prg'))
                    text += ' (' + guiString('excludeRepeatables') + ')';
                lootTotals(mapLoot.total, text);
                return;
        }

        // Single Location(/floor) Loot
        if (mapLoot.hasOwnProperty(lid)) {
            let loot = mapLoot[lid].total;

            if (floor != 0) {
                loot = mapLoot[lid][floor];
                if (mapLoot[lid].floors <= 1)
                    floor = 0;
            }

            lootTotals(loot, mapLoot[lid].name, floor);
        }
    }

    function getFloors(mine) {
        let mLoot = {
            total: {},
            valid: 0,
            energy: 0,
            etiles: 0,
            floors: 0,
            name: mine.name
        };

        Object.keys(mine.floors).sort(function(a, b) {
            let ta = mine.floors[a];
            let tb = mine.floors[b];
            return ta.fid - tb.fid;
        }).forEach(function(fid) {
            let floor = mine.floors[fid];
            let lsk = mine.lid + '-' + fid;

            mLoot[fid] = getLoot(floor);
            mLoot.total = sumLoot(mLoot.total, mLoot[fid]);
            mLoot.floors += 1;

            if (floor.hasOwnProperty('eTiles')) {
                let e = sumEnergy(floor.eTiles);
                mLoot[fid].valid = 1;
                mLoot.energy += (mLoot[fid].energy = e.energy);
                mLoot.etiles += (mLoot[fid].etiles = e.etiles);
                mLoot.valid += 1;
            } else if (localStorage.hasOwnProperty(lsk)) {
                let e = sumEnergy(localStorage.getItem(lsk));
                mLoot[fid].valid = 1;
                mLoot.energy += (mLoot[fid].energy = e.energy);
                mLoot.etiles += (mLoot[fid].etiles = e.etiles);
                mLoot.valid += 1;
            }
        });

        return mLoot;
    }

    function getLoot(floor) {
        let count = {
            energy: 0,
            etiles: 0,
            valid: 0
        };

        Object.keys(floor.loot).forEach(function(id) {
            let loot = floor.loot[id];
            let coef = parseFloat(loot.cof);
            let qty = loot.tle.length;
            let min = parseInt(loot.min) + (coef != 0.0 ? Math.floor((level * coef) * parseInt(loot.min)) : 0);
            let max = parseInt(loot.max) + (coef != 0.0 ? Math.floor((level * coef) * parseInt(loot.max)) : 0);
            let oid = parseInt(loot.oid);
            let rid = (loot.hasOwnProperty('rid') ? loot.rid : 0);

            if (qty && (rid == 0 || rid == region)) {
                min *= qty;
                max *= qty;
                //avg *= qty;
                let avg = Math.floor((min + max) / 2);
                count = addLoot(count, loot.typ, oid, min, max, avg, qty);
            }
        });

        return count;
    }

    function addLoot(count, typ, oid, min, max, avg, qty) {

        if (parseInt(min) > 0) {
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

    function sumEnergy(tiles) {
        let energy = 0;
        if (typeof tiles === 'string')
            tiles = tiles.split(',');

        tiles.forEach(function(tid) {
            let tile = bgp.daGame.daTiles[tid];

            if (tile) {
                if (tile.hasOwnProperty('ovr')) {
                    tile.ovr.forEach(function(ovr) {
                        if (ovr.region_id == region)
                            tile = bgp.daGame.daTiles[ovr.override_tile_id];
                    });
                }

                energy += parseInt(tile.egy);
            }
        });

        return {
            energy: energy,
            etiles: tiles.length
        }
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
            showLoot = 'all';
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
            eventUpdate();
        });

        // Floors
        //
        // <label for="emineFloors" data-i18n-text="Floors"></label><input type="checkbox" value="false" id="emineFloors" />
        let check = document.getElementById("emineFloors");
        if (check) {
            check.checked = showFloors = !!bgp.exPrefs.emineFloors;
            check.addEventListener('change', function(e) {
                if (e.target.checked != bgp.exPrefs.emineFloors) {
                    bgp.exPrefs.emineFloors = showFloors = self.setPref("emineFloors", e.target.checked);
                    showLoot = 'all';
                    eventUpdate();
                }
            });
        }

        // Tokens
        check = document.getElementById("emineTokens");
        if (check) {
            check.checked = showTokens = !!bgp.exPrefs.emineTokens;
            check.addEventListener('change', function(e) {
                if (e.target.checked != bgp.exPrefs.emineTokens) {
                    bgp.exPrefs.emineTokens = showTokens = self.setPref("emineTokens", e.target.checked);
                    lootUpdate();
                }
            });
        }
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/