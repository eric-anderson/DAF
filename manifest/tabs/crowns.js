/*
** DA Friends - tab_crowns.js
*/
var guiTabs = (function(self)
{
   var daCrowns =
   [
       {
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
         sell_price: 7500,
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

   var ccTable, tbody, thead, theadSaved, tabID;

   /*
   ** @Private - Initialise the tab
   */
   function onInit(id)
   {
      tabID = id;
      ccTable = document.getElementById("ccTable");
      tbody = ccTable.getElementsByTagName("tbody");
      thead = ccTable.getElementsByTagName("thead");
      guiText_i18n(ccTable);
      theadSaved = thead[0].innerHTML;
      var f = document.getElementsByName('cFilter');

      for (var i = 0; i < f.length; i++) {
         if (f[i].getAttribute('value') == bgp.exPrefs.cFilter) {
            f[i].setAttribute('checked', 'checked');
         }else
            f[i].removeAttribute('checked');

         f[i].addEventListener('click', function(e) {
            var cFilter = e.target.getAttribute('value');
            if (bgp.exPrefs.cFilter != cFilter) {
               bgp.exPrefs.cFilter = cFilter;
               filterCrowns(cFilter);
            }
         });
      }
   }

   /*
   ** @Private - Update the tab
   */
   function onUpdate(id, reason)
   {
      if (reason == 'active')
         return true;

      var tot_crowns = 0;
      var tot_coin = 0;
      var tot_xp = 0;
      var tot_use = 0;
      var exp = parseInt(bgp.daGame.daUser.exp);
      var level = parseInt(bgp.daGame.daUser.player.level);
      thead[0].innerHTML = theadSaved;
      tbody[0].innerHTML = '<tr></tr><tr></tr>';

      for (var k in daCrowns)
      {
         if (!daCrowns.hasOwnProperty(k))
            continue;

         var row = ccTable.insertRow(2);
         var cell0 = row.insertCell(0);
         var cell1 = row.insertCell(1);
         var cell2 = row.insertCell(2);
         var cell3 = row.insertCell(3);
         var cell4 = row.insertCell(4);
         var cell5 = row.insertCell(5);
         var cell6 = row.insertCell(6);
         var cell7 = row.insertCell(7);
         var cell8 = row.insertCell(8);
         var cell9 = row.insertCell(9);
         var cell10 = row.insertCell(10);
         var cell11 = row.insertCell(11);
         var did = daCrowns[k].decoration_id;
         row.id = did + '_Crown';
         row.name = did;

         var price = parseInt(daCrowns[k].sell_price);
         var mat = parseInt(daCrowns[k].material_cost);
         var xp = parseInt(daCrowns[k].xp);
         var inv = checkInventory(daCrowns[k].material_id);
         var qty, nxt, pxp, coins;
         qty = Math.floor(inv / mat);
         use = qty;
         if (qty == 0)
            row.classList.add('no-crowns');

         var name = bgp.daGame.string(daCrowns[k].name_loc);
         if (name == daCrowns[k].name_loc)
            name = daCrowns[k].name;
         cell0.innerHTML = '<img src="' + daCrowns[k].img + '" title="' + name + '"/>';
         cell1.innerHTML = name;
         cell2.innerHTML = daCrowns[k].level;
         cell3.innerHTML = numberWithCommas(mat);
         cell4.innerHTML = numberWithCommas(xp);
         cell5.innerHTML = numberWithCommas(price);
         cell6.innerHTML = numberWithCommas(inv);

         nxt = ((inv - (mat * use)) / mat) * 100;
         pxp = xp * use;
         coins = price * use;

         cell7.innerHTML = nxt.toFixed(2) + '%';
         cell8.id = did + 'qty';
         cell8.innerHTML = numberWithCommas(qty);
         cell8.setAttribute("sorttable_customkey", qty);

        //level = 151;  /** For Theme Testing **/

         if (level >= parseInt(daCrowns[k].level))
         {
            var e = document.createElement("INPUT");
            e.setAttribute("type", "number");
            e.defaultValue = use;
            e.step = 1;
            e.min = 0;
            e.max = 999;
            e.value = use;
            e.id = did;
            e.name = k;
            e.oninput = function(e)
            {
                var use = e.target.valueAsNumber;
                var did = e.target.id;
                var k = e.target.name;
                var pxp, coins;
                var qty = parseInt(document.getElementById(did + 'qty').getAttribute("sorttable_customkey"));

                e.target.max = (bgp.exPrefs.capCrowns) ? qty : 999;

                if (!isNaN(use)) {
                    if (use < e.target.min)   use = e.target.min;
                    if (use > e.target.max)   use = e.target.max;
                }else
                    use = 0;    //e.target.defaultValue
                e.target.value = use;
                pxp = parseInt(daCrowns[k].xp) * use;
                coins = parseInt(daCrowns[k].sell_price) * use;
                document.getElementById(did + 'use').setAttribute("sorttable_customkey", use);
                document.getElementById(did + 'pxp').innerHTML = numberWithCommas(pxp);
                document.getElementById(did + 'pxp').setAttribute("sorttable_customkey", pxp);
                document.getElementById(did + 'coins').innerHTML = numberWithCommas(coins);
                document.getElementById(did + 'coins').setAttribute("sorttable_customkey", coins);
                updateCrowns();
            };

            cell9.appendChild(e);
            cell9.id = did + 'use';
            cell9.setAttribute("sorttable_customkey", use);

            cell10.id = did + 'pxp';
            cell10.innerHTML = numberWithCommas(pxp);
            cell10.setAttribute("sorttable_customkey", pxp);
            cell11.id = did + 'coins';
            cell11.innerHTML = numberWithCommas(coins);
            cell11.setAttribute("sorttable_customkey", coins);

            tot_xp = tot_xp + pxp;
            tot_coin = tot_coin + coins;
            tot_use = tot_use + use;
            tot_crowns = tot_crowns + qty;
         }else {
            row.classList.add('high-level');
            cell9.innerHTML = 0;
            cell10.innerHTML = '-';
            cell11.innerHTML = '-';
         }
      }

      sorttable.makeSortable(ccTable);
      predictCrowns(tot_crowns, tot_use, tot_xp, tot_coin, true);
      var el = ccTable.getElementsByTagName("th")[8];
      sorttable.innerSortFunction.apply(el, []);

      return true;
   }

   /*
   ** @Private - Filter Crowns
   */
   function filterCrowns(cFilter)
   {
      if (cFilter == 'QTY') {
         CCSStylesheetRuleStyle('styles.css', "tr.high-level td", "display", "none");
         CCSStylesheetRuleStyle('styles.css', "tr.no-crowns td", "display", "none");
      }else {
         cFilter = 'ALL';
         CCSStylesheetRuleStyle('styles.css', "tr.high-level td", "display", "");
         CCSStylesheetRuleStyle('styles.css', "tr.no-crowns td", "display", "");
      }
      self.setPref("cFilter", cFilter);
   }

   /*
   ** @Private - Update Crowns
   */
   function updateCrowns()
   {
       //var ccTable = document.getElementById("ccTable");
       var tot_crowns = 0;
       var tot_coin = 0;
       var tot_xp = 0;
       var tot_use = 0;

       for (var r = 0, did, row; row = ccTable.rows[r]; r++) {
         if ((did = row.name) != 'undefined' && row.id == did + '_Crown'
         && !row.classList.contains('high-level'))
         {
            tot_crowns += parseInt(document.getElementById(did + 'qty').getAttribute("sorttable_customkey"));
            tot_use += parseInt(document.getElementById(did + 'use').getAttribute("sorttable_customkey"));
            tot_xp += parseInt(document.getElementById(did + 'pxp').getAttribute("sorttable_customkey"));
            tot_coin += parseInt(document.getElementById(did + 'coins').getAttribute("sorttable_customkey"));
         }
       }
       predictCrowns(tot_crowns, tot_use, tot_xp, tot_coin);
   }

   /*
   ** @Private - Update Crown Predictions
   */
   function predictCrowns(tot_crowns, tot_use, tot_xp, tot_coin, stats = false)
   {
      var exp = parseInt(bgp.daGame.daUser.exp);
      var level = parseInt(bgp.daGame.daUser.player.level);

      document.getElementById("level").innerHTML = level;
      document.getElementById("exp").innerHTML = numberWithCommas(exp)
           + ' / ' + numberWithCommas(bgp.daGame.daLevels[level].xp);

      document.getElementById("tot_use").innerHTML = numberWithCommas(tot_use);
      document.getElementById("tot_exp").innerHTML = numberWithCommas(tot_xp);
      document.getElementById("tot_coin").innerHTML = numberWithCommas(tot_coin);
      document.getElementById("tot_crowns").innerHTML = numberWithCommas(tot_crowns);

      var next_level = level;
      var next_exp = (exp + tot_xp);
      var boost = 0, pNext = 0, done = false, max;

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
                     pNext = px.toFixed(2);
                     max = a.length - 1;
                     done = true;
                  }
               }
            }else
               max = a.length - 1;
         }
      });

      document.getElementById("next_level").innerHTML = next_level + ' / ' + max;
      document.getElementById("next_exp").innerHTML = numberWithCommas(next_exp)
         + ' / ' + numberWithCommas(bgp.daGame.daLevels[next_level].xp);
      document.getElementById("next_level%").innerHTML
         = ((done) ? (pNext + '% -> ' + (next_level + 1)) : '');
      document.getElementById("boost").innerHTML = numberWithCommas(boost);

      if (stats) {
         document.getElementById("ccStats").innerHTML = guiString('ccStats', [
           numberWithCommas(tot_crowns),
           numberWithCommas(tot_xp),
           numberWithCommas(tot_coin),
           numberWithCommas(boost)
         ]);
      }
   }

   /*
   ** @Private - Check Game Material Inventory
   */
   function checkInventory(mid)
   {
      if (bgp.daGame.daUser.materials.hasOwnProperty(mid))
         return parseInt(bgp.daGame.daUser.materials[mid]);
      return 0;
   }

   /*
   ** Define this tab's details
   */
   self.tabs.Crowns = {
      title: 'Crowns',
      image: 'crowns.png',
      order: 30,
      html:       true,
      onInit:     onInit,
      onUpdate:   onUpdate
   };
	return self;
}(guiTabs || {}));
/*
** End
*******************************************************************************/