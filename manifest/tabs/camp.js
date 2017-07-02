/*
** DA Friends - camp.js
*/
var guiTabs = (function(self)
{
   var cpt1, cpt2, cpt3, cpt4, cpt5;
   var cpb1, cpb2, cpb3, cpb4, cpb5;
   var cpc1, cpc2, tabID;

   /*
   ** @Private - Initialise the tab
   */
   function onInit(id, cel)
   {
      tabID = id;
      cpc1 = document.getElementById("camp1").parentElement;
      cpt1 = document.getElementById("cpt1");
      cpb1 = document.getElementById("cpb1");
      cpt2 = document.getElementById("cpt2");
      cpb2 = document.getElementById("cpb2");
      cpt3 = document.getElementById("cpt3");
      cpb3 = document.getElementById("cpb3");
      cpt4 = document.getElementById("cpt4");
      cpb4 = document.getElementById("cpb4");
      cpt5 = document.getElementById("cpt5");
      cpb5 = document.getElementById("cpb5");
      cpc2 = document.getElementById("camp2").parentElement;

      if (bgp.exPrefs.debug) console.log(cpc1);
      if (bgp.exPrefs.debug) console.log(bgp.daGame.daConfig);
      if (bgp.exPrefs.debug) console.log(bgp.daGame.daUser);
      //console.log(bgp.daGame.daUser.camp);
   }

   /*
   ** @Private - Update the tab
   */
   function onUpdate(id, reason)
   {
      if (reason == 'active')
         return true;

      if ((!bgp.daGame.daUser) || !bgp.daGame.daUser.camp || !bgp.daGame.daConfig) {
         guiStatus('errorData', 'ERROR', 'error');
         return false;
      }

      var renRows = 0;
      var now = new Date() / 1000;
      var tzo = parseInt(bgp.daGame.daUser.dr_tz_offset)
      var tof = parseInt(bgp.daGame.daUser.dr_time) - parseInt(bgp.daGame.daUser.time);

      console.log(bgp.daGame.daUser.dr_time - bgp.daGame.daUser.time);

      // Children
      if (bgp.exPrefs.debug) console.log(bgp.daGame.daUser.children);
      cpb1.innerHTML = '';
      if (typeof bgp.daGame.daUser.children === 'object' && bgp.daGame.daUser.children !== null) {
        Object.keys(bgp.daGame.daUser.children).sort(function(a, b) {
            var o1 = bgp.daGame.daUser.children[a];
            var o2 = bgp.daGame.daUser.children[b];

            if ((o1.charges - o2.charges) != 0)
                return o1.charges - o2.charges;
            return o1.expires - o2.expires;
        }).forEach(function(oid, i, a) {
            var o = bgp.daGame.daUser.children[oid];
            var row = cpb1.insertRow();
            var cell1 = row.insertCell();
            var cell2 = row.insertCell();
            var cell3 = row.insertCell();
            var cell4 = row.insertCell();
            var ct = parseInt(o.charged) + tof;
            var rt = parseInt(ct) + parseInt(bgp.daGame.daConfig.child_recharge);

            // charged & expires dates seem to be local (user) time and not GMT?
            cell1.innerHTML = o.charges;
            cell2.innerHTML = o.charges > 0 ? unixDate(o.charged, true) : '';
            cell3.innerHTML = o.charges > 0 ? unixDate(rt, true) : '';
            cell4.innerHTML = o.charges > 0 ? unixDate(o.expires, true) : '';

            var cd1 = countDown(o.charged * 1000, cell3, 60*60, 60*30, true);

            console.log(oid, o);
        });
      }
      cpt1.style.display = (cpb1.rows.length == 0) ? 'none' : '';
      cpb1.style.display = (cpb1.rows.length == 0) ? 'none' : '';
      renRows += cpb1.rows.length;

      // Windmills
      if (bgp.exPrefs.debug) console.log(bgp.daGame.daUser.camp.windmills);
      cpb2.innerHTML = '';
      cpt2.style.display = (cpb2.rows.length == 0) ? 'none' : '';
      cpb2.style.display = (cpb2.rows.length == 0) ? 'none' : '';
      renRows += cpb2.rows.length;

      // Caravans
      if (bgp.exPrefs.debug) console.log(bgp.daGame.daUser.caravans);
      cpb3.innerHTML = '';
      cpt3.style.display = (cpb3.rows.length == 0) ? 'none' : '';
      cpb3.style.display = (cpb3.rows.length == 0) ? 'none' : '';
      renRows += cpb3.rows.length;

      // Kitchen Pots
      if (bgp.exPrefs.debug) console.log(bgp.daGame.daUser.pots);
      cpb4.innerHTML = '';
      cpt4.style.display = (cpb4.rows.length == 0) ? 'none' : '';
      cpb4.style.display = (cpb4.rows.length == 0) ? 'none' : '';
      renRows += cpb4.rows.length;

      // Foundry Anvils
      if (bgp.exPrefs.debug) console.log(bgp.daGame.daUser.anvils);
      cpb5.innerHTML = '';
      cpt5.style.display = (cpb5.rows.length == 0) ? 'none' : '';
      cpb5.style.display = (cpb5.rows.length == 0) ? 'none' : '';
      renRows += cpb5.rows.length;

      // No Renewables, hide the card - Should never happen!
      cpc1.style.display = (renRows) ? '' : 'none';

      /****
      Object.keys(bgp.daGame.daUser.camp.buildings).sort(function(a, b) {
         var b1 = bgp.daGame.daUser.camp.buildings[a];
         var b2 = bgp.daGame.daUser.camp.buildings[b];

         if ((b1.line_id - b2.line_id) != 0)
            return b1.line_id - b2.line_id;
         return b1.slot - b2.slot;
      }).forEach(function(bid, i, a) {
         var building = bgp.daGame.daUser.camp.buildings[bid];
         console.log(bid, building.line_id, building.slot);
      });
      ****/

      // For now, hide the equipment
      cpc2.style.display = (localStorage.installType == 'development') ? '' : 'none';

      return true;
   }

   /*
   ** Define this tab's details
   */
   self.tabs.Camp = {
      title:      'Camp',
      image:      'camp.png',
      order:      20,
      html:       true,
      onInit:     onInit,
      onUpdate:   onUpdate
   };

	return self;
}(guiTabs || {}));
/*
** End
*******************************************************************************/