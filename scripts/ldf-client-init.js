/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
/** Initializes the LDF client and its fragment and query picker. */

jQuery(function ($) {
  // Initialize the LDF client
  var ldfConfig = { prefixes: prefixes },
      ldfUI = new LinkedDataFragmentsClientUI($('.ldf-client'), ldfConfig);
  ldfUI.activate();

  // Load the start fragments and example queries
  $.getJSON('queries.json', function (settings) {
    var $startFragments = $('.startFragments'),
        $query = $('.query'), $queries = $('.queries'), loadedQuerySet;

    // Track whether the query text has been edited
    var queryEdited = $query.val() !== '';
    $query.change(function () { queryEdited = true; });

    // If an example query is picked, replace the query text
    $queries.change(function () { $query.val($queries.val()); queryEdited = false; });

    // If a start fragment is picked, select it and display its example queries
    $startFragments.change(function () {
      // Set the start fragment in the client
      var startFragment = settings.startFragments[parseInt($startFragments.val())];
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
    });

    // Add the possible start fragments to the select box
    $startFragments.append(settings.startFragments.map(function (fragment, index) {
      return $('<option>', { value: index, title: fragment.name, text: fragment.name });
    })).change();
  });
});
