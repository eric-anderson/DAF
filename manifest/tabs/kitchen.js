/*
** DA Friends - kitchen.js
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
   self.tabs.Kitchen = {
      title:      'Kitchen',
      image:      'kitchen.png',
      order:      30,
      html:       true,
      onInit:     onInit,
      onUpdate:   onUpdate
   };

	return self;
}(guiTabs || {}));
/*
** End
*******************************************************************************/