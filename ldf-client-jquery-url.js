/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
/** Loads and stores state of the Triple Pattern Fragments widget using the URL. */

jQuery(function ($) {
  var $queryui = $('.ldf-client').one('changeQuerySet', function () {
    // Restore the UI state upon entering and when the URL changes
    loadStateFromUrl();
    $(window).on('popstate', loadStateFromUrl);
    // Store the UI state in the URL when the UI changes
    $queryui.on('change', saveStateToUrl);
  });

  // Loads the UI state from the URL
  function loadStateFromUrl() {
    var uiState = location.hash.substr(1).split('&').reduce(function (uiState, item) {
      var keyvalue = item.match(/^([^=]+)=(.*)/);
      if (keyvalue) uiState[decodeURIComponent(keyvalue[1])] = decodeURIComponent(keyvalue[2]);
      return uiState;
    }, {});
    if (uiState.datasources = uiState.datasources || uiState.startFragment) // backwards compatibility
      $queryui.queryui('option', 'selectedDatasources', uiState.datasources.split(/[ ,;]+/));
    if (uiState.query)
      $queryui.queryui('option', 'query', uiState.query);
  }

  // Stores the current UI state in the URL
  function saveStateToUrl() {
    var url = location.href.replace(/#.*/, ''),
        options = $queryui.queryui('option'),
        datasources = options.selectedDatasources || [],
        defaultDatasource = (options.datasources[0] || {}).url,
        hasDefaultQuery = options.query === (options.queries[0] || {}).sparql,
        hasDefaultDatasource = datasources.length === 0 ||
                               (datasources.length === 1 && datasources[0] === defaultDatasource);
    if (!hasDefaultDatasource || !hasDefaultQuery)
      url += '#datasources=' + datasources.map(encodeURIComponent).join(';') +
             (hasDefaultQuery ? '' : '&query=' + encodeURIComponent(options.query || ''));
    history.replaceState && history.replaceState(null, null, url);
  }
});
