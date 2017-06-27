/*
** DA Friends - camp.js
*/
var guiTabs = (function(self)
{
   var tabID;

   /*
   ** @Private - Initialise the tab
   */
   function onInit(id)
   {
      tabID = id;
   }

   /*
   ** @Private - Update the tab
   */
   function onUpdate(id, reason)
   {
      if (reason == 'active')
         return true;
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