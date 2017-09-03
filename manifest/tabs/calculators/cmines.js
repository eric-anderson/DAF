/*
 ** DA Friends Calculator = cmines.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div, cmStats, tb1Loot, tb2Loot, tblsum;
    var tb0sum, tb1sum, tb2sum, tf0sum, tf1sum, tf2sum, tf3sum;
    let uidRID = 0,
        uidLVL = 0,
        uidTUT = 1,
        mapRID = 0,
        mapFLT = 0,
        mapList = {},
        mapLoot = {};
    let showLoot = 'all',
        showEvents = false,
        showTokens = true,
        onlyRepeat = true;

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.cmines = {
        title: 'Locations',
        image: 'mine.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {
        tabID = tid;
        tab = self.tabs.Calculators.menu[tid];
        div = tab.html;
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
        uidTUT = intOrDefault(bgp.daGame.daUser.tutorial_def_id, 1);
        uidRID = intOrDefault(bgp.daGame.daUser.region, 1);
        uidLVL = intOrDefault(bgp.daGame.daUser.level, 1);
        showEvents = self.isDev();
        if ((onlyRepeat = !self.isDev())) {
            bgp.exPrefs.cminesURID = uidRID;
            bgp.exPrefs.cminesMTOK = showTokens = true;
            tab.title = 'Repeatables';
            tab.image = 'loot.png';
        }
        buildFilters();
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

        if (self.isDev) {
            let e = document.getElementById('calcDevOnly');
            e.style.display = 'block';
            e.innerText = guiString('devOnly');
        }

        if (mapRID == 0) {
            return bgp.daGame.eventDetails(mapFLT, true, true, true).catch(function(error) {
                errorDisplay(error);
                return null;
            }).then(mapUpdate);
        } else
            return bgp.daGame.mapDetails(mapFLT, true, true, true).catch(function(error) {
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
        } else {
            document.getElementById("cmines0Img").src = self.regionImgSrc(mapRID);
            if (!!map.xlo)
                xlo = map.xlo.length;
        }
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

            if (ta.mflt != tb.mflt) {
                if (ta.mflt < tb.mflt) return -1;
                if (ta.mflt > tb.mflt) return 1;
            }

            if (ta.gid != tb.gid)
                return ta.gid - tb.gid;

            return ta.ord - tb.ord;
        }).forEach(function(idx) {
            let mine = map.mines[idx];
            let good = !isBool(map.tst);
            let mtitle = (self.isDev ? mine.lid : mine.name);

            // Only show users tutorial mines
            if ((good && !!mine.tut) && mine.tut != uidTUT)
                good = false; 

            // Process 'Good' Mine
            if (good) {
                let prg = parseInt(mine.prg);
                let cdn = parseInt(mine.cdn);
                let uPrg = 0;
                let html = [],
                    bxp = 0,
                    egy = 0,
                    et = 0,
                    ev = 0;

                loc += 1;
                mapLoot[idx] = self.lootMine(mine, uidRID, uidLVL);
                mapLoot.total = self.lootSummary(mapLoot.total, mapLoot[idx].total);

                // Is this an Extended Location
                let isXLO = ((xlo > 0) && map.xlo.indexOf('' + mine.lid) !== -1);

                // Your Progress
                if (!!bgp.daGame.daUser.loc_prog[mine.lid]) {
                    let prog = bgp.daGame.daUser.loc_prog[mine.lid];
                    uPrg = prog.prog;
                    mine.uPrg = uPrg;
                    /*
                    console.log(mine.name, prog.id, prog.lvl, prog.prog, prog.reset);
                    console.log('CMPL', unixDate(prog.cmpl, true));
                    console.log('CRTD', unixDate(prog.crtd, true));
                    console.log('CMPL+CDN', unixDate((parseInt(prog.cmpl) + parseInt(mine.cdn)), true));
                    */
                }

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
                            html.push('<tr class="selectable rloc" id="cmine-', idx, '-', fid, '" data-cmine-lid="', mine.lid, '">');
                            html.push('<td colspan="3" title="', mtitle, '">', name, '</td>');
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

                    if (prg > 0) {
                        html.push('<tr class="selectable qloc" id="cmine-', idx, '-0', '" data-cmine-lid="', mine.lid, '">');
                    } else
                        html.push('<tr class="tloc">');

                    html.push('<td>', mineIcon(mine), '</td>');
                    html.push('<td title="', mtitle, '">', mine.name, '</td>');

                    if (uPrg >= prg) {
                        html.push('<td>', '<img width="16" src="/img/tick.png" />', '</td>');
                    } else
                        html.push('<td>', '</td>')

                    html.push('<td>', ((mine.rql > 0) ? numberWithCommas(mine.rql) : '-'), '</td>');
                    html.push('<td colspan="3"></td>');
                    html.push('<td>', ((ev != mapLoot[idx].floors) ? ev + ' / ' + mapLoot[idx].floors : ev), '</td>');
                    html = statsDisplay(html, prg, egy, bxp, rxp, et);
                    mapLoot = statsAdder(mapLoot, prg, rxp, bxp, egy, et);
                    html.push('</tr>');
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
                let txt = !!map.eid ? 'axl' : 'asl';
                totalsDisplay(tf2sum, txt, 'subTotal', mapLoot.xl, rlo);
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
    function lootUpdate(e = null, lid = showLoot) {
        if (e) {
            e.preventDefault();
            e = e.target;
            if (e.tagName != 'TR')
                e = e.parentElement;

            if (!e.id.startsWith('cmine-'))
                return;
            showLoot = e.id;
        } else
            showLoot = lid;

        let parts = showLoot.split('-');
        let floor = 0;
        lid = parts[1];
        if (parts.length > 2)
            floor = parts[2];

        switch (lid) {
            case 'arl':
                lootDisplay(mapLoot.rl, guiString('arlMines'));
                return;
            case 'aql':
                lootDisplay(mapLoot.ql, guiString('aqlMines'));
                return;
            case 'axl':
            case 'asl':
                lootDisplay(mapLoot.xl, guiString(lid + 'Mines'));
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

            console.log(mapList.mines[lid]);

            if (floor != 0) {
                loot = mapLoot[lid][floor];
                if (mapLoot[lid].floors <= 1)
                    floor = 0;
            }
            lootDisplay(loot, mapLoot[lid].name, floor);
        } else
            document.getElementById("cmines1").parentElement.style.display = 'none';
    }

    /*
     ** Display Loot
     */
    function lootDisplay(count, name, floor = 0) {
        if (floor > 0)
            name = guiString('mineFloor', [name, count.variant]);
        document.getElementById("cmines1Name").innerText = name;
        document.getElementById("cmines1").parentElement.style.display = '';
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
                        let ltitle = (self.isDev() ? typ + ' - ' + oid : '');
                        let html = [];

                        //console.log(loot);

                        if (loot.name) {
                            html.push('<tr data-oid="', oid, '">');
                            html.push('<td>', self.objectImage(typ, oid, 24), '</td>');
                            html.push('<td title="', ltitle, '">', loot.name, '</td>');

                            html.push('<td>', ((loot.rnd > 0) ? numberWithCommas(loot.rnd) : ''), '</td>');
                            html.push('<td>', numberWithCommas(loot.qty), '</td>');

                            if (loot.min != loot.max) {
                                html.push('<td>', numberWithCommas(loot.min), '</td>');
                                html.push('<td>', numberWithCommas(loot.avg), '</td>');
                                html.push('<td>', numberWithCommas(loot.max), '</td>');
                            } else
                                html.push('<td></td><td>', numberWithCommas(loot.avg), '</td><td></td>');

                            html.push('</tr>');

                            if ((typ == 'material') && bgp.daGame.daMaterials[oid].eid == 0) {
                                tb1Loot.innerHTML += html.join('');
                            } else
                                tb2Loot.innerHTML += html.join('');
                        }
                    }
                });
            });
        } else {
            console.log("No Count!");
        }
    }

    /*
     ** Display Totals
     */
    function totalsDisplay(el, id, txt = null, count = null, rlo = 0) {
        let html = [];

        if (id == 'arl' || count === null) {
            html.push('<tr>');
            html.push('<td colspan="18">', '</td>');
        } else {
            let text = guiString(txt);
            if (id == 'all' && rlo != 0)
                text = text + ' (' + guiString('excludeRepeatables') + ')';
            html.push('<tr class="selectable" id="cmine-', id, '" title="', guiString(id + 'Mines'), '">');
            html.push('<td colspan="8">', text, '</td>');
            html = statsDisplay(html, count.prg, count.egy, count.bxp, count.rxp, count.et);
        }
        html.push('</tr>');
        el.innerHTML = html.join('');
    }

    /*
     ** Display Stats
     */
    function statsDisplay(html, prg, egy, bxp, rxp, et) {
        if (prg > 0) {
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
        } else
            html.push('<td colspan="10"></td>');
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
     ** @Private - Mine Type ICON
     */
    function mineIcon(mine) {
        let img = 'blank.gif';

        if (!mine.tut > 0) {} else
            img = 'tutorial.png';

        return ('<img width="24" src="/img/' + img + '" />');
    }

    /*
     ** @Private - Build Filters
     */
    function buildFilters() {
        // Tokens
        let check = document.getElementById("cminesMTOK");
        check.parentElement.style.display = (onlyRepeat ? 'none' : '');
        if (!onlyRepeat) {
            check.checked = showTokens = !!bgp.exPrefs.cminesMTOK;
            check.addEventListener('change', function(e) {
                showTokens = self.setPref(e.target.id, e.target.checked);
                lootUpdate();
            });
        }

        // Region Filter
        let max = bgp.daGame.maxRegions();
        if (!self.isDev())
            max = Math.min(bgp.daGame.daUser.region, max);
        let select1 = document.getElementById('cminesMRID');
        let select2 = document.getElementById('cminesURID');
        select2.parentElement.style.display = (showEvents ? '' : 'none');
        select1.innerHTML = '';
        select2.innerHTML = '';

        for (let rid = (showEvents ? 0 : 1); rid <= max; rid++) {
            let option = document.createElement('option');
            let name = self.regionName(rid, true);
            option.innerText = (name ? name : rid);
            option.value = rid;
            select1.appendChild(option);
            if ((select2) && rid > 0) {
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
            showLoot = 'cmine-all';
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

        // Chain Reaction ...
        select1.dispatchEvent(new Event('change', {
            'bubbles': true
        }));
    }

    function mapFilter() {
        let select = document.getElementById('cminesMFLT');
        select.parentElement.style.display = (onlyRepeat ? 'none' : '');
        select.innerHTML = '';

        if (!bgp.daGame.daFilters || !bgp.daGame.daEvents)
            return;

        let list = [];
        if ((showEvents) && mapRID == 0) {
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
                if (map.rid == mapRID) {
                    let isRepeat = map.flt.endsWith('refresh');
                    if ((isRepeat) || !onlyRepeat)
                        items.push(fid);
                }
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