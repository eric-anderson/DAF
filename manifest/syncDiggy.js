/*
** DA Friends - syncDiggy.js
*/
(function() {
  'use strict';

   var syncDiggy = function(__public)
   {
      /*********************************************************************
      ** @Public - Test Data
      */
      __public.syncData = function(xml, webData)
      {
      }

      return __public;
   }

   /*
   ** Attach to global namespace
   */
   window.syncDiggy = syncDiggy;
})();
/*
** END
*******************************************************************************/