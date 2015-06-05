/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
// jQuery widget for triple pattern fragments query execution

(function ($) {
  // Query UI main entry point, which mimics the jQuery UI widget interface:
  // - $(element).queryui(options) initializes the widget
  // - $(element).queryui('option', [key], [value]) gets or sets one or all options
  $.fn.queryui = function (operation, option, value) {
    // Shift parameters if no operation given
    if (typeof operation !== 'string')
      value = option, option = operation, operation = 'init';

    // Apply the operation to all elements; if one element yields a value, stop and return it
    var result = this;
    for (var i = 0; i < this.length && result === this; i++) {
      var $element = $(this[i]), queryui = $element.data('queryui');
      switch (operation) {
        // initialize the element as a Query UI
        case 'init':
          if (!queryui) {
            $element.data('queryui', queryui = new LdfQueryUI($element, option));
            queryui._create();
          }
          break;
        // set an option of a Query UI
        case 'option':
          if (!queryui) throw new Error('Query UI not activated on this element');
          // retrieve all options
          if (option === undefined)     result = queryui.options;
          // retrieve a specific option
          else if (value === undefined) result = queryui.options[value];
          // set a specific option
          else queryui._setOption(option, value);
          break;
      }
    }
    return result;
  };

  // Creates a new Query UI interface for the given element
  function LdfQueryUI($element, options) {
    this.element = $element;
    this.options = $.extend({}, this.options, options);
  }

  $.extend(LdfQueryUI.prototype, {
    // Default widget options
    options: {
      availableDatasources: [],
      queries: [],
    },

    // Initializes the widget
    _create: function () {
      var self = this,
          options = this.options,
          $element = this.element,
          $log = this.$log = $('.log', $element),
          $stop = this.$stop = $('.stop', $element),
          $start = this.$start = $('.start', $element),
          $query = this.$query = $('.queryText', $element),
          $queries = this.$queries = $('.query', $element),
          $results = this.$results = $('.results', $element),
          $datasources = this.$datasources = $('.datasources', $element);

      // Replace non-existing elements by an empty text box
      if (!$datasources.length) $datasources = this.$datasources = $('<input>');

      // When a start fragment is selected, load the corresponding query set
      $datasources.chosen({
        create_option: true, persistent_create_option: true, skip_no_results: true,
        display_selected_options: false, placeholder_text: ' ', create_option_text: 'Add datasource',
      });
      $datasources.change(function () { self._setOption('datasources', $datasources.val()); });

      // When a query is selected, load it into the editor
      $query.edited = $query.val() !== '';
      $query.change(function () { options.query = $query.val(); $query.edited = true; });
      $queries.chosen({ skip_no_results: true, placeholder_text: ' ' });
      $queries.change(function (query) {
        if (query = $queries.val())
          $query.val(options.query = query).edited = false;
      });

      // Set up starting and stopping
      $start.click(this._execute.bind(this));
      $stop.click(this._stopExecution.bind(this));

      // Add log lines to the log element
      var logger = this._logger = new ldf.Logger();
      ldf.Logger.setLevel('info');
      logger._print = function (items) { appendText($log, items.slice(2).join(' ').trim() + '\n'); };

      // Apply all options
      for (var key in options)
        this._setOption(key, options[key], true);
    },

    // Sets a specific widget option
    _setOption: function (key, value, initialize) {
      if (!initialize && this.options[key] === value) return;
      this.options[key] = value;

      // Apply the chosen option
      var self = this, $datasources = this.$datasources, $queries = this.$queries;
      switch (key) {
      // Set the datasources to query
      case 'datasources':
        // Select datasources that already existed
        var selected = (value || []).reduce(function (d, k) { return d[k] = false, d; }, {});
        $datasources.children().each(function () {
          var $option = $(this), url = $(this).val();
          $option.attr('selected', url in selected);
          selected[url] = true;
        });
        // Add and select datasources that didn't exist yet
        $datasources.append($.map(selected, function (exists, url) {
          return exists ? null : $('<option>', { text: url, value: url, selected: true });
        })).trigger('chosen:updated');
        // Update the query set
        if (value && value[0])
          this._loadQuerySet(value[0]);
        break;
      // Set the datasources available for querying
      case 'availableDatasources':
        $datasources.empty().append((value || []).map(function (datasource, index) {
          return $('<option>', { text: datasource.name, value: datasource.url, selected: index === 0 });
        })).trigger('chosen:updated').change();
        break;
      // Set the query
      case 'query':
        this.$query.val(value);
        $queries.children().each(function () { $(this).attr('selected', $(this).val() === value); });
        $queries.trigger('chosen:updated');
        break;
      // Set the list of queries
      case 'queries':
        $queries.empty().append($('<option>'), (value || []).map(function (query) {
          return $('<option>', { text: query.name, value: query.sparql });
        })).trigger('chosen:updated').change();
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
        this._setOption('availableDatasources', value.startFragments);
        break;
      }
    },

    // Loads the query set corresponding to the given fragment
    _loadQuerySet: function (startFragmentUrl) {
      var queryCollection = this.options.queryCollection,
          querySets = queryCollection && queryCollection.querySets, querySet;
      if (querySets) {
        // Find the corresponding query set
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
     var datasources = this.$datasources.val();
      if (!datasources || !datasources.length)
        return alert('Please choose a datasource to execute the query.');

      // Clear results and log, and scroll page to the results
      var $results = this.$results, $log = this.$log;
      $('html,body').animate({ scrollTop: this.$start.offset().top });
      this.$stop.show();
      this.$start.hide();
      $log.empty();
      $results.empty();

      // Create a client to fetch the fragments through HTTP
      var config = { prefixes: prefixes, logger: this._logger };
      config.fragmentsClient = new ldf.FragmentsClient(datasources, config);

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
        // For CONSTRUCT and DESCRIBE queries, write a Turtle representation of all results
        case 'CONSTRUCT':
        case 'DESCRIBE':
          var writer = new N3.Writer({ write: function (chunk, encoding, done) {
            appendText($results, chunk), done && done();
          }}, config);
          resultsIterator.on('data', function (triple) { writer.addTriple(triple); })
                         .on('end',  function () { writer.end(); });
          break;
        // For ASK queries, write whether an answer exists
        case 'ASK':
          resultsIterator.on('data', function (exists) { appendText($results, exists); });
          break;
        default:
          appendText($log, 'Unsupported query type: ' + resultsIterator.queryType);
      }
    },

    // Stops query execution
    _stopExecution: function (error) {
      this.$stop.hide();
      this.$start.show();
      this._resultsIterator && this._resultsIterator.removeAllListeners();
      ldf.HttpClient.abortAll && ldf.HttpClient.abortAll();
      error && error.message && this.$results.text(error.message);
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
