/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
// jQuery widget for triple pattern fragments query execution

(function ($) {
  $.widget('ldf.queryui', {
    // Default widget options
    options: {
      startFragments: [],
      queries: [],
    },

    // Initializes the widget
    _create: function () {
      var options = this.options,
          $element = this.element,
          $log = this.$log = $('.log', $element);
          $stop = this.$stop = $('.stop', $element);
          $start = this.$start = $('.start', $element);
          $query = this.$query = $('.queryText', $element);
          $queries = this.$queries = $('.query', $element);
          $results = this.$results = $('.results', $element);
          $startFragments = this.$startFragments = $('.startFragment', $element);

      // Replace non-existing elements by an empty text box
      if (!$startFragments.length) $startFragments = this.$startFragments = $('<input>');

      // When a start fragment is selected, load the corresponding query set
      $startFragments.combobox({ valueKey: 'url', labelKey: 'name' });
      this._on($startFragments, { change: '_loadSelectedQuerySet' });

      // When a query is selected, load it into the editor
      $query.edited = $query.val() !== '';
      $query.change(function () { options.query = $query.val(); $query.edited = true; });
      $queries.combobox({ valueKey: 'sparql', labelKey: 'name', onlyLabelTerms: true });
      $queries.change(function (query) {
        if (query = $queries.val())
          $query.val(options.query = query).edited = false;
      });

      // Set up starting and stopping
      this._on($start, { click: '_execute' });
      this._on($stop,  { click: '_stopExecution' });

      // Add log lines to the log element
      var logger = this._logger = new ldf.Logger();
      ldf.Logger.setLevel('info');
      logger._print = function (items) { appendText($log, items.slice(2).join(' ').trim() + '\n'); };

      // Apply all options
      for (var key in options)
        this._setOption(key, options[key]);
    },

    // Sets a specific widget option
    _setOption: function (key, value) {
      var self = this, $startFragments = this.$startFragments, $queries = this.$queries;
      this.options[key] = value;
      switch (key) {
      // Set the start fragment
      case 'startFragment':
        if (value !== $startFragments.val())
          $startFragments.val(value).change();
        break;
      // Set the list of start fragments
      case 'startFragments':
        $startFragments.combobox('option', 'options', value);
        value[0] && this._setOption('startFragment', value[0].url);
        break;
      // Set the query
      case 'query':
        if (value !== $queries.val())
          $queries.val(value).change();
        break;
      // Set the list of queries
      case 'queries':
        $queries.combobox('option', 'options', value);
        // Automatically load the first query if the current query was not edited
        if (!this.$query.edited)
          value[0] && this._setOption('query', value[0].sparql);
        break;
      // Set start fragments and query sets
      case 'queryCollection':
        // If the collection is given as a string, fetch through HTTP
        if (typeof value === 'string')
          return $.getJSON(value, function (querySet) { self._setOption(key, querySet); });
        // Load the start fragments, which will trigger query loading
        this._setOption('startFragments', value.startFragments);
        if (!$startFragments.val() && value.startFragments.length)
          $startFragments.val(value.startFragments[0].url).change();
        break;
      }
    },

    // Displays the query set that corresponds to the selected start fragment
    _loadSelectedQuerySet: function () {
      var queryCollection = this.options.queryCollection,
          querySets = queryCollection && queryCollection.querySets;
      if (querySets) {
        // Find the corresponding query set
        var startFragmentUrl = this.$startFragments.val(), querySet;
        queryCollection.startFragments.some(function (startFragment) {
          if (startFragment.url === startFragmentUrl && startFragment.querySet in querySets)
            return querySet = startFragment.querySet;
        }, this);
        querySet = querySet || 'default';
        // Load the query set if not already loaded
        if (querySet !== this._querySet) {
          this._querySet = querySet;
          this._setOption('queries', querySets[this._querySet] || []);
          this.element.trigger('changeQuerySet');
        }
      }
    },

    // Starts query execution
    _execute: function () {
      // Clear results and log, and scroll page to the results
      $('html,body').animate({ scrollTop: $start.offset().top });
      this.$stop.show();
      this.$start.hide();
      this.$log.empty();
      this.$results.empty();

      // Create a client to fetch the fragments through HTTP
      var config = { prefixes: prefixes, logger: this._logger };
      config.fragmentsClient = new ldf.FragmentsClient($startFragments.val(), config);

      // Create the iterator to solve the query
      var resultsIterator;
      try { resultsIterator = new ldf.SparqlIterator(this.$query.val(), config); }
      catch (error) { return this._stopExecution(error); }
      this._resultsIterator = resultsIterator;
      resultsIterator.on('end', $.proxy(this._stopExecution, this));
      resultsIterator.on('error', $.proxy(this._stopExecution, this));

      // Read the iterator's results, and write them depending on the query type
      switch (resultsIterator.queryType) {
        // For SELECT queries, write a JSON array representation of the rows
        case 'SELECT':
          var resultCount = 0;
          resultsIterator.on('data', function (row) {
            resultCount++;
            var lines = [];
            $.each(row, function (k, v) { if (v !== undefined) lines.push(k + ': ' + v); });
            appendText($results, lines.join('\n'), '\n\n');
          });
          resultsIterator.on('end', function () {
            resultCount || appendText($results, '(This query has no results.)');
          });
        break;
        // For CONSTRUCT queries, write a Turtle representation of all results
        case 'CONSTRUCT':
          var writer = new N3.Writer({ write: function (chunk, encoding, done) {
            appendText($results, chunk), done && done();
          }}, config);
          resultsIterator.on('data', function (triple) { writer.addTriple(triple); })
                         .on('end',  function () { writer.end(); });
        break;
        // Other queries are not supported at the moment
        default:
          throw new Error('Unsupported query type: ' + resultsIterator.queryType);
      }
    },

    // Stops query execution
    _stopExecution: function (error) {
      this.$stop.hide();
      this.$start.show();
      this._resultsIterator && this._resultsIterator.removeAllListeners();
      error && error.message && $results.text(error.message);
    },
  });

  // Appends text to the given element
  function appendText($element) {
    for (var i = 1, l = arguments.length; i < l; i++)
      $element.append((arguments[i] + '').replace(/(<)|(>)|(&)|(https?:\/\/[^\s<>]+)/g, escape));
    $element.scrollTop(1E10);
  }
  // Escapes special HTML characters and convert URLs into links
  function escape(match, lt, gt, amp, url) {
    return lt && '&lt;' || gt && '&gt;' || amp && '&amp;' ||
           $('<a>', { href: url, target: '_blank', text: url })[0].outerHTML;
  }
})(jQuery);
