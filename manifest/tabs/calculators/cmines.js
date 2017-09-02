/*
 ** DA Friends Calculator = cmines.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div, cmYou, cmStats, tb1Loot, tb2Loot, tblsum;
    var tb0sum, tb1sum, tb2sum, tf0sum, tf1sum, tf2sum, tf3sum;
    let uidRID = 0,
        uidLVL = 0,
        mapRID = 0,
        mapFLT = 0,
        mapList = {},
        mapLoot = {};
    let showLoot = 'all',
        showTokens = true,
        onlycmines = true;

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.cmines = {
        title: 'Maps',
        image: 'map.png',
        html: true,
        onInit: onInit,
        onAction: onAction,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {
        tabID = tid;
        tab = self.tabs.Calculators.menu[tid];
        div = tab.html;
        uidRID = parseInt(bgp.daGame.daUser.region);
        uidLVL = parseInt(bgp.daGame.daUser.level);
        cmYou = document.getElementById("cminesYou");
        cmStats = document.getElementById("cminesStats");
        tblsum = document.getElementById("cminesSum");
        tb0sum = document.getElementById("cminesSumTb0");
        tb1sum = document.getElementById("cminesSumTb1");
        tb2sum = document.getElementById("cminesSumTb2");
        tf0sum = document.getElementById("cminesSumTf0");
        tf1sum = document.getElementById("cminesSumTf1");
        tf2sum = document.getElementById("cminesSumTf2");
        tf3sum = document.getElementById("cminesSumTf3");
        tb1Loot = document.getElementById("cminesLoot1");
        tb2Loot = document.getElementById("cminesLoot2");
        buildFilters();
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
        //console.log(id, "onAction", action, data);
        if (action == 'enter_mine' || action == 'change_level') {
            bgp.daGame.mineDetails(data.id, true).then(function(mine) {
                console.log("Entered", mine.eid, data.id, data.level_id, mine);
                youMine = data.id;
                youFloor = data.level_id;
                youProgress = data.floor_progress;
                cmYou.innerHTML = '<hr />' + guiString('youAreIn', [mine.name, data.level_id, mine.flr]);

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
                    mine.floors[data.level_id].eTiles = tiles;
                } catch (e) {
                    console.error("Energy Count", e);
                }
                mineUpdate(mine);
            }).catch(leftMine);
        } else if (action == 'leave_mine') {
            leftMine();
        } else if (action == 'mine') {}
    }

    function mineUpdate(mine) {
        if (!bgp.daGame.daFilters || !bgp.daGame.daEvents)
            return;
        if ((mine.eid) && mine.event.isSeg)
            bgp.exPrefs.cminesURID = uidRID = bgp.daGame.daUser.region;
        if (mine.rid != mapRID) {
            let prefID = 'cminesFLT' + mine.rid;
            let filter = mapFLT;

            if ((bgp.exPrefs.cminesMRID = mapRID = mine.rid) != 0) {
                filter = mine.map;
            }else
                filter = mine.eid;
            bgp.exPrefs[prefID] = filter;                
        }

        self.update();
    }

    function leftMine(e) {
        youMine = youFloor = youProgress = 0;
        cmYou.innerHTML = '';
    }

    function errorDisplay(msg) {
        cmStats.innerHTML = ('<span class="error-text">' + msg + '</span><hr />');
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        cmStats.innerHTML = guiString('gameGetData') + '<hr />';
        document.getElementById("cminesWrapper").style.display = 'none';
        if (mapRID == 0) {
            return bgp.daGame.eventDetails(mapFLT, true).catch(function(error) {
                errorDisplay(error);
                return null;
            }).then(mapUpdate);
        } else
            return bgp.daGame.mapDetails(mapFLT, true).catch(function(error) {
                errorDisplay(error);
                return null;
            }).then(mapUpdate);
    }

    /*
     ** @Private - Update Map Display
     */
    function mapUpdate(map = mapList) {
        tb0sum.innerHTML = '';
        tb1sum.innerHTML = '';
        tb2sum.innerHTML = '';
        tf0sum.innerHTML = '';
        tf1sum.innerHTML = '';
        tf2sum.innerHTML = '';
        tf3sum.innerHTML = '';
        cmStats.innerHTML = '';

        if (((mapList = map) === null) || !!!map.mines) {
            errorDisplay(guiString('noMines'));
            return true;
        }

        let xlo = 0,
            rlo = 0,
            loc = 0;

        mapLoot = {
            rl: {},
            ql: {},
            xl: {},
            total: {},
            name: map.name
        };

        //console.log('mapUpdate', !!map.eid, !!map.isSeg, mapRID, mapFLT, map);

        // Fix (any) Player Region/Level to use for loot/reward calculations
        uidLVL = parseInt(bgp.daGame.daUser.level);
        uidRID = (!!map.isSeg ? parseInt(bgp.exPrefs.cminesURID) : parseInt(bgp.daGame.daUser.region));
        document.getElementById('cminesURID').disabled = !(!!map.isSeg);
        document.getElementById('cminesURID').value = uidRID;

        // Map Info
        if (!!map.eid) {
            xlo = map.xlo.length;
            let img = ((isBool(map.prm) ? 'shop' : 'events') + '.png');
            document.getElementById("cmines0Img").src = '/img/' + img;
        } else
            document.getElementById("cmines0Img").src = self.regionImgSrc(mapRID);
        document.getElementById("cmines0Name").innerText = map.name;

        // Here we add into the grand totals, any event completion rewards
        // so we don't lose sight of them.
        //
        if (!!map.rwd) {
            Object.keys(map.rwd).forEach(function(id) {
                let rwd = map.rwd[id];
                let amt = parseInt(rwd.amt);
                if (rwd.typ == 'system' && rwd.oid == 1) {
                    mapLoot = statsAdder(mapLoot, 0, amt, 0, 0, 0);
                } else
                    mapLoot.total = self.lootAdder(mapLoot.total, rwd.typ, rwd.oid, amt, amt, amt, 1);
            });
        }

        // Process each mine
        Object.keys(map.mines).sort(function(a, b) {
            let ta = map.mines[a];
            let tb = map.mines[b];
            return ta.ord - tb.ord;
        }).forEach(function(idx) {
            let mine = map.mines[idx];
            let good = !isBool(map.tst);

            // Skip invalid repeatables!
            //if (mine.cdn != 0 && mine.chn == 0)
            //good = false;

            // Process 'Good' Mine
            if (good) {
                let prg = parseInt(mine.prg);
                let cdn = parseInt(mine.cdn);
                let html = [],
                    bxp = 0,
                    egy = 0,
                    et = 0,
                    ev = 0;

                loc += 1;
                mapLoot[idx] = self.lootMine(mine, uidRID, uidLVL);
                mapLoot.total = self.lootSummary(mapLoot.total, mapLoot[idx].total);

                // Clearance Reward XP - Calculate for "Segmented" Events
                let rxp = parseInt(mine.rxp);
                if (mine.hasOwnProperty('ovr')) {
                    mine.ovr.forEach(function(ovr) {
                        if (ovr.region_id == uidRID)
                            rxp = parseInt(ovr.override_reward_exp);
                    });
                }

                // Repeatable
                if (cdn != 0) {
                    let variant = 0;
                    Object.keys(mine.floors).sort(function(a, b) {
                        let ta = mine.floors[a];
                        let tb = mine.floors[b];
                        return ta.fid - tb.fid;
                    }).forEach(function(fid) {
                        let floor = mine.floors[fid];
                        let loot = mapLoot[idx][fid];
                        let valid_floors = mapLoot[idx].floors;

                        if ((!!loot) && loot.chance > 0) {
                            prg = parseInt(floor.prg);
                            egy = loot.energy;
                            et = loot.etiles;
                            ev = loot.evalid;

                            // Bouns XP
                            bxp = 0;
                            if (loot.hasOwnProperty('system')) {
                                if (loot.system.hasOwnProperty(1)) {
                                    bxp = loot.system[1].avg;
                                }
                            }

                            loot.variant = (variant += 1);
                            let name = mine.name;
                            if (valid_floors > 1)
                                name = guiString('mineFloor', [name, variant]);

                            html.push('<tr id="cmine-', idx, '-', fid, '" data-cmine-lid="', mine.lid, '">');
                            html.push('<td>', name, '</td>');
                            html.push('<td>', ((mine.rql > 0) ? numberWithCommas(mine.rql) : ''), '</td>');
                            html.push('<td>', ((loot.chance < 100) ? numberWithCommas(loot.chance, 0) + '%' : ''), '</td>');
                            html.push('<td>', ((mine.cdn > 0) ? self.duration(mine.cdn, true) : '-'), '</td>');
                            html.push('<td>', ((mine.cdn > 0) ? numberWithCommas(mine.gem) : '-'), '</td>');
                            html.push('<td>', (ev ? ev : '-'), '</td>');
                            html = statsDisplay(html, prg, egy, bxp, rxp, et);
                            html.push('</tr>');
                        }

                    });
                } else {
                    // Energy
                    egy = mapLoot[idx].energy;
                    et = mapLoot[idx].etiles;
                    ev = mapLoot[idx].evalid;

                    // Add any XP loot as well
                    if (mapLoot[idx].total.hasOwnProperty('system')) {
                        if (mapLoot[idx].total.system.hasOwnProperty(1)) {
                            bxp = mapLoot[idx].total.system[1].avg;
                        }
                    }

                    html.push('<tr id="cmine-', idx, '-0', '" data-cmine-lid="', mine.lid, '">');
                    html.push('<td>', mine.name, '</td>');
                    html.push('<td>', ((mine.rql > 0) ? numberWithCommas(mine.rql) : '-'), '</td>');
                    html.push('<td colspan="3"></td>');
                    html.push('<td>', ((ev != mine.flr) ? ev + ' / ' + mine.flr : ev), '</td>');
                    html = statsDisplay(html, prg, egy, bxp, rxp, et);
                    html.push('</tr>');
                    mapLoot = statsAdder(mapLoot, prg, rxp, bxp, egy, et);
                }

                // Extended (Challenge) Mines
                if ((xlo > 0) && map.xlo.indexOf('' + mine.lid) !== -1) {
                    mapLoot.xl = statsSummary(mapLoot.xl, mapLoot[idx].total, prg, rxp, bxp, egy, et);
                    tb2sum.innerHTML += html.join('');
                } else if (cdn != 0) {
                    // Repeatable Mines
                    mapLoot.rl = statsSummary(mapLoot.rl, mapLoot[idx].total, prg, rxp, bxp, egy, et);
                    tb0sum.innerHTML += html.join('');
                    rlo += 1;
                } else {
                    // Standard Quest Mines
                    mapLoot.ql = statsSummary(mapLoot.ql, mapLoot[idx].total, prg, rxp, bxp, egy, et);
                    tb1sum.innerHTML += html.join('');
                }
            }
        });

        if (rlo != loc) {
            if (rlo > 0)
                totalsDisplay(tf0sum, 'arl', 'subTotal', mapLoot.rl, rlo);
            if (rlo > 0 || xlo > 0)
                totalsDisplay(tf1sum, 'aql', 'subTotal', mapLoot.ql, rlo);
            if (xlo > 0) {
                totalsDisplay(tf2sum, 'axl', 'subTotal', mapLoot.xl, rlo);
            }
            totalsDisplay(tf3sum, 'all', 'grandTotal', mapLoot, rlo);
            for (let i = 0, row; row = tblsum.rows[i]; i++)
                row.addEventListener('click', lootUpdate);
            lootUpdate();
        } else {
            for (let i = 0, row; row = tblsum.rows[i]; i++)
                row.addEventListener('click', lootUpdate);
            tb0sum.rows[0].dispatchEvent(new Event('click', {
                'bubbles': true
            }));
        }


        // Show the world
        document.getElementById("cminesWrapper").style.display = '';
        return true;
    }

    /*
     ** Update Loot Display
     */
    function lootUpdate(e = null, lid = showLoot, floor = 0) {
        if (e) {
            e.preventDefault();
            e = e.target;
            if (e.tagName != 'TR')
                e = e.parentElement;
            if (!e.id.startsWith('cmine-'))
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
                lootDisplay(mapLoot.rl, guiString('arlMines'));
                return;
            case 'aql':
                lootDisplay(mapLoot.ql, guiString('aqlMines'));
                return;
            case 'axl':
                lootDisplay(mapLoot.xl, guiString('axlMines'));
                return;
            case 'all':
                let text = guiString('allMines');
                if (mapLoot.rl.hasOwnProperty('prg'))
                    text += ' (' + guiString('excludeRepeatables') + ')';
                lootDisplay(mapLoot.total, text);
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

            lootDisplay(loot, mapLoot[lid].name, floor);
        }
    }

    /*
     ** Display Loot
     */
    function lootDisplay(count, name, floor = 0) {
        if (floor > 0)
            name = guiString('mineFloor', [name, count.variant]);
        document.getElementById("cmines1Name").innerText = name;
        tb1Loot.innerHTML = '';
        tb2Loot.innerHTML = '';

        if (count) {
            let order = self.objectOrder();

            //console.log(showTokens, name, count);
            Object.keys(count).sort(function(a, b) {
                return order.indexOf(a) - order.indexOf(b);
            }).forEach(function(typ) {
                Object.keys(count[typ]).sort(function(a, b) {
                    let ta = count[typ][a];
                    let tb = count[typ][b];

                    return self.objectRank(typ, a, tb.avg) - self.objectRank(typ, b, ta.avg);

                }).forEach(function(s_oid) {
                    if ((showTokens) || typ != 'token' && typ != 'artifact') {
                        let loot = count[typ][s_oid];
                        let oid = count[typ][s_oid].oid;
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
                            html.push('<td>', ((loot.rnd > 0) ? numberWithCommas(loot.rnd) : ''), '</td>');                            
                            html.push('</tr>');

                            if ((typ == 'material') && bgp.daGame.daMaterials[oid].eid == 0) {
                                tb1Loot.innerHTML += html.join('');
                            } else
                                tb2Loot.innerHTML += html.join('');
                        }
                    }
                });
            });
        }
    }

    /*
     ** Display Totals
     */
    function totalsDisplay(el, id, txt = null, count = null, rlo = 0) {
        let html = [];

        if (id == 'arl' || count === null) {
            html.push('<tr>');
            html.push('<td colspan="16">', '</td>');
        } else {
            let text = guiString(txt);
            if (id == 'all' && rlo != 0)
                text = text + ' (' + guiString('excludeRepeatables') + ')';
            html.push('<tr id="cmine-', id, '" title="', guiString(id + 'Mines'), '">');
            html.push('<td colspan="6">', text, '</td>');
            html = statsDisplay(html, count.prg, count.egy, count.bxp, count.rxp, count.et);
        }
        html.push('</tr>');
        el.innerHTML = html.join('');
    }

    /*
     ** Display Stats
     */
    function statsDisplay(html, prg, egy, bxp, rxp, et) {
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
        html.push('<td>', pxp > 0 ? numberWithCommas(pxp, 2) : '-', '</td>');

        return html;
    }

    /*
     ** Count Stats
     */
    function statsSummary(total, loot, prg, rxp, bxp, egy, et) {
        return self.lootSummary(statsAdder(total, prg, rxp, bxp, egy, et), loot);
    }

    function statsAdder(total, prg, rxp, bxp, egy, et) {
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

    /*
     ** @Private - Build Filters
     */
    function buildFilters() {
        // Tokens
        let check = document.getElementById("cminesMTOK");
        check.checked = showTokens = bgp.exPrefs.cminesMTOK;
        check.addEventListener('change', function(e) {
            showTokens = self.setPref(e.target.id, e.target.checked);
            lootUpdate();
        });

        // Region Filter
        let max = Math.min(bgp.daGame.daUser.region, bgp.daGame.maxRegions());
        let select1 = document.getElementById('cminesMRID');
        let select2 = document.getElementById('cminesURID');
        select1.innerHTML = '';
        select2.innerHTML = '';

        for (let rid = 0; rid <= max; rid++) {
            let option = document.createElement('option');
            let name = self.regionName(rid, true);
            option.innerText = (name ? name : rid);
            option.value = rid;
            select1.appendChild(option);
            if (rid > 0) {
                option = document.createElement('option');
                option.innerText = (name ? name : rid);
                option.value = rid;
                select2.appendChild(option);
            }
        }

        if ((!bgp.exPrefs.cminesMRID) || bgp.exPrefs.cminesMRID > max)
            bgp.exPrefs.cminesMRID = max;
        select1.value = mapRID = bgp.exPrefs.cminesMRID;

        select1.addEventListener('change', function(e) {
            mapRID = self.setPref(e.target.id, e.target.value);
            showLoot = 'all';
            mapFilter();
            self.update();
        });

        if ((!bgp.exPrefs.cminesURID) || bgp.exPrefs.cminesURID > max)
            bgp.exPrefs.cminesURID = parseInt(bgp.daGame.daUser.region);
        select2.value = uidRID = bgp.exPrefs.cminesURID;
        select2.disabled = true;

        select2.addEventListener('change', function(e) {
            uidRID = self.setPref(e.target.id, e.target.value);
            mapUpdate();
        });

        // Change Reaction ...
        select1.dispatchEvent(new Event('change', {
            'bubbles': true
        }));
    }

    function mapFilter() {
        let select = document.getElementById('cminesMFLT');
        select.innerHTML = '';

        if (!bgp.daGame.daFilters || !bgp.daGame.daEvents)
            return;

        let list = [];
        if (mapRID == 0) {
            list = Object.keys(bgp.daGame.daEvents).sort(function(a, b) {
                // Use the end date/time as the order_id seems wrong
                return bgp.daGame.daEvents[b].et - bgp.daGame.daEvents[a].et;
            });

            let optyear = 0;
            let parent = select;
            list.forEach(function(eid) {
                let evt = bgp.daGame.daEvents[eid];

                if (evt.loc.length > 0) {
                    let option = document.createElement('option');
                    let year = unixYear(evt.bt);

                    if (year != optyear) {
                        parent = document.createElement('optgroup');
                        parent.setAttribute('label', year);
                        select.appendChild(parent);
                        optyear = year;
                    }

                    parent.appendChild(option);
                    if (!evt.hasOwnProperty('name'))
                        evt.name = bgp.daGame.string(evt.nid);
                    option.innerText = evt.name;
                    option.value = eid;
                }
            });
        } else {
            list = Object.keys(bgp.daGame.daFilters).reduce(function(items, fid) {
                let map = bgp.daGame.daFilters[fid];
                if (map.rid == mapRID)
                    items.push(fid);
                return items;
            }, []).sort(function(a, b) {
                let ta = bgp.daGame.daFilters[a];
                let tb = bgp.daGame.daFilters[b];
                return ta.ord - tb.ord;
            });

            list.forEach(function(fid) {
                let map = bgp.daGame.daFilters[fid];
                let option = document.createElement('option');
                select.appendChild(option);
                option.innerText = bgp.daGame.string(map.nid);
                option.value = fid;
            });
        }

        let prefID = 'cminesFLT' + mapRID;
        if ((!bgp.exPrefs[prefID]) || list.indexOf(bgp.exPrefs[prefID]) === -1) {
            bgp.exPrefs[prefID] = list[0];
        }

        select.value = mapFLT = bgp.exPrefs[prefID];
        select.addEventListener('change', function(e) {
            let prefID = 'cminesFLT' + mapRID;
            mapFLT = self.setPref(prefID, e.target.value);
            showLoot = 'all';
            self.update();
        });
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/