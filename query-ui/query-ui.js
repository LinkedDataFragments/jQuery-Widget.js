/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
/** Initializes the LDF client and its fragment and query picker. */

jQuery(function ($) {
  var logger = new ldf.Logger();
  var $query = $('.query').focus(), $start = $('.execute'),
      $startFragments = $('.startFragments'), $queries = $('.queries'),
      $results = $('.results'), $log = $('.log');



/* * * * *
             QUERY EXECUTION AND RESULT DISPLAY
                                                  * * * * */

  // Execute the query when the button is clicked
  $start.click(function () {
    // Clear results and log, and scroll page to the results
    $log.empty();
    $results.empty();
    $start.prop('disabled', true);
    $('html,body').animate({ scrollTop: $start.offset().top });

    // Create a client to fetch the fragments through HTTP
    var config = { prefixes: prefixes, logger: logger };
    config.fragmentsClient = new ldf.FragmentsClient($startFragments.val(), config);

    // Create the iterator to solve the query
    var sparqlIterator = new ldf.SparqlIterator($query.val(), config);
    sparqlIterator.on('end', function () { $start.prop('disabled', false); });
    sparqlIterator.on('error', function (error) { $results.text(error.message); throw error; });

    // Read the iterator's results, and write them depending on the query type
    switch (sparqlIterator.queryType) {
      // For SELECT queries, write a JSON array representation of the rows
      case 'SELECT':
        var resultsCount = 0;
        appendText($results, '[');
        sparqlIterator.on('data', function (row) {
          appendText($results, resultsCount++ ? ',\n' : '\n', row);
        });
        sparqlIterator.on('end', function () {
          appendText($results, resultsCount ? '\n]' : ']');
        });
      break;
      // For CONSTRUCT queries, write a Turtle representation of all results
      case 'CONSTRUCT':
        var writer = new N3.Writer({ write: function (chunk, encoding, done) {
          appendText($results, chunk), done && done();
        }}, config.prefixes);
        sparqlIterator.on('data', function (triple) { writer.addTriple(triple); })
                      .on('end',  function () { writer.end(); });
      break;
      // Other queries are not supported at the moment
      default:
        throw new Error('Unsupported query type: ' + sparqlIterator.queryType);
    }
  });

  // Add log lines to the log element
  logger._print = function (items) { appendText($log, items.join(' ').trim() + '\n'); };

  // Appends text to the given element
  function appendText($element) {
    for (var i = 1, l = arguments.length; i < l; i++) {
      var item = arguments[i];
      if (typeof item !== 'string')
        item = JSON.stringify(item, null, '  ');
      $element.append(document.createTextNode(item));
    }
    $element.scrollTop(1E10);
  }


/* * * * *
                QUERY AND SOURCE SELECTION
                                                  * * * * */

  // Track whether the query text has been edited
  var queryEdited = $query.val() !== '', uiState = {};
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

      // Load the list of example queries if it is different from the currently loaded list
      if (loadedQuerySet !== startFragment.querySet) {
        var querySet = settings.querySets[loadedQuerySet = startFragment.querySet] || [];
        $queries.empty().append((querySet).map(function (query) {
          return $('<option>', { value: query.sparql, title: query.sparql, text: query.name });
        }));
        // Load an example query if there are no pending edits to the query text
        if (!queryEdited)
          $queries.change();
        // Otherwise, try to match the entered query with an example
        else {
          queryEdited = !querySet.some(function (q) { return q.sparql === $query.val(); });
          $queries.val(queryEdited ? '' : $query.val());
        }
      }
    }
    $startFragments.change(updateStartFragment);
    // Load the initially chosen start fragment
    uiState.startFragment && $startFragments.val(uiState.startFragment);
    updateStartFragment();
  });



/* * * * *
                UI STATE SAVING AND LOADING
                                                  * * * * */

  // Restore the UI state upon entering and when the URL changes
  loadStateFromUrl();
  window.addEventListener('popstate', loadStateFromUrl);
  // Store the UI state to the URL when components change
  $query.add($startFragments).change(saveStateToUrl);

  // Loads the UI state from the URL
  function loadStateFromUrl() {
    uiState = location.hash.substr(1).split('&').reduce(function (uiState, item) {
      var keyvalue = item.match(/^([^=]+)=(.*)/);
      if (keyvalue) uiState[decodeURIComponent(keyvalue[1])] = decodeURIComponent(keyvalue[2]);
      return uiState;
    }, {});
    uiState.startFragment && $startFragments.val(uiState.startFragment).change();
    uiState.query && $query.val(uiState.query).change() && $queries.val('');
  }

  // Saves the UI state to the URL
  function saveStateToUrl() {
    var url = location.href.replace(/#.*/, ''),
        hasDefaultQuery = $query.val() === $queries.children(0).val(),
        hasDefaultFragment = $startFragments.val() === $startFragments.children(0).val();
    if (!hasDefaultFragment || !hasDefaultQuery)
      url += '#startFragment=' + encodeURIComponent($startFragments.val() || '') +
             (hasDefaultQuery ? '' : '&query=' + encodeURIComponent($query.val() || ''));
    history.replaceState && history.replaceState(null, null, url);
  }
});
