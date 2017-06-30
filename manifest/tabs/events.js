/*
** DA Friends - events.js
*/
var guiTabs = (function(self)
{
   // What a pain, be better if the Wiki had a tag with event ID number
   var wikiPage = {
      78:   'Events#Scout_Camp',
      77:   'Events#.5BSPECIAL_WEEK.5D_Summer_Postcards',
      76:   'Events#Galactic_Wars',
      75:   'Events#Diggy.27s_5th_Birthday',
      74:   'Events#Easter_2017',
      73:   'Events#Night_Museum',
      72:   'Events#Vace_Entura',
      71:   'Events#Valentine_2017',
      68:   'Events#Ice_Queen',
      65:   'Events_(2016)#Christmas_2016',
      64:   'Events_(2016)#Return_To_Tomorrow',
      63:   'Events_(2016)#Halloween_2016',
      62:   'Events_(2016)#Detective_Stories_3',
      60:   'Events_(2016)#Alien_Mayhem',
      59:   'Events_(2016)#Summer_Games',
      57:   'Events_(2016)#Independence_Day_2',
      56:   'Events_(2016)#Dinosaur_Park',
      55:   'Events_(2016)#Diggy.27s_4th_Birthday',
      53:   'Events_(2016)#Robin_Hood',
      52:   'Events_(2016)#Easter_2016',
      51:   'Events_(2016)#Meteor_Mayhem',
      50:   'Events_(2016)#Cinderella_.28Valentine.27s_Day_2016.29',
      48:   'Events_(2016)#Ice_King',
      47:   'Events_(2015)#Christmas_2015',
      44:   'Events_(2015)#MacGainer',
      43:   'Events_(2015)#Halloween_2015',
      42:   'Events_(2015)#Pirates',
      41:   'Events_(2015)#Little_Mermaid',
      39:   'Events_(2015)#James_Bold',
      37:   'Events_(2015)#Independence_Day',
      36:   'Events_(2015)#Diggy.27s_3rd_Birthday',
      35:   'Events_(2015)#Snow_White',
      33:   'Events_(2015)#Easter_2015_.28500_Gems.29',
      32:   'Events_(2015)#Pink_Puma',
      31:   'Events_(2015)#Valentine_2015_.28500_Gems.29',
      29:   'Events_(2015)#Viva_Las_Vegas',
      28:   'Events_(2014)#Christmas_2014_.28500_Gems.29',
      26:   'Events_(2014)#Excalibur',
      25:   'Events_(2014)#Halloween_2014_.28500_Gems.29',
      24:   'Events_(2014)#Detective_Stories_II',
      22:   'Events_(2014)#Wild_West',
      21:   'Events_(2014)#The_Jungle_Book_.28500_Gems.29',
//    20:   'SPECIAL WEEK',
      19:   'Events_(2014)#Founding_Fathers_.28also_known_as_.22Magisterium_2.27.29_.28500_GEMS.29',
      18:   'Events_(2014)#Brazil_Cup',
      17:   'Events_(2014)#Diggy.27s_2nd_Birthday_.28250_GEMS.29',
      16:   'Events_(2014)#Easter_2014_.28500_Gems.29',
      15:   'Events_(2014)#St._Patrick.27s_Day_2014_.28500_Gems.29',
      14:   'Events_(2014)#Winter_Games_.28500_Gems.29',
      13:   'Events_(2014)#Little_Red_Riding_Hood_.28250_Gems.29',
      12:   'Events_(2013)#Christmas_2013_.28500_Gems.29',
      11:   'Events_(2013)#Thanksgiving_.28250_Gems.29',
      10:   'Events_(2013)#Halloween_2013_.28500_Gems.29',
      9:    'Events_(2013)#Easter_2013_.28250_Gems.29',
      8:    'Events_(2013)#Valentine.27s_day_2013_.28250_GEMS.29',
      7:    'Events_(2012)#Halloween_2012_.28250_Gems.29',
      6:    'Events_(2012)#Christmas_2012_.28250_Gems.29',
      5:    'Events_(2013)#Adventurer_of_the_year_.28500_GEMS.29',
      4:    'Events_(2013)#The_Magisterium_.28500_Gems.29',
      3:    'Events_(2013)#Detective_Stories_of_Hercule_Merlot_.28500_Gems.29',
      2:    'Events_(2013)#Diggy.27s_1st_Birthday_.28500_Gems.29',
      1:    'Events_(2013)#Arabian_Nights_.28500_Gems.29',
   };

   var skipEvent = [0, 67];
   var oneHour = 60*60;
   var oneDay = oneHour*24;

   var bonusImg = '<img src="/img/gift.png" width="16" height="16"/>';
   var storyImg = '<img src="/img/story.png" width="16" height="16"/>';
   var mineImg = '<img src="/img/mine.png" width="16" height="16"/>';
   var timeImg = '<img src="/img/time.png" width="16" height="16"/>';
   var newImg = '<img src="/img/new.png" width="16" height="16"/>';
   var tabID, evb1, evt1, evb2, evt2;

   /*
   ** @Private - Initialise the tab
   */
   function onInit(id, cel)
   {
      tabID = id;
      evt1 = document.getElementById("evt1");
      evb1 = document.getElementById("evb1");
      evt2 = document.getElementById("evt2");
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
      evt2.style.display = (bgp.exPrefs.hidePastEvents) ? 'none' : '';
      evb2.style.display = (bgp.exPrefs.hidePastEvents) ? 'none' : '';

      // Special Event(s)/Week(s)
      //
      Object.keys(bgp.daGame.daEvents).sort(function(a, b) {

         // For some reason, these events have no dates in the XML
         // so plug them for now.
         if (a == 14 || b == 14) {
            // Winter Games 2014
            bgp.daGame.daEvents[14].start = 1392116400;
            bgp.daGame.daEvents[14].end = 1393333200;
         }

         if (a == 15 || b == 15) {
            // St Patricks Day
            bgp.daGame.daEvents[15].start = 1394535600;
            bgp.daGame.daEvents[15].end = 1395752400;
         }

         // Use the end date/time as the order_id seems wrong
         return bgp.daGame.daEvents[b].end - bgp.daGame.daEvents[a].end;
      }).forEach(function(v, i, a) {
         var row, cell1, cell2, cell3, sd = 0, ed = 0;
         var ev = bgp.daGame.daEvents[v];

         if (skipEvent.indexOf(parseInt(v)) == -1) {

            // Shop/Bonus Event?
            if (bgp.daGame.daUser.events.hasOwnProperty(v)) {
               sd = bgp.daGame.daUser.events[v].started;
               ed = bgp.daGame.daUser.events[v].finished;
               if (sd > 0 && ed > now) {
                  row = addEvent(v, evb1, ev, sd, ed, true);
                  cell1 = row.insertCell();
                  cell2 = row.insertCell();
                  cell2.setAttribute('colspan', 2);
                  if ((ev.hasOwnProperty('premium')) && isBool(ev.premium))
                     cell1.innerHTML = storyImg;
                  var cdt = ed * 1000;
                  //var cdt = (now + 20) * 1000;
                  var cd = countDown(cdt, cell2, oneDay, oneHour);
               }
            }

            // Special Events/Weeks
            if (ev.start > now) {
               // Future Event!
               row = addEvent(v, evb1, ev, ev.start, ev.end);
               cell1 = row.insertCell();
               cell1.setAttribute('colspan', 3);
            }else if (ev.start < now && ev.end > now) {
               // Active Event
               row = addEvent(v, evb1, ev, ev.start, ev.end, true);
               cell1 = row.insertCell();
               cell2 = row.insertCell();
               cell2.setAttribute('colspan', 2);
               var cd = countDown(ev.end * 1000, cell2, oneDay, oneHour);
            }else if ((!bgp.exPrefs.hidePastEvents)){
               // Past Event
               row = addEvent(v, evb2, ev, ev.start, ev.end);
               cell1 = row.insertCell();
               cell2 = row.insertCell();
               cell3 = row.insertCell();
               if ((ev.hasOwnProperty('premium')) && isBool(ev.premium)) {
                  cell1.innerHTML = storyImg;
               }else if (sd && ed)
                  cell1.innerHTML = bonusImg;
               if (sd && ed) {
                  cell2.innerHTML = unixDate(sd, false);
                  cell3.innerHTML = unixDate(ed, false);
               }
            }
         }
      });

      if (bgp.exPrefs.hidePastEvents && evb1.rows.length == 0) {
         guiStatus('noActiveEvents', 'Information', 'info');
         return false;
      }

      evt1.style.display = (evb1.rows.length == 0) ? 'none' : '';
      evb1.style.display = (evb1.rows.length == 0) ? 'none' : '';

      return true;
   }

   /*
   ** @Private - Add Event Details
   */
   function addEvent(id, tb, ev, sd, ed, time = false)
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
      cell3.innerHTML = sd > 0 ? unixDate(sd, time) : '';
      cell4.innerHTML = ed > 0 ? unixDate(ed, time) : '';

      if (wikiPage.hasOwnProperty(id)) {
         row.className = 'wiki-row';
         cell2.setAttribute('data-wiki-page', wikiPage[id]);
      }
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