/*
** DA Friends - events.js
*/
var guiTabs = (function(self)
{
   var wikiPage = {
      78:   'Events#Scout_Camp',
      77:   'Events#.5BSPECIAL_WEEK.5D_Summer_Postcards',
      76:   'Events#Galactic_Wars',
      75:   'Events#Diggy.27s_5th_Birthday',
      74:   'Events#Easter_2017',
      /*
      73:   '',
      72:   '',
      71:   '',
      70:   '',
      69:   '',
      68:   '',
      */
      24:   'Events_(2014)#Detective_Stories_II',
   };

   var bonusImg = '<img src="/img/gift.png" width="16" height="16"/>';
   var storyImg = '<img src="/img/story.png" width="16" height="16"/>';
   var mineImg = '<img src="/img/mine.png" width="16" height="16"/>';
   var timeImg = '<img src="/img/time.png" width="16" height="16"/>';
   var newImg = '<img src="/img/new.png" width="16" height="16"/>';
   var tabID, evb1, evb2, evb3;

   /*
   ** @Private - Initialise the tab
   */
   function onInit(id)
   {
      tabID = id;
      evb1 = document.getElementById("evb1");
      evb2 = document.getElementById("evb2");
   }

   /*
   ** @Private - Update the tab
   */
   function onUpdate(id, reason)
   {
      if (reason == 'active')
         return true;
      var now = new Date() / 1000;
      evb1.innerHTML = '';
      evb2.innerHTML = '';

      // Special Event(s)/Week(s)
      //
      Object.keys(bgp.daGame.daEvents).sort(function(a, b) {
         // Use the end date/time as the order_id seems wrong
         return bgp.daGame.daEvents[b].end - bgp.daGame.daEvents[a].end;
      }).forEach(function(v, i, a) {
         var row, cell1, cell2, cell3, sd = 0, ed = 0;
         var ev = bgp.daGame.daEvents[v];

         if (1) {
            if (bgp.daGame.daUser.events.hasOwnProperty(v)) {
               sd = bgp.daGame.daUser.events[v].started;
               ed = bgp.daGame.daUser.events[v].finished;
               if (sd > 0 && ed > now) {
                  row = addEvent(v, evb1, ev, sd, ed);
                  cell1 = row.insertCell();
                  cell2 = row.insertCell();
                  cell2.setAttribute('colspan', 2);
                  if ((ev.hasOwnProperty('premium')) && isBool(ev.premium))
                     cell1.innerHTML = storyImg;
                  var cd = countDown(ed * 1000, cell2);
               }
            }

            if (ev.start > now) {
               // Future Event!
               row = addEvent(v, evb1, ev, ev.start, ev.end);
               cell1 = row.insertCell();
               cell1.setAttribute('colspan', 3);
            }else if (ev.start < now && ev.end > now) {
               // Active Event
               row = addEvent(v, evb1, ev, ev.start, ev.end);
               cell1 = row.insertCell();
               cell2 = row.insertCell();
               cell2.setAttribute('colspan', 2);
               var cd = countDown(ev.end * 1000, cell2);
            }else if (ev.start > 0){
               // Past Event
               row = addEvent(v, evb2, ev, ev.start, ev.end);
               cell1 = row.insertCell();
               cell2 = row.insertCell();
               cell3 = row.insertCell();
               //console.log(ev);
               if ((ev.hasOwnProperty('premium')) && isBool(ev.premium)) {
                  cell1.innerHTML = storyImg;
               }else if (sd && ed)
                  cell1.innerHTML = bonusImg;
               if (sd && ed) {
                  cell2.innerHTML = unixDate(sd, true);
                  cell3.innerHTML = unixDate(ed, true);
               }
            }
         }
      });

      return true;
   }

   /*
   ** @Private - Add Event Details
   */
   function addEvent(id, tb, ev, sd, ed)
   {
      var name = bgp.daGame.string(ev.name_loc);
      if (name == ev.name_loc)
         name = ev.name;

      var row = tb.insertRow();
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);
      var cell4 = row.insertCell(3);

      if (ev.hasOwnProperty('locations'))
         cell1.innerHTML = mineImg;
      cell2.innerHTML = name;
      cell3.innerHTML = unixDate(sd, true);
      cell4.innerHTML = unixDate(ed, true);

      if (wikiPage.hasOwnProperty(id))
         cell2.setAttribute('data-wiki-page', wikiPage[id]);
      return row;
   }

   /*
   ** Define this tab's details
   */
   self.tabs.Events = {
      title:      'Events',
      image:      'events.png',
      order:      50,
      html:       true,
      onInit:     onInit,
      onUpdate:   onUpdate
   };

	return self;
}(guiTabs || {}));
/*
** End
*******************************************************************************/