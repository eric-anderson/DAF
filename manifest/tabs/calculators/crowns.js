/*
 ** DA Friends Calculator - crowns.js
 */
var guiTabs = (function(self) {
    var daCrowns = [{
            decoration_id: 539,
            name: "Stony Crown",
            name_loc: "DENA154",
            xp: 295000,
            sell_price: 2950,
            material_id: 22,
            material_cost: 15000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/539.png"
        },
        {
            decoration_id: 540,
            name: "Apple Crown",
            name_loc: "DENA360",
            xp: 95000,
            sell_price: 950,
            material_id: 20,
            material_cost: 10000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/540.png"
        },
        {
            decoration_id: 553,
            name: "Berry Crown",
            name_loc: "DENA362",
            xp: 92000,
            sell_price: 920,
            material_id: 29,
            material_cost: 10000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/553.png"
        },
        {
            decoration_id: 552,
            name: "Wooden Crown",
            name_loc: "DENA361",
            xp: 255000,
            sell_price: 2550,
            material_id: 7,
            material_cost: 15000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/552.png"
        },
        {
            decoration_id: 559,
            name: "Copper Crown",
            name_loc: "DENA368",
            xp: 287000,
            sell_price: 2870,
            material_id: 3,
            material_cost: 8000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/559.png"
        },
        {
            decoration_id: 560,
            name: "Tin Crown",
            name_loc: "DENA369",
            xp: 405000,
            sell_price: 4050,
            material_id: 6,
            material_cost: 5000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/560.png"
        },
        {
            decoration_id: 563,
            name: "Golden Crown",
            name_loc: "DENA371",
            xp: 1000000,
            sell_price: 10000,
            material_id: 1,
            material_cost: 1000000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/563.png"
        },
        {
            decoration_id: 564,
            name: "Iron Crown",
            name_loc: "DENA372",
            xp: 1721500,
            sell_price: 17215,
            material_id: 8,
            material_cost: 1200,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/564.png"
        },
        {
            decoration_id: 570,
            name: "Vegetable Root Crown",
            name_loc: "DENA377",
            xp: 153600,
            sell_price: 1536,
            material_id: 11,
            material_cost: 5000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/570.png"
        },
        {
            decoration_id: 571,
            name: "Mushroom Crown",
            name_loc: "DENA376",
            xp: 86000,
            sell_price: 860,
            material_id: 19,
            material_cost: 5000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/571.png"
        },
        {
            decoration_id: 572,
            name: "Coal Crown",
            name_loc: "DENA378",
            xp: 358000,
            sell_price: 3580,
            material_id: 9,
            material_cost: 5000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/572.png"
        },
        {
            decoration_id: 573,
            name: "Iron Ore Crown",
            name_loc: "DENA379",
            xp: 550000,
            sell_price: 5500,
            material_id: 33,
            material_cost: 5000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/573.png"
        },
        {
            decoration_id: 577,
            name: "Herb Crown",
            name_loc: "DENA381",
            xp: 142800,
            sell_price: 1428,
            material_id: 21,
            material_cost: 5000,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/577.png"
        },
        {
            decoration_id: 578,
            name: "Amethyst Crown",
            name_loc: "DENA382",
            xp: 2375000,
            sell_price: 23750,
            material_id: 47,
            material_cost: 300,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/578.png"
        },
        {
            decoration_id: 579,
            name: "Bronze Crown",
            name_loc: "DENA383",
            xp: 1485000,
            sell_price: 14850,
            material_id: 32,
            material_cost: 1500,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/579.png"
        },
        {
            decoration_id: 654,
            name: "Fish Crown",
            name_loc: "DENA420",
            xp: 75000,
            sell_price: 750,
            material_id: 35,
            material_cost: 500,
            cart_id: 0,
            level: 110,
            img: "/img/crowns/654.png"
        },

        // Chinese Materials
        {
            decoration_id: 600,
            name: "Ruby Crown",
            name_loc: "DENA389",
            xp: 10000000,
            sell_price: 100000,
            material_id: 92,
            material_cost: 200,
            cart_id: 0,
            level: 150,
            img: "/img/crowns/600.png"
        },
        {
            decoration_id: 616,
            name: "Bamboo Crown",
            name_loc: "DENA399",
            xp: 838000,
            sell_price: 8380,
            material_id: 94,
            material_cost: 5000,
            cart_id: 0,
            level: 150,
            img: "/img/crowns/616.png"
        },
        {
            decoration_id: 617,
            name: "Scrap Metal Crown",
            name_loc: "DENA400",
            xp: 1275000,
            sell_price: 12750,
            material_id: 95,
            material_cost: 1300,
            cart_id: 0,
            level: 150,
            img: "/img/crowns/617.png"
        },
        {
            decoration_id: 630,
            name: "Dragon Ingot Crown",
            name_loc: "DENA407",
            xp: 3210000,
            sell_price: 32100,
            material_id: 96,
            material_cost: 250,
            cart_id: 0,
            level: 150,
            img: "/img/crowns/630.png"
        },
        {
            decoration_id: 631,
            name: "Rice Crown",
            name_loc: "DENA408",
            xp: 582000,
            sell_price: 5820,
            material_id: 91,
            material_cost: 10000,
            cart_id: 0,
            level: 150,
            img: "/img/crowns/631.png"
        },
        {
            decoration_id: 644,
            name: "Shale Crown",
            name_loc: "DENA413",
            xp: 890000,
            sell_price: 8900,
            material_id: 99,
            material_cost: 1500,
            cart_id: 0,
            level: 150,
            img: "/img/crowns/644.png"
        },
        {
            decoration_id: 645,
            name: "Shiitake Crown",
            name_loc: "DENA414",
            xp: 245700,
            sell_price: 2457,
            material_id: 97,
            material_cost: 500,
            cart_id: 0,
            level: 150,
            img: "/img/crowns/645.png"
        },
        {
            decoration_id: 655,
            name: "Eel Crown",
            name_loc: "DENA421",
            xp: 475000,
            sell_price: 4750,
            material_id: 98,
            material_cost: 500,
            cart_id: 0,
            level: 150,
            img: "/img/crowns/655.png"
        },

        // Atlantean Materials
        {
            decoration_id: 667,
            img: "/img/crowns/667.png",
            name: "Orichalum Crown",
            name_loc: "DENA424",
            xp: 12500000,
            sell_price: 50000,
            material_id: 148,
            material_cost: 500,
            cart_id: 0,
            level: 200
        },
        {
            decoration_id: 668,
            img: "/img/crowns/668.png",
            name: "Topaz Crown",
            name_loc: "DENA425",
            xp: 30000000,
            sell_price: 125000,
            material_id: 143,
            material_cost: 200,
            cart_id: 0,
            level: 200
        },
        {
            decoration_id: 669,
            img: "/img/crowns/669.png",
            name: "Black Pearl Crown",
            name_loc: "DENA426",
            xp: 3000000,
            sell_price: 110000,
            material_id: 149,
            material_cost: 100,
            cart_id: 0,
            level: 200
        },
        {
            decoration_id: 670,
            img: "/img/crowns/670.png",
            name: "Marble Crown",
            name_loc: "DENA427",
            xp: 1500000,
            sell_price: 15000,
            material_id: 145,
            material_cost: 1250,
            cart_id: 0,
            level: 200
        },
        {
            decoration_id: 671,
            img: "/img/crowns/671.png",
            name: "Volcanic Ore Crown",
            name_loc: "DENA428",
            xp: 2500000,
            sell_price: 15000,
            material_id: 147,
            material_cost: 1250,
            cart_id: 0,
            level: 200
        },
        {
            decoration_id: 693,
            img: "/img/crowns/693.png",
            name: "Lobster Crown",
            name_loc: "DENA438",
            xp: 575000,
            sell_price: 5750,
            material_id: 146,
            material_cost: 500,
            cart_id: 0,
            level: 200
        },
        {
            decoration_id: 694,
            img: "/img/crowns/694.png",
            name: "Seaweed Crown",
            name_loc: "DENA439",
            xp: 1000000,
            sell_price: 10000,
            material_id: 144,
            material_cost: 2500,
            cart_id: 0,
            level: 200
        },

        // Greek Materials
    ];

    var ccTable, tbody, tgrid, tabID;

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id) {
        tabID = id;
        ccTable = document.getElementById("ccTable");
        tbody = document.getElementById("cctb1");
        tgrid = document.getElementById("cctb2");
        igrid = document.getElementById("crownGrid");

        guiText_i18n(ccTable);

        if (igrid) {
            igrid.checked = bgp.exPrefs.crownGrid;
            igrid.addEventListener('click', function(e) {
                if (e.target.checked != bgp.exPrefs.crownGrid) {
                    self.setPref("crownGrid", e.target.checked);
                    self.update();
                }
            });
        }

        Array.from(document.getElementsByName('cFilter')).forEach(input => {
            input.checked = input.value == bgp.exPrefs.cFilter;
            input.addEventListener('click', function(e) {
                var cFilter = e.target.getAttribute('value');
                if ((!e.target.disabled) && bgp.exPrefs.cFilter != cFilter) {
                    filterCrowns(cFilter, ccTable);
                }
            });
        })

        sorttable.makeSortable(ccTable);
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        if (reason == 'active')
            return true;

        if ((!bgp.daGame.daUser) || !bgp.daGame.daUser.player || !bgp.daGame.daLevels) {
            guiStatus('errorData', 'ERROR', 'error');
            return false;
        }

        var mgc = 9,
            cx = 0,
            ry = null;
        var tot_crowns = 0;
        var tot_coin = 0;
        var tot_xp = 0;
        var tot_use = 0;
        var exp = parseInt(bgp.daGame.daUser.exp);
        var level = parseInt(bgp.daGame.daUser.level);

        tgrid.innerHTML = '';
        tbody.innerHTML = '';

        document.getElementById("ccTotals").style.display = bgp.exPrefs.crownGrid ? 'none' : '';
        document.getElementById("ccFilter").style.display = bgp.exPrefs.crownGrid ? 'none' : '';
        Array.from(ccTable.tFoot.rows).forEach(row => {
            row.cells[0].colSpan = bgp.exPrefs.crownGrid ? 5 : 8;
        });
        Array.from(ccTable.tHead.rows[0].cells).forEach(cell => {
            if (cell.cellIndex == 0) cell.colSpan = bgp.exPrefs.crownGrid ? mgc : 1;
            else cell.style.display = bgp.exPrefs.crownGrid ? 'none' : '';
        });

        //level = 151;  /** For Theme Testing Etc. **/

        Object.keys(daCrowns).sort(function(a, b) {
            var s = daCrowns[a].level - daCrowns[b].level;
            if (s != 0)
                return s;
            s = daCrowns[a].xp - daCrowns[b].xp;
            return s;
        }).forEach(function(k, i, a) {
            var name = bgp.daGame.string(daCrowns[k].name_loc);
            if (name == daCrowns[k].name_loc)
                name = daCrowns[k].name;
            var cImg = '<img src="' + daCrowns[k].img + '" title="' + name + '"/>';
            var did = daCrowns[k].decoration_id;
            var price = parseInt(daCrowns[k].sell_price);
            var mat = parseInt(daCrowns[k].material_cost);
            var xp = parseInt(daCrowns[k].xp);
            var inv, qty, nxt, pxp, coins;

            daCrowns[k].inv = inv = self.materialInventory(daCrowns[k].material_id);
            daCrowns[k].qty = qty = Math.floor(inv / mat);

            if ((self.tabs['Calculators'].time) && daCrowns[k].hasOwnProperty('use')) {
                if ((use = daCrowns[k].use) > 999)
                    use = 999;
                if ((bgp.exPrefs.capCrowns) && use > qty)
                    use = qty;
                daCrowns[k].use = use;
            } else
                daCrowns[k].use = use = qty;

            daCrowns[k].inv = nxt = ((inv - (mat * use)) / mat) * 100;
            daCrowns[k].pxp = pxp = xp * use;
            daCrowns[k].coins = coins = price * use;

            // Grid
            if (bgp.exPrefs.crownGrid) {
                if (level >= parseInt(daCrowns[k].level)) {
                    if ((!ry) || cx == mgc) {
                        ry = tgrid.insertRow();
                        cx = 0;
                    }
                    var cell = ry.insertCell();
                    var e = document.createElement("INPUT");
                    cell.id = did + '_Crown';
                    cell.innerHTML = cImg;
                    inputCrown(k, did, name, cell);

                    cx++;
                    tot_xp = tot_xp + pxp;
                    tot_use = tot_use + use;
                    tot_coin = tot_coin + coins;
                    tot_crowns = tot_crowns + qty;
                }
            } else {
                var row = tbody.insertRow();
                var cell0 = row.insertCell();
                var cell1 = row.insertCell();
                var cell2 = row.insertCell();
                var cell3 = row.insertCell();
                var cell4 = row.insertCell();
                var cell5 = row.insertCell();
                var cell6 = row.insertCell();
                var cell7 = row.insertCell();
                var cell8 = row.insertCell();
                var cell9 = row.insertCell();
                var cell10 = row.insertCell();
                var cell11 = row.insertCell();

                if (qty == 0)
                    row.classList.add('no-crowns');

                cell0.innerHTML = cImg;
                cell1.innerText = name;
                cell2.innerText = daCrowns[k].level;
                cell3.innerText = numberWithCommas(mat);
                cell4.innerText = numberWithCommas(xp);
                cell5.innerText = numberWithCommas(price);
                cell6.innerText = numberWithCommas(inv);
                cell7.innerText = numberWithCommas(nxt, 2) + '%';
                cell8.innerText = numberWithCommas(qty);
                cell8.setAttribute('sorttable_customkey', numberWithCommas(qty + nxt / 100));

                if (level >= parseInt(daCrowns[k].level)) {
                    inputCrown(k, did, name, cell9);
                    cell10.innerText = numberWithCommas(pxp);
                    cell11.innerText = numberWithCommas(coins);

                    tot_xp = tot_xp + pxp;
                    tot_coin = tot_coin + coins;
                    tot_use = tot_use + use;
                    tot_crowns = tot_crowns + qty;
                } else {
                    row.classList.add('high-level');
                    cell9.innerText = 0;
                    cell10.innerText = '-';
                    cell11.innerText = '-';
                }
            }
        });

        predictCrowns(tot_crowns, tot_use, tot_xp, tot_coin, true);
        if (bgp.exPrefs.crownGrid) {
            while ((ry) && cx < mgc) {
                var cell0 = ry.insertCell();
                cx++;
            }
        } else {
            filterCrowns(bgp.exPrefs.cFilter, ccTable);
            sorttable.applySort(ccTable);
        }

        return true;
    }

    /*
     ** @Private - Input (Qty) Crown
     */
    function inputCrown(key, did, name, parent) {
        var input = document.createElement("INPUT");
        input.setAttribute("type", "number");
        input.id = did;
        input.name = key;
        input.title = name + ' (' + daCrowns[key].qty + ')';
        input.defaultValue = daCrowns[key].qty;
        input.value = daCrowns[key].use;
        input.step = 1;
        input.min = 0;
        input.max = 999;
        input.oninput = function(e) {
            var use = e.target.valueAsNumber;
            var key = e.target.name;
            e.target.max = (bgp.exPrefs.capCrowns) ? daCrowns[key].qty : 999;

            if (!isNaN(use)) {
                if (use < e.target.min) use = e.target.min;
                if (use > e.target.max) use = e.target.max;
            } else
                use = 0;

            e.target.parentElement.setAttribute("sorttable_customkey", use);
            e.target.value = daCrowns[key].use = use;
            daCrowns[key].pxp = parseInt(daCrowns[key].xp) * use;
            daCrowns[key].coins = parseInt(daCrowns[key].sell_price) * use;
            var cell = e.target.parentNode;
            if (!cell.hasAttribute('id')) {
                cell = cell.nextSibling;
                cell.innerText = numberWithCommas(daCrowns[key].pxp);
                cell = cell.nextSibling;
                cell.innerText = numberWithCommas(daCrowns[key].coins);
            }
            updateCrowns();
        };
        parent.setAttribute("sorttable_customkey", daCrowns[key].use);
        parent.appendChild(input);
        return input;
    }

    /*
     ** @Private - Filter Crowns
     */
    function filterCrowns(cFilter, table) {
        table.querySelectorAll('tr.no-crowns').forEach(function(e) {
            e.style.display = (cFilter == 'QTY') ? 'none' : '';
        });

        table.querySelectorAll('tr.high-level').forEach(function(e) {
            e.style.display = (cFilter == 'QTY') ? 'none' : '';
        });

        self.setPref("cFilter", cFilter);
    }

    /*
     ** @Private - Update Crowns
     */
    function updateCrowns() {
        var tot_crowns = 0,
            tot_use = 0,
            tot_xp = 0,
            tot_coin = 0;

        daCrowns.forEach(function(crown) {
            tot_crowns += parseInt(crown.qty);
            tot_use += parseInt(crown.use);
            tot_xp += parseInt(crown.pxp);
            tot_coin += parseInt(crown.coins);
        });

        predictCrowns(tot_crowns, tot_use, tot_xp, tot_coin);
    }

    /*
     ** @Private - Update Crown Predictions
     */
    function predictCrowns(tot_crowns, tot_use, tot_xp, tot_coin, stats = false) {
        var exp = parseInt(bgp.daGame.daUser.exp);
        var level = parseInt(bgp.daGame.daUser.level);

        document.getElementById("tot_use").innerText = numberWithCommas(tot_use);
        document.getElementById("tot_exp").innerText = numberWithCommas(tot_xp);
        document.getElementById("tot_coin").innerText = numberWithCommas(tot_coin);
        document.getElementById("tot_crowns").innerText = numberWithCommas(tot_crowns);

        var next_level = level;
        var next_exp = (exp + tot_xp);
        var boost = 0,
            pNext = 0,
            done = false,
            max;

        Object.keys(bgp.daGame.daLevels).sort(function(a, b) {
            return bgp.daGame.daLevels[a].level - bgp.daGame.daLevels[b].level;
        }).forEach(function(v, l, a) {
            if (l >= level) {
                var x = parseInt(bgp.daGame.daLevels[l].xp);

                if (next_level + 1 < a.length) {
                    if (!done) {
                        if (next_exp >= x) {
                            next_exp -= x;
                            next_level += 1;
                            boost += parseInt(bgp.daGame.daLevels[next_level].boost);
                        }

                        if (next_exp < x) {
                            var px = ((next_exp / x) * 100);
                            pNext = px;
                            max = a.length - 1;
                            done = true;
                        }
                    }
                } else
                    max = a.length - 1;
            }
        });

        document.getElementById("next_level").innerText = done ? next_level : guiString('Maximum');
        document.getElementById("next_exp").innerText = numberWithCommas(next_exp);
        document.getElementById("next_exp2").innerText = done ? numberWithCommas(bgp.daGame.daLevels[next_level].xp) : '';
        document.getElementById("next_level%").innerText = done ? numberWithCommas(pNext, 2) + '%' : '';
        document.getElementById("next_level%2").innerText = done ? next_level + 1 : '';
        document.getElementById("boost").innerText = numberWithCommas(boost);

        if (stats) {
            document.getElementById("exp").innerText = numberWithCommas(exp);
            document.getElementById("exp2").innerText = numberWithCommas(bgp.daGame.daLevels[level].xp);
            document.getElementById("level").innerText = level;
            document.getElementById("level2").innerText = next_level;
            document.getElementById("next_level2").innerText = max;
            console.log(tot_crowns, tot_xp, tot_coin, boost);
            document.getElementById("ccStats").innerText = guiString('ccStats', [
                numberWithCommas(tot_crowns),
                numberWithCommas(tot_xp),
                numberWithCommas(tot_coin),
                numberWithCommas(boost)
            ]);
        }
    }

    /*
     ** Define this tab's details
     */
    self.tabs.Calculators.menu.crowns = {
        title: 'Crowns',
        image: 'crowns.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate
    };
    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/