/*
 * index = [
 *   {
 *     created: "2016-10-01T18:33:22",
 *     modified: "2016-10-01T19:33:22",
 *     id: guid,
 *   }
 * ];
 *
 */

if (typeof $mda === "undefined" ) $mda = { };

var $mda.docs =
{
  _ids: [],

  _updateIndexes: function() {
    var self = this;
    chrome.storage.local.get({ docIds: [] }, function(data) {
      self._ids = data.index;
    });
  },
};
