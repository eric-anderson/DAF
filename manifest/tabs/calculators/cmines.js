/*
 ** DA Friends Calculator = cmines.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div, cmStats, tb1Loot, tb2Loot, tblsum;
    let tb0sum, tb1sum, tb2sum, tf0sum, tf1sum, tf2sum, tf3sum;
    let cm0Warn, cm1Warn;
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
        cm0Warn = document.getElementById("cmines0Warn");
        cm1Warn = document.getElementById("cmines1Warn");
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

        if (self.isDev()) {
            var button = document.createElement('button');
            button.innerHTML = 'Make wiki table';
            button.onclick = wikiMineTable;
            document.getElementById('cminesSettings').appendChild(button);
        }

        // TODO: If we ever put the full calculator live to the community
        // We should force the Player Region for Events based on the
        // "bg.daGame.daUser.events_region" field so it calculates on
        // the correct region at the time
        //
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
        document.getElementById("cminesRewards").style.display = 'none';
        document.getElementById("cmines2Rwd").innerHTML = '';

        if (self.isDev()) {
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

        // Set (any) Player Region/Level to use for loot/reward calculations
        uidLVL = parseInt(bgp.daGame.daUser.level);
        uidRID = (!!map.isSeg ? parseInt(bgp.exPrefs.cminesURID) : parseInt(bgp.daGame.daUser.region));
        document.getElementById('cminesURID').disabled = !(!!map.isSeg);
        document.getElementById('cminesURID').value = uidRID;
        cm0Warn.style.display = 'none';
        cm0Warn.innerHTML = '';

        if (bgp.exPrefs.debug) console.log('mapUpdate', mapRID, mapFLT, uidRID, uidLVL, map);

        // Map Info
        if (!!map.eid) {
            xlo = map.xlo.length;
            let img = ((isBool(map.prm) ? 'shop' : 'events') + '.png');
            document.getElementById("cmines0Img").src = '/img/' + img;
            if (map.isSeg) {
                cm0Warn.innerHTML = guiString('warnLootRegion', [self.regionName(uidRID)]);
                cm0Warn.style.display = '';
            }
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
            document.getElementById("cminesRewards").style.display = '';
            document.getElementById("cmines2Name").innerHTML = guiString('Rewards').toUpperCase();

            // Event Completion Rewards
            //
            let html = [];
            let rows = 0;
            let list = Object.keys(map.rwd);

            // How many?
            list.forEach(function(id) {
                if ((map.rwd[id].rid == 0) || map.rwd[id].rid == uidRID)
                    rows = rows + 1;
            });

            if (rows > 0) {
                html.push('<tr>', '<td rowspan="', rows, '">', guiString('Completion'), '</td>');
                let onRow = 0;
                list.forEach(function(id) {
                    let rwd = map.rwd[id];
                    if ((rwd.rid == 0) || rwd.rid == uidRID) {
                        if (onRow++ > 0)
                            html.push('<tr>');
                        html.push('<td>', self.objectImage(rwd.typ, rwd.oid, 24), '</td>'); // Icon
                        html.push('<td class="left">', self.objectName(rwd.typ, rwd.oid), '</td>'); // Description                
                        html.push('<td>', numberWithCommas(intOrDefault(rwd.amt)), '</td>'); // Qty         
                        html.push('</tr>');
                    }
                });
            }

            document.getElementById("cmines2Rwd").innerHTML = html.join('');
        }

        // Process each mine
        Object.keys(map.mines).sort(mineOrder(map.mines)).forEach(function(idx) {
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
                mine.isXLO = isXLO;

                // Your Progress
                if (!!bgp.daGame.daUser.loc_prog[mine.lid]) {
                    let prog = bgp.daGame.daUser.loc_prog[mine.lid];
                    mine.uPrg = uPrg = prog.prog;
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
                            html.push('<tr class="selectable rloc" id="cmine-', idx, '-', fid, '" data-cmine-lid="',
                                mine.lid, '" data-cmine-name="', name, '">');
                            if (!onlyRepeat) {
                                html.push('<td>', self.mineImage('repeat.png'), '</td>');
                                html.push('<td colspan="2" style="text-align: left !important" title="', mtitle, '">', name, '</td>');
                            } else
                                html.push('<td colspan="3" title="', mtitle, '">', name, '</td>');
                            html.push('<td>', ((mine.rql > 0) ? numberWithCommas(mine.rql) : '-'), '</td>');
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
                        html.push('<tr class="selectable qloc" id="cmine-', idx, '-0',
                            '" data-cmine-lid="', mine.lid, '" data-cmine-name="', mine.name, '">');
                    } else
                        html.push('<tr class="tloc">');

                    html.push('<td>', self.mineImage(mine), '</td>');
                    html.push('<td title="', mtitle, '">', mine.name, '</td>');

                    if (uPrg >= prg) {
                        html.push('<td>', '<img width="16" src="/img/tick.png" />', '</td>');
                    } else
                        html.push('<td>', '</td>')

                    html.push('<td>', ((mine.rql > 0) ? numberWithCommas(mine.rql) : '-'), '</td>');
                    html.push('<td colspan="3"></td>');
                    html.push('<td>', ((ev != mapLoot[idx].floors) ? ev + ' / ' + mapLoot[idx].floors : ev), '</td>');
                    html = statsDisplay(html, prg, egy, bxp, rxp, et);
                    mapLoot = statsAdder(mapLoot, prg, rxp, bxp, egy, et, mapLoot[idx].l_loot);
                    html.push('</tr>');
                }

                // Extended (Challenge/Side Quest) Mines
                if ((xlo > 0) && map.xlo.indexOf('' + mine.lid) !== -1) {
                    mapLoot.xl = statsSummary(mapLoot.xl, mapLoot[idx].total, prg, rxp, bxp, egy, et, mapLoot[idx].l_loot);
                    tb2sum.innerHTML += html.join('');
                } else if (cdn != 0) {
                    // Repeatable Mines
                    mapLoot.rl = statsSummary(mapLoot.rl, mapLoot[idx].total, prg, rxp, bxp, egy, et, mapLoot[idx].l_loot);
                    tb0sum.innerHTML += html.join('');
                    rlo += 1;
                } else {
                    // Standard Quest Mines
                    mapLoot.ql = statsSummary(mapLoot.ql, mapLoot[idx].total, prg, rxp, bxp, egy, et, mapLoot[idx].l_loot);
                    tb1sum.innerHTML += html.join('');
                }
            }
        });

        let row = tblsum.rows[tblsum.rows.length - 1];
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
            row = tblsum.rows[tblsum.rows.length - 1];
        } else {
            row = tb0sum.rows[0];
        }

        let select = document.getElementById("cmines1Select");
        select.innerHTML = '';
        for (let i = 0, row; row = tblsum.rows[i]; i++) {
            let option = document.createElement('option');
            let name = ((!!row.dataset['cmineName']) ? row.dataset.cmineName : row.title);
            if (name) {
                option.innerText = name.toUpperCase();
                option.value = row.id;
                if (!row.dataset['cmineName'])
                    option.style.fontWeight = "bold";
                select.appendChild(option);
            }
            row.addEventListener('click', lootUpdate);
        }
        if (row) {
            select.value = row.id;
            row.dispatchEvent(new Event('click'));
        }

        // Show the world
        document.getElementById("cminesWrapper").style.display = '';
        return true;
    }

    function mineOrder(mines) {
        return function(a, b) {
            let ta = mines[a];
            let tb = mines[b];

            if (ta.seq - tb.seq)
                return ta.seq - tb.seq;
            if (ta.gid - tb.gid)
                return ta.gid - tb.gid;
            return ta.ord - tb.ord;
        }
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
            document.getElementById("cmines1Select").value = showLoot;
            window.scroll(0, getElementYPos(document.getElementById("cmines1")));
        } else
            showLoot = lid;

        let parts = showLoot.split('-');
        let floor = 0;
        lid = parts[1];
        if (parts.length > 2)
            floor = parts[2];

        switch (lid) {
            case 'arl':
                lootDisplay(mapLoot.rl, guiString('arlMines'), 0, mapLoot.rl.l_loot);
                return;
            case 'aql':
                lootDisplay(mapLoot.ql, guiString('aqlMines'), 0, mapLoot.ql.l_loot);
                return;
            case 'axl':
            case 'asl':
                lootDisplay(mapLoot.xl, guiString(lid + 'Mines'), 0, mapLoot.xl.l_loot);
                return;
            case 'all':
                let text = guiString('allMines');
                if (mapLoot.rl.hasOwnProperty('prg'))
                    text += ' (' + guiString('excludeRepeatables') + ')';
                lootDisplay(mapLoot.total, text, 0, mapLoot.total.l_loot);
                return;
        }

        // Single Location(/floor) Loot
        if (mapLoot.hasOwnProperty(lid)) {
            let loot = mapLoot[lid].total;
            let l_loot = mapLoot[lid].l_loot;

            if (floor != 0) {
                loot = mapLoot[lid][floor];
                if (mapLoot[lid].floors <= 1)
                    floor = 0;
            }
            lootDisplay(loot, mapLoot[lid].name, floor, l_loot);
        } else
            document.getElementById("cmines1").parentElement.style.display = 'none';
    }

    /*
     ** Display Loot
     */
    function lootDisplay(count, name, floor = 0, l_loot = 0) {
        if (floor > 0)
            name = guiString('mineFloor', [name, count.variant]);
        document.getElementById("cmines1Name").innerText = name.toUpperCase();
        document.getElementById("cmines1").parentElement.style.display = '';
        tb1Loot.innerHTML = '';
        tb2Loot.innerHTML = '';

        if (l_loot != 0) {
            cm1Warn.innerHTML = guiString('warnLootLevel', [uidLVL]);
            cm1Warn.style.display = '';
        } else {
            cm1Warn.style.display = 'none';
            cm1Warn.innerHTML = '';
        }

        if (count) {
            let order = self.objectOrder();

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

                        if (loot.name) {
                            html.push('<tr data-oid="', oid, '">');
                            html.push('<td>', self.objectImage(typ, oid, 24), '</td>');
                            html.push('<td title="', ltitle, '">', loot.name, '</td>');
                            if (typeof loot.rnd === 'number') {
                                html.push('<td>', ((loot.rnd > 0) ? self.mineImage('dice.png') : numberWithCommas(loot.qty)), '</td>');
                                if (loot.min != loot.max) {
                                    html.push('<td>', numberWithCommas(loot.min), '</td>');
                                    html.push('<td>', numberWithCommas(loot.avg), '</td>');
                                    html.push('<td>', numberWithCommas(loot.max), '</td>');
                                } else
                                    html.push('<td></td><td>', numberWithCommas(loot.avg), '</td><td></td>');
                            } else {
                                let token = self.tokenName(loot.rnd.rqm);
                                let needs = numberWithCommas(loot.rnd.rqa);
                                if (!token)
                                    token = self.materialName(loot.rnd.rqm);
                                html.push('<td>', numberWithCommas(loot.avg), '</td>');
                                html.push('<td colspan="3">', guiString('tokenNeeded', [needs, token]), '</td>');
                            }
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
            //console.log("No Count!");
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
            html.push('<td>', pxp > 0 ? numberWithCommas(pxp, 2) + '%' : '-', '</td>');
        } else
            html.push('<td colspan="10"></td>');
        return html;
    }

    /*
     ** Count Stats
     */
    function statsSummary(total, loot, prg, rxp, bxp, egy, et, l_loot) {
        return self.lootSummary(statsAdder(total, prg, rxp, bxp, egy, et, l_loot), loot);
    }

    function statsAdder(total, prg, rxp, bxp, egy, et, l_loot) {
        if (!total.hasOwnProperty('prg')) {
            total.prg = prg;
            total.egy = egy;
            total.bxp = bxp;
            total.rxp = rxp;
            total.et = et;
            total.l_loot = l_loot;
        } else {
            total.prg += prg;
            total.egy += egy;
            total.bxp += bxp;
            total.rxp += rxp;
            total.et += et;
            total.l_loot = l_loot;
        }
        return total;
    }

    /*
     ** @Private - Build Filters
     */
    function buildFilters() {

        // Location/Mine List Card
        let card = document.getElementById("cmines0");
        card.addEventListener('toggle', function(e) {
            document.getElementById("cmines1Drop").classList.toggle('drop-down', (e.target.style.display == 'none'));
            document.getElementById("cmines1Name").classList.toggle('drop-spot', (e.target.style.display == 'none'));
        });
        card.dispatchEvent(eventToggle);
        document.getElementById("cmines1Select").addEventListener('change', function(e) {
            lootUpdate(null, e.target.value);
        });

        // Tokens
        let check = document.getElementById("cminesMTOK");
        check.parentElement.style.display = (onlyRepeat ? 'none' : '');
        if (!onlyRepeat) {
            check.checked = showTokens = !!bgp.exPrefs.cminesMTOK;
            check.addEventListener('change', function(e) {
                bgp.exPrefs.cminesMTOK = showTokens = self.setPref(e.target.id, e.target.checked);
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
            bgp.exPrefs.cminesMRID = mapRID = self.setPref(e.target.id, e.target.value);
            showLoot = 'cmine-all';
            mapFilter();
            self.update();
        });

        if ((!bgp.exPrefs.cminesURID) || bgp.exPrefs.cminesURID > max)
            bgp.exPrefs.cminesURID = parseInt(bgp.daGame.daUser.region);
        select2.value = uidRID = bgp.exPrefs.cminesURID;
        select2.disabled = true;

        select2.addEventListener('change', function(e) {
            bgp.exPrefs.cminesURID = uidRID = self.setPref(e.target.id, e.target.value);
            document.getElementById("cminesWrapper").style.display = 'none';
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
            bgp.exPrefs[prefID] = mapFLT = self.setPref(prefID, e.target.value);
            showLoot = 'cmines-all';
            self.update();
        });
    }

    function wikiMineTable() {
        let wikiDiv = getWikiDiv();
        let data = wikiMineData();

        wikiDiv.innerHTML = '<PRE>\n' + data.join('\n') + '\n</PRE>';

        wikiDiv.scrollIntoView(true);
        var range = document.createRange();
        range.selectNode(wikiDiv);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }

    function getWikiDiv() {
        let div = document.getElementById('cminesWikiDiv');
        if (!div) {
            div = document.createElement('div');
            div.setAttribute('id', 'cminesWiki');
            div.setAttribute('class', 'card clicker alignLeft');
            div.innerHTML = '<h1><img src="/img/tools.png" />Wiki data</h1>' +
                '<div id="cminesWikiDiv"></div>';
            document.getElementById('cminesWrapper').appendChild(div);
            div = document.getElementById('cminesWikiDiv');
        }
        return div;
    }

    function wikiMineData() {
        if (mapList.tst) {
            return ["// Test mines"];
        }
        let mines = mapList.mines;
        let mineIdx = Object.keys(mines).sort(mineOrder(mines));
        if (mineIdx.length == 0) {
            return ["// No mines?"];
        }
        console.log(mines, mapLoot);
        unrecognizedMaterials = {};
        let data = [];
        if (parseInt(mines[mineIdx[0]].cdn)) {
            while (mineIdx.length > 0 && parseInt(mines[mineIdx[0]].cdn)) {
                data.push(wikiRepeatable(mines[mineIdx[0]], mapLoot[mineIdx[0]]));
                mineIdx.shift();
            }
        }
        if (mineIdx.length == 0) {
            data.push(wikiUnrecognizedMaterials());
            return data;
        }
        let special = getSpecial(mines, mapLoot, mineIdx);
        let lootTotal = {
            tiles: 0,
            clear: 0,
            energy: 0,
            special: 0,
            material: {}
        };
        data.push(wikiStoryHeader('Story', special));
        let i = 0;
        for (; i < mineIdx.length; i++) {
            if (mines[mineIdx[i]].name.includes('CHALLENGE')) {
                break;
            }
            data.push(wikiStoryContent(mines[mineIdx[i]], mapLoot[mineIdx[i]], special, lootTotal));
        }
        data.push(wikiStoryTotal(lootTotal));

        if (i < mineIdx.length) {
            lootTotal = {
                tiles: 0,
                clear: 0,
                energy: 0,
                special: 0,
                material: {}
            };
            data.push(wikiStoryHeader('Challenge', special));
            for (; i < mineIdx.length; i++) {
                data.push(wikiStoryContent(mines[mineIdx[i]], mapLoot[mineIdx[i]], special, lootTotal));
            }
            data.push(wikiStoryTotal(lootTotal));
        }

        data.push(wikiUnrecognizedMaterials());
        return data;
    }

    function wikiRepeatable(mine, loot) {
        let data = [wikiRepeatableHeader(mine)];
        let floors = mine.floors;
        Object.keys(floors).sort(function(a, b) {
                return floors[a].fid - floors[b].fid;
            })
            .forEach(function(fid) {
                data.push(wikiRepeatableFloor(mine, floors[fid], loot[fid]));
            });
        data.push(wikiRepeatableFooter());
        return data.join('\n');
    }

    function wikiRepeatableHeader(mine) {
        let name = wikiName(mine.name);
        let cooldown = self.duration(mine.cdn, true);
        let gem = numberWithCommas(mine.gem);
        let ret =
            `* '''Repeatable mine''' ${name}. Cooldown: ${cooldown}. ${gem} gems to refresh. Variants:
{| class="wikitable sortable mw-datatable"
|-
! Chance !! Tiles !! Clear Bonus (XP) !! Total Energy !! Average Materials
`;
        return ret;
    }

    function wikiName(name) {
        parts = name.split(' ');
        for (let i = 0; i < parts.length; i++) {
            parts[i] = parts[i][0] + parts[i].substring(1).toLowerCase();
        }
        return parts.join(' ');
    }

    function wikiRepeatableFloor(mine, floor, loot) {
        let chance = numberWithCommas(loot.chance, 0) + '%';
        let tiles = parseInt(floor.prg);
        let clear = parseInt(mine.rxp);
        let energy = loot.energy;
        let materials = wikiMaterials(loot);
        let ret =
            `|-
|style="text-align:right"| ${chance}
|style="text-align:right"| ${tiles}
|style="text-align:right"| ${clear}
|style="text-align:right"| ${energy}
|style="text-align:right"| ${materials}
`;
        return ret;
    }

    function wikiMaterials(loot, special, rare) {
        let data = [];
        let count = 0;
        Object.keys(loot.material).sort(function(a, b) {
            return a - b;
        }).forEach(function(i) {
            let m = loot.material[i];
            if (special && special.id == m.oid) {
                return;
            }
            if (rare && !rareMaterials[m.oid]) {
                return;
            }
            if (!rare && rareMaterials[m.oid]) {
                return;
            }
            let avg = m.avg;
            let digits = 0;
            if (Math.round(avg) != avg) {
                if (avg >= 100) { // show digits to 1%
                    digits = 0;
                } else if (avg >= 10) {
                    digits = 1;
                } else {
                    digits = 2;
                }
            }
            count++;
            let modCount = count % 4;
            if (modCount == 0) {
                data.push('&lt;br&gt;');
            }
            data.push(numberWithCommas(avg, digits) + '&nbsp;' + wikiMaterialImage(i, m.name));
        });

        return data.join(' ');
    }

    let wikiMaterialImages = {
        1: 'Coin(Small).png',
        2: 'Gem(Small).png',
        3: 'Copper(Small).png',
        6: 'Tin(Small).png',
        7: 'Lumber(Small).png',
        8: 'Iron(Small).png',
        9: 'Coal(Small).png',
        11: 'Root(Small).PNG',
        19: 'Mushroom(Small).PNG',
        20: 'Apple(Small).png',
        21: 'Herb(Small).PNG',
        22: 'Stone(Small).png',
        29: 'Berries(Small).PNG',
        30: 'Sugar.PNG',
        31: 'Flour.PNG',
        32: 'Bronze(Small).png',
        33: 'IronOre(Small).png',
        35: 'Fish(Small).PNG',
        47: 'Amethyst(Small).png',
        91: 'Rice.png',
        92: 'Ruby.png',
        94: 'BambooS.png',
        95: 'AncientScrapMetal.png',
        96: 'DragonIngot.png',
        97: 'Shiitake(Small).png',
        98: 'Eel.png',
        99: 'Shale.png',
        123: 'Knight_Helmet.png',
        124: 'Mandrake.png',
        143: 'Topaz.png',
        144: 'Seaweed.png',
        145: 'Atlantean_Marble.png',
        146: 'Lobster.png',
        147: 'Volcanic_Ore.png',
        148: 'Orichalcum.png',
        182: 'Cod.png',
        193: 'cedarwood.png',
        196: 'Octopuss.JPG',
        197: 'Sapphire.png',
        198: 'Adamantine1.png',
        199: 'Adamantinesteel.png',
    }

    let rareMaterials = {
        2: true, // gem
        47: true, // amethyst
        92: true, // ruby
        143: true, // topaz
        197: true, // sapphire
    }

    let unrecognizedMaterials = {}

    function wikiMaterialImage(id, name) {
        let filename;
        if (wikiMaterialImages.hasOwnProperty(id)) {
            filename = wikiMaterialImages[id];
        } else {
            filename = 'id' + id + '-' + name.replace(/\W+/g, '');
            unrecognizedMaterials[id] = name;
        }
        return '[[Image: ' + filename + '|30px]]';
    }

    function wikiRepeatableFooter() {
        return '|-\n|}\n';
    }

    function wikiStoryHeader(type, special) {
        let ret =
            `* '''${type} mines'''
{| class="wikitable sortable mw-datatable"
|-
! Quest Maps !! Tiles !! Clear Bonus (XP) !! Energy Required !! ${special.name} !! Rare Materials !! Average Normal Materials
|-
`;
        return ret;
    }

    function getSpecial(mines, loots, idx) {
        let materials = bgp.daGame.daMaterials;
        let special;
        let specialId;
        for (let i = 0; i < idx.length; i++) {
            let loot = loots[i];
            Object.values(loot.total.material).forEach(function(m) {
                let mat = materials[m.oid];
                if (mat && mat.eid != 0) {
                    if (!special) {
                        special = m.name;
                        specialID = m.oid;
                    }
                    if (special != m.name) {
                        throw "duplicate specials? " + special + "/" + mat.name;
                    }
                }
            });
        }
        if (!special) {
            throw "no special?";
        }
        return {
            id: specialID,
            name: wikiName(special)
        };
    }

    function wikiStoryContent(mine, loot, special, total) {
        let floors = mine.floors;

        let name = wikiName(mine.name);
        let tiles = mine.prg;
        let clear = mine.rxp;
        let energy = loot.energy;
        let specialCount = loot.total.material[special.id].avg;
        let rareMaterials = wikiMaterials(loot.total, special, true);
        let materials = wikiMaterials(loot.total, special, false);

        total.tiles += parseInt(tiles);
        total.clear += parseInt(clear);
        total.energy += energy;
        total.special += specialCount;
        Object.values(loot.total.material).forEach(function(v) {
            if (special.id == v.oid) {
                return;
            }
            if (total.material.hasOwnProperty(v.oid)) {
                total.material[v.oid].avg += v.avg;
            } else {
                total.material[v.oid] = {
                    oid: v.oid,
                    name: v.name,
                    avg: v.avg
                };
            }
        });

        let ret =
            `|-
| ${name}
|style="text-align:right"| ${tiles}
|style="text-align:right"| ${clear}
|style="text-align:right"| ${energy}
|style="text-align:right"| ${specialCount}
|style="text-align:right"| ${rareMaterials}
|style="text-align:right"| ${materials}
`;
        return ret;
    }

    function wikiStoryTotal(total) {
        let rareMaterials = wikiMaterials(total, null, true);
        let materials = wikiMaterials(total, null, false);

        let ret =
            `|-
|-class="sortbottom"
| Total
|style="text-align:right"| ${total.tiles}
|style="text-align:right"| ${total.clear}
|style="text-align:right"| ${total.energy}
|style="text-align:right"| ${total.special}
|style="text-align:right"| ${rareMaterials}
|style="text-align:right"| ${materials}

|-
|}
';
`;
        return ret;
    }

    function wikiUnrecognizedMaterials() {
        let data = [];
        Object.keys(unrecognizedMaterials).sort(function(a, b) {
            return a - b;
        }).forEach(function(i) {
            data.push(i + " " + unrecognizedMaterials[i]);
        });
        if (data.length == 0) {
            return '';
        }
        return '* Unrecognized materials: ' + data.join(', ') + '\n';
    }
    /*
     ** @Public - Calculate Mine Loot
     */
    self.lootMine = function(mine, uidRegion, uidLevel, callBack = null) {
        let mLoot = {
            total: {},
            evalid: 0,
            etiles: 0,
            energy: 0,
            floors: 0,
            l_loot: 0,
            name: mine.name
        };

        if (!mine.hasOwnProperty('floors'))
            return mLoot;

        Object.keys(mine.floors).sort(function(a, b) {
            let ta = mine.floors[a];
            let tb = mine.floors[b];
            return ta.fid - tb.fid;
        }).forEach(function(fid) {
            let floor = mine.floors[fid];
            let lsk = mine.lid + '-' + fid;

            // Chance % of repeatbale floor
            let chance = 100;
            if ((mine.flr > 1) && mine.hasOwnProperty('rot')) {
                if (mine.rot.hasOwnProperty(fid)) {
                    let mchn = parseInt(mine.chn);
                    let fchn = parseInt(mine.rot[fid].chn);

                    try {
                        chance = Math.round((fchn / mchn) * 100);
                    } catch (e) {
                        chance = 0;
                    }
                }
            }

            if (chance != 0) {
                mLoot[fid] = self.lootFloor(fid, floor, uidRegion, uidLevel);
                mLoot[fid].chance = chance;
                mLoot.total = self.lootSummary(mLoot.total, mLoot[fid]);
                mLoot.floors += 1;

                // Level Based Loot
                mLoot.l_loot += mLoot[fid].l_loot;

                // Energy
                if (floor.hasOwnProperty('eTiles')) {
                    let e = energySummary(floor.eTiles, uidRegion, uidLevel);
                    mLoot[fid].evalid = 1;
                    mLoot.energy += (mLoot[fid].energy = e.energy);
                    mLoot.etiles += (mLoot[fid].etiles = e.etiles);
                    mLoot.evalid += 1;
                } else if (localStorage.hasOwnProperty(lsk)) {
                    let e = energySummary(localStorage.getItem(lsk), uidRegion, uidLevel);
                    mLoot[fid].evalid = 1;
                    mLoot.energy += (mLoot[fid].energy = e.energy);
                    mLoot.etiles += (mLoot[fid].etiles = e.etiles);
                    mLoot.evalid += 1;
                }

                if (typeof callBack === 'function')
                    callBack.call(this, mine, mLoot.floors, fid, mLoot[fid]);
            }
        });

        return mLoot;
    }

    self.lootFloor = function(fid, floor, uidRegion, uidLevel) {
        let count = {
            evalid: 0,
            etiles: 0,
            energy: 0,
            l_loot: 0
        };

        Object.keys(floor.loot).forEach(function(aid) {
            let loot = floor.loot[aid];
            let coef = parseFloat(loot.cof);
            let oid = parseInt(loot.oid);
            let rnd = ((typeof loot.rnd !== 'undefined') ? parseInt(loot.rnd) : 0);
            let rid = (loot.hasOwnProperty('rid') ? loot.rid : 0);
            let qty = loot.tle.length;
            let min = parseInt(loot.min) + (coef != 0.0 ? Math.floor((uidLevel * coef) * parseInt(loot.min)) : 0);
            let max = parseInt(loot.max) + (coef != 0.0 ? Math.floor((uidLevel * coef) * parseInt(loot.max)) : 0);
            let avg = Math.ceil((parseInt(min) + parseInt(max)) / 2);

            if (qty && (rid == 0 || rid == uidRegion)) {
                if (coef != 0.0) {
                    count.l_loot += 1;
                }

                // Locked Loot, i.e. need a token to get it
                //
                if (!loot.hasOwnProperty('bid'))
                    loot = lootLocked(floor, loot);
                if (loot.hasOwnProperty('req')) {
                    if (!rnd) {
                        rnd = loot.req;
                        if (bgp.exPrefs.debug) console.info("Locked Loot", self.tokenName(rnd.rqm), qty, loot);
                    } else
                    if (bgp.exPrefs.debug) console.warn("Random Loot is Locked as Well?", loot);
                }

                // Random Loot
                //
                // rnd = Max Loot, e.g. QTY
                // qty = Number of tiles with a chance of dropping the loot
                //
                if ((typeof rnd === 'number') && rnd != 0) {
                    //console.log(self.objectName(loot.typ, oid), min, avg, max, qty, rnd, loot);
                    if ((min == max) && max == avg) {
                        min = max = avg = qty = rnd;
                        rnd = 0;
                    } else if (min == 0 && max > 0) {
                        max = rnd;
                        avg = Math.floor((parseInt(min) + parseInt(max)) / 2);
                        if (loot.typ != 'chest')
                            rnd = 0; // Zero out rnd to sum the random loot to the guranteed loot
                        qty = ((rnd != 0) ? 0 : max);

                    } else
                    if (bgp.exPrefs.debug) console.warn("Unknown Random Loot Calculation, Avg:", avg, loot);
                } else if (typeof rnd === 'number') {
                    min = Math.max(0, min) * qty;
                    max *= qty;
                    avg = Math.floor((parseInt(min) + parseInt(max)) / 2);
                }

                count = self.lootAdder(count, loot.typ, oid, min, max, avg, qty, rnd, (fid + '.' + aid));
            }
        });

        return count;
    }

    self.lootAdder = function(count, typ, oid, min, max, avg, qty, rnd = 0, aid = 0, l_loot = 0) {
        let s_oid = oid;

        if (rnd != 0)
            s_oid += ('-' + aid);

        if (parseInt(min) >= 0) {
            if (!count.hasOwnProperty(typ))
                count[typ] = {};

            if (!count[typ].hasOwnProperty(s_oid)) {
                count[typ][s_oid] = {
                    name: self.objectName(typ, oid),
                    oid: oid,
                    min: min,
                    max: max,
                    avg: avg,
                    qty: qty,
                    rnd: rnd,
                    l_loot: l_loot
                };
            } else {
                count[typ][s_oid].min += min;
                count[typ][s_oid].max += max;
                count[typ][s_oid].avg += avg;
                count[typ][s_oid].qty += qty;
                count[typ][s_oid].l_loot += l_loot;
            }
        } else {
            //if (bgp.exPrefs.debug) console.log(self.objectName(typ, oid), min, avg, max, qty);
        }
        return count;
    }

    self.lootSummary = function(dLoot, sLoot) {
        Object.keys(sLoot).forEach(function(typ) {
            Object.keys(sLoot[typ]).forEach(function(s_oid) {
                let loot = sLoot[typ][s_oid];
                let oid = loot.oid;
                let aid = 0;

                if (loot.rnd)
                    aid = s_oid.split('-')[1];
                dLoot = self.lootAdder(dLoot, typ, oid, loot.min, loot.max, loot.avg, loot.qty, loot.rnd, aid, loot.l_loot);
            });
        });

        return dLoot;
    }

    /*
     ** @Private - Locked Loot
     */
    function lootLocked(floor, loot) {
        loot.bid = 0;

        for (let b = 0; b < floor.bcn.length; b++) {
            let beacon = floor.bcn[b];
            let gotTile = null;

            for (let a = 0; a < beacon.act.length; a++) {
                let action = beacon.act[a];
                if (action.lyr == 'loot') {
                    for (t = 0; t < loot.tle.length; t++) {
                        if ((action.hasOwnProperty('tle')) && typeof action.tle === 'string') {
                            if (action.tle.indexOf(loot.tle[t]) !== -1) {
                                gotTile = loot.tle[t];
                                break;
                            }
                        }
                    }
                    if (gotTile)
                        break;
                }
            }

            if ((gotTile) && loot.bid == 0) {
                if (bgp.exPrefs.debug && beacon.prt.length > 1) console.warn('Multi-Part Beacon!', gotTile, floor, loot, beacon);
                for (let p = 0; p < beacon.prt.length; p++) {
                    let part = beacon.prt[p];
                    if (part.rqa > 0 && part.rqm != 0 && part.typ == 'two-way') {
                        loot.bid = beacon.bid;
                        loot.req = part;
                        break;
                    }
                }
            } else if (gotTile) {
                if (bgp.exPrefs.debug) console.warn('Multi-Beacon Loot!', gotTile, floor, loot);
            }
        }

        return loot;
    }

    /*
     ** @Private - Total Energy Tiles
     */
    function energySummary(tiles, uidRegion, uidLevel) {
        let energy = 0;
        if (typeof tiles === 'string')
            tiles = tiles.split(',');

        tiles.forEach(function(tid) {
            let tile = bgp.daGame.daTiles[tid];

            if (tile) {
                if (tile.hasOwnProperty('ovr')) {
                    tile.ovr.forEach(function(ovr) {
                        if (ovr.region_id == uidRegion)
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

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/