/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
/** Initializes the LDF client and its fragment and query picker. */

jQuery(function ($) {
  var $queryui = $('.ldf-client'), $query = $('.queryText'), $queries = $('.query');
  $queryui.one('changeQuerySet', function () {
    // Restore the UI state upon entering and when the URL changes
    loadStateFromUrl();
    window.addEventListener('popstate', loadStateFromUrl);
    // Store the UI state in the URL when components change
    $('*', $queryui).change(saveStateToUrl);
  });

  // Loads the UI state from the URL
  function loadStateFromUrl() {
    var uiState = location.hash.substr(1).split('&').reduce(function (uiState, item) {
      var keyvalue = item.match(/^([^=]+)=(.*)/);
      if (keyvalue) uiState[decodeURIComponent(keyvalue[1])] = decodeURIComponent(keyvalue[2]);
      return uiState;
    }, {});
    uiState.startFragment && $queryui.queryui('option', 'startFragment', uiState.startFragment);
    uiState.query && $queries.val(uiState.query).change();
  }

  // Stores the current UI state in the URL
  function saveStateToUrl() {
    var url = location.href.replace(/#.*/, ''),
        options = $queryui.queryui('option'),
        hasDefaultQuery = $query.val() === (options.queries[0] || {}).sparql,
        hasDefaultFragment = options.startFragment === (options.startFragments[0] || {}).url;
    if (!hasDefaultFragment || !hasDefaultQuery)
      url += '#startFragment=' + encodeURIComponent(options.startFragment || '') +
             (hasDefaultQuery ? '' : '&query=' + encodeURIComponent($query.val() || ''));
    history.replaceState && history.replaceState(null, null, url);
  }
});
