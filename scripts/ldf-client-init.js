/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
/** Initializes the LDF client and its fragment and query picker. */

jQuery(function ($) {
  // Initialize the LDF client
  var ldfConfig = { prefixes: prefixes },
      ldfUI = new LinkedDataFragmentsClientUI($('.ldf-client'), ldfConfig);
  ldfUI.activate();

  // Track whether the query text has been edited
  var $startFragments = $('.startFragments'),
      $query = $('.query'), $queries = $('.queries'),
      queryEdited = $query.val() !== '', state = {};
  $query.change(function () { queryEdited = true; });

  // Load the start fragments and example queries
  $.getJSON('queries.json', function (settings) {
    // Add the possible start fragments to the select box
    $startFragments.append(Object.keys(settings.startFragments).map(function (url) {
      var fragment = settings.startFragments[url];
      return $('<option>', { value: url, title: fragment.name, text: fragment.name });
    }));

    // If an example query is picked, replace the query text
    $queries.change(function () { $query.val($queries.val()).change(); queryEdited = false; });

    // If a start fragment is picked, select it and display its example queries
    var loadedQuerySet;
    function updateStartFragment() {
      // Set the start fragment in the client
      var startFragment = settings.startFragments[$startFragments.val()];
      ldfUI.config.startFragment = startFragment.url;

      // Load the list of example queries if it is different from the currently loaded list
      if (loadedQuerySet !== startFragment.querySet) {
        loadedQuerySet = startFragment.querySet;
        $queries.empty().append((settings.querySets[loadedQuerySet] || []).map(function (query) {
          return $('<option>', { value: query.sparql, title: query.sparql, text: query.name });
        }));
        // Load an example query if there are no pending edits to the query text
        if (!queryEdited) $queries.change();
        else $queries.val('');
      }
    }
    $startFragments.change(updateStartFragment);
    // Load the initial start fragment
    state.startFragment && $startFragments.val(state.startFragment);
    updateStartFragment();
  });

  // Scroll to the results when the button is clicked
  var $execute = $('.execute').click(function () {
    $('html,body').animate({ scrollTop: $execute.offset().top });
  });

  // Loads the application state from the URL
  function loadStateFromUrl() {
    state = location.hash.substr(1).split('&').reduce(function (state, item) {
      var keyvalue = item.match(/^([^=]+)=(.*)/);
      if (keyvalue) state[decodeURIComponent(keyvalue[1])] = decodeURIComponent(keyvalue[2]);
      return state;
    }, {});
    state.startFragment && $startFragments.val(state.startFragment).change();
    state.query && $query.val(state.query).change() && $queries.val('');
  }
  loadStateFromUrl();
  window.addEventListener('popstate', loadStateFromUrl);

  // Saves the application state to the URL
  function saveStateToUrl() {
    var url = location.href.replace(/#.*/, ''),
        hasDefaultQuery = $query.val() === $queries.children(0).val(),
        hasDefaultFragment = $startFragments.val() === $startFragments.children(0).val();
    if (!hasDefaultFragment || !hasDefaultQuery)
      url += '#startFragment=' + encodeURIComponent($startFragments.val() || '') +
             (hasDefaultQuery ? '' : '&query=' + encodeURIComponent($query.val() || ''));
    history.replaceState && history.replaceState(null, null, url);
  }
  $query.add($startFragments).change(saveStateToUrl);
});
