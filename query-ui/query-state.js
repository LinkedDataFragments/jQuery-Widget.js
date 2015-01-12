/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
/** Initializes the LDF client and its fragment and query picker. */

jQuery(function ($) {
  var $query = $('.queryText'), $queries = $('.query'), $startFragments = $('.startFragment');
  $('.ldf-client').one('changeQuerySet', function () {
    // Restore the UI state upon entering and when the URL changes
    loadStateFromUrl();
    window.addEventListener('popstate', loadStateFromUrl);
    // Store the UI state in the URL when components change
    $query.add($queries).add($startFragments).change(saveStateToUrl);
  });

  // Loads the UI state from the URL
  function loadStateFromUrl() {
    var uiState = location.hash.substr(1).split('&').reduce(function (uiState, item) {
      var keyvalue = item.match(/^([^=]+)=(.*)/);
      if (keyvalue) uiState[decodeURIComponent(keyvalue[1])] = decodeURIComponent(keyvalue[2]);
      return uiState;
    }, {});
    uiState.startFragment && $startFragments.val(uiState.startFragment).change();
    uiState.query && $queries.val(uiState.query).change();
  }

  // Stores the current UI state in the URL
  function saveStateToUrl() {
    var url = location.href.replace(/#.*/, ''),
        options = $('.ldf-client').queryui('option'),
        hasDefaultQuery = $query.val() === (options.queries[0] || {}).sparql,
        hasDefaultFragment = $startFragments.val() === (options.startFragments[0] || {}).url;
    if (!hasDefaultFragment || !hasDefaultQuery)
      url += '#startFragment=' + encodeURIComponent($startFragments.val() || '') +
             (hasDefaultQuery ? '' : '&query=' + encodeURIComponent($query.val() || ''));
    history.replaceState && history.replaceState(null, null, url);
  }
});
