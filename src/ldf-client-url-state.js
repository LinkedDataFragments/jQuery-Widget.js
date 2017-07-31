/*! @license MIT ©2014–2016 Ruben Verborgh, Ghent University – imec */
/** Loads and stores state of the Triple Pattern Fragments widget using the URL. */

jQuery(function ($) {
  var $queryui = $('.ldf-client').one('settingsUpdated', function () {
    // Restore the UI state upon entering and when the URL changes
    loadStateFromUrl();
    $(window).on('popstate', loadStateFromUrl);
    // Store the UI state in the URL when the UI changes
    if (history.replaceState)
      $queryui.on('change', saveStateToUrl);
  });

  // Loads the UI state from the URL
  function loadStateFromUrl() {
    var uiState = location.hash.substr(1).split('&').reduce(function (uiState, item) {
      var keyvalue = item.match(/^([^=]+)=(.*)/);
      if (keyvalue) uiState[decodeURIComponent(keyvalue[1])] = decodeURIComponent(keyvalue[2]);
      return uiState;
    }, {});
    if ((uiState.datasources = uiState.datasources || uiState.startFragment) || uiState.transientDatasources) { // backwards compatibility
      var datasources = {};
      if (uiState.datasources) {
        uiState.datasources.split(/[ ,;]+/).forEach(function (url) {
          datasources[url] = 'persistent';
        });
      }
      if (uiState.transientDatasources) {
        uiState.transientDatasources.split(/[ ,;]+/).forEach(function (url) {
          datasources[url] = 'transient';
        });
      }
      $queryui.queryui('option', 'selectedDatasources', datasources);
    }
    if (uiState.query)
      $queryui.queryui('option', 'query', uiState.query);
    if (uiState.datetime)
      $queryui.queryui('option', 'datetime', uiState.datetime);
  }

  // Stores the current UI state in the URL
  function saveStateToUrl() {
    var queryString = [],
        options = $queryui.queryui('option'),
        datasources = { persistent: [], transient: [] },
        hasDefaultQuery = options.query === (options.queries[0] || {}).sparql;
    Object.keys(options.selectedDatasources || {}).forEach(function (url) {
      datasources[options.selectedDatasources[url]].push(url);
    });
    // Set query string options
    if (datasources.persistent.length !== 0)
      queryString.push('datasources=' + datasources.persistent.map(encodeURIComponent).join(';'));
    if (datasources.transient.length !== 0)
      queryString.push('transientDatasources=' + datasources.transient.map(encodeURIComponent).join(';'));
    if (!hasDefaultQuery)
      queryString.push('query=' + encodeURIComponent(options.query || ''));
    if (options.datetime)
      queryString.push('datetime=' + encodeURIComponent(options.datetime));

    // Compose new URL with query string
    queryString = queryString.length ? '#' + queryString.join('&') : '';
    history.replaceState(null, null, location.href.replace(/(?:#.*)?$/, queryString));
  }
});
