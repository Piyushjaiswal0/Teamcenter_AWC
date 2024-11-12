// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@
/*global
 CKEDITOR
 */

CKEDITOR.plugins.add('disabledrop', {
     init: function (editor) {

          function rejectDrop(event) {
              event.data.preventDefault(true);
          }

          editor.on('contentDom', function() {
            editor.document.on('drop',rejectDrop);
          });

      }
});
