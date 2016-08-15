/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
// jQuery widget for Triple Pattern Fragments query execution

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
      datasources: [],
      queries: [],
      prefixes: [],
    },

    // Initializes the widget
    _create: function () {
      var self = this,
          options = this.options,
          $element = this.element,
          $stop = this.$stop = $('.stop', $element),
          $start = this.$start = $('.start', $element),
          $timing = this.$timing = $('.timing', $element),
          $query = this.$query = $('.queryText', $element),
          $queries = this.$queries = $('.query', $element),
          $log = $('.log', $element),
          $results = $('.results', $element),
          $resultsText = $('<div>', { class: 'text' }),
          $datasources = this.$datasources = $('.datasources', $element),
          $datetime = this.$datetime = $('.datetime', $element),
          $details = this.$details = $('.details', $element),
          $showDetails = this.$showDetails = $('.details-toggle', $element);

      // Replace non-existing elements by an empty text box
      if (!$datasources.length) $datasources = this.$datasources = $('<select>');
      if (!$results.length) $results = $('<div>');
      if (!$log.length) $log = $('<div>');

      // When a datasource is selected, load the corresponding query set
      $datasources.chosen({
        create_option: true, persistent_create_option: true,
        skip_no_results: true, search_contains: true, display_selected_options: false,
        placeholder_text: ' ', create_option_text: 'Add datasource',
      });
      $datasources.change(function () { self._setOption('selectedDatasources', $datasources.val()); });

      // When a query is selected, load it into the editor
      $query.edited = $query.val() !== '';
      $query.change(function () { options.query = $query.val(); $query.edited = true; });
      $queries.chosen({ skip_no_results: true, placeholder_text: ' ' });
      $queries.change(function (query) {
        if (query = $queries.val())
          $query.val(options.query = query).edited = false;
      });

      // Update datetime on change
      $datetime.change(function () { self._setOption('datetime', $datetime.val()); });

      // Set up starting and stopping
      $start.click(this._execute.bind(this));
      $stop.click(this._stopExecution.bind(this));

      // Set up details toggling
      $showDetails.click(function () {
        $details.is(':visible') ? self._hideDetails() : self._showDetails();
      });

      // Set up results
      $results.append($resultsText);
      this._resultsScroller = new FastScroller($results, renderResult);
      this._writeResult = appenderFor($resultsText);

      // Set up logging
      var logger = this._logger = new ldf.Logger(),
          writeLog = this._writeLog = appenderFor($log);
      ldf.Logger.setLevel('info');
      logger._print = function (items) {
        writeLog(items.slice(2).join(' ').trim() + '\n');
      };

      // Apply all options
      for (var key in options)
        this._setOption(key, options[key], true);
    },

    // Sets a specific widget option
    _setOption: function (key, value, initialize) {
      var options = this.options;
      if (!initialize && options[key] === value) return;
      options[key] = value;

      // Apply the chosen option
      var self = this, $datasources = this.$datasources, $queries = this.$queries;
      switch (key) {
      // Set the datasources available for querying
      case 'datasources':
        // Create options for each datasource
        $datasources.empty().append((value || []).map(function (datasource, index) {
          return $('<option>', { text: datasource.name, value: datasource.url });
        }));
        // Restore selected datasources
        this._setOption('selectedDatasources', options.selectedDatasources, true);
        break;
      // Set the datasources to query
      case 'selectedDatasources':
        // Choose the first available datasource if none was chosen
        var $options = $datasources.children();
        if (initialize && !(value && value.length) && $options.length)
          options[key] = value = [$options.val()];
        // Select chosen datasources that were already in the list
        var selected = toHash(value);
        $options.each(function (index) {
          var $option = $(this), url = $(this).val();
          $option.attr('selected', url in selected);
          selected[url] = true;
        });
        // Add and select chosen datasources that were not in the list yet
        $datasources.append($.map(selected, function (exists, url) {
          return exists ? null : $('<option>', { text: url, value: url, selected: true });
        })).trigger('chosen:updated');
        // Update the query set
        this._loadQueries(value);
        break;
      // Set the query
      case 'query':
        this.$query.val(value).change();
        break;
      // Set the list of all possible queries
      case 'queries':
        this._loadQueries(options.selectedDatasources);
        break;
      case 'datetime':
        if (value)
          this._showDetails();
        this.$datetime.val(value).change();
        break;
      // Set the list of selectable queries
      case 'relevantQueries':
        value = value || [];
        // Load the first selectable query if the current query was not edited and not in the list
        if (!this.$query.edited && !value.some(function (v) { return v.sparql === options.query; }))
          value[0] && this._setOption('query', value[0].sparql);
        // Update the selectable query list
        $queries.empty().append($('<option>'), value.map(function (query) {
          return $('<option>', { text: query.name, value: query.sparql,
                                 selected: options.query === query.sparql });
        })).trigger('chosen:updated').change();
        break;
      // Load settings from a JSON resource
      case 'settings':
        $.getJSON(value, function (settings) {
          for (var key in settings)
            self._setOption(key, settings[key]);
        });
        break;
      }
    },

    // Load queries relevant for the given datasources
    _loadQueries: function (datasources) {
      datasources = toHash(datasources);
      var queries = (this.options.queries || []).filter(function (query, index) {
        query.id = index;
        // Include the query if it indicates no datasources,
        // or if it is relevant for at least one datasource
        return !query.datasources || !query.datasources.length ||
               query.datasources.some(function (d) { return d in datasources; });
      });

      // Load the set of queries if it is different from the current set
      var querySetId = queries.map(function (q) { return q.id; }).join();
      if (this._querySetId !== querySetId) {
        this._querySetId = querySetId;
        this._setOption('relevantQueries', queries);
        this.element.trigger('changeQuerySet');
      }
    },

    // Starts query execution
    _execute: function () {
     var datasources = this.$datasources.val();
      if (!datasources || !datasources.length)
        return alert('Please choose a datasource to execute the query.');

      // Clear results and log
      var resultsScroller = this._resultsScroller,
          writeResult = this._writeResult, writeLog = this._writeLog;
      this.$stop.show();
      this.$start.hide();
      resultsScroller.removeAll();
      writeResult.clear();
      writeLog.clear();

      // Scroll page to the results
      $('html,body').animate({ scrollTop: this.$start.offset().top });

      // Create a client to fetch the fragments through HTTP
      var config = {
        logger: this._logger,
        prefixes: this.options.prefixes,
        datetime: parseDate(this.options.datetime),
      };
      this.fragmentsClient = config.fragmentsClient
                           = new ldf.FragmentsClient(datasources, config);

      // Create the iterator to solve the query
      var resultsIterator, resultCount = 0;
      try { resultsIterator = new ldf.SparqlIterator(this.$query.val(), config); }
      catch (error) { return this._stopExecution(error); }
      this._resultsIterator = resultsIterator;
      resultsIterator.on('data',  function () { resultCount++ });
      resultsIterator.on('end',   $.proxy(this._stopExecution, this));
      resultsIterator.on('error', $.proxy(this._stopExecution, this));

      // Read the iterator's results, and write them depending on the query type
      switch (resultsIterator.queryType) {
        // For SELECT queries, write a JSON array representation of the rows
        case 'SELECT':
          resultsIterator.on('data', function (row) {
            resultsScroller.addContent([lastRow = row]);
          });
          resultsIterator.on('end', function () {
            if (!resultCount)
              writeResult('This query has no results.');
          });
          break;
        // For CONSTRUCT and DESCRIBE queries, write a Turtle representation of all results
        case 'CONSTRUCT':
        case 'DESCRIBE':
          var writer = new N3.Writer({ write: function (chunk, encoding, done) {
            writeResult(chunk);
            done && done();
          }}, config);
          resultsIterator.on('data', function (triple) { writer.addTriple(triple); })
                         .on('end',  function () { writer.end(); });
          break;
        // For ASK queries, write whether an answer exists
        case 'ASK':
          resultsIterator.on('data', function (exists) { writeResult(exists); });
          break;
        default:
          writeResult(resultsIterator.queryType + ' queries are unsupported.');
      }

      // Update result timer
      var $timing = this.$timing, startTime = new Date();
      function updateTiming() {
        $timing.text(resultCount.toLocaleString() + ' result' +
                     (resultCount === 1 ? '' : 's') + ' in ' +
                     ((new Date() - startTime) / 1000).toFixed(1) + 's');
      }
      updateTiming();
      resultsIterator.on('end', updateTiming);
      this._timingUpdater && clearInterval(this._timingUpdater);
      this._timingUpdater = setInterval(updateTiming, 100);
    },

    // Stops query execution
    _stopExecution: function (error) {
      this.$stop.hide();
      this.$start.show();
      this._resultsIterator && this._resultsIterator.removeAllListeners();
      if (this.fragmentsClient.abortAll)
        this.fragmentsClient.abortAll();
      else if (ldf.HttpClient.abortAll)
        ldf.HttpClient.abortAll();
      error && error.message && this._writeResult(error.message);
      this._writeResult.flush();
      this._writeLog.flush();
      clearInterval(this._timingUpdater);
    },

    // Shows the details panel
    _showDetails: function () {
      this.$details.slideDown(150);
      this.$showDetails.addClass('enabled');
    },

    // Hides the details panel
    _hideDetails: function () {
      this._setOption('datetime', '');
      this.$details.slideUp(150);
      this.$showDetails.removeClass('enabled');
    },
  });

  // Creates a function that appends text to the given element in a throttled way
  function appenderFor($element) {
    var buffer, allowedAppends, timeout, delay = 1000;
    // Resets the element
    function clear() {
      buffer = '';
      $element.empty();
      allowedAppends = 50;
      clearTimeout(timeout);
    }
    clear();
    // Appends the text to the element, or queues it for appending
    function append(text) {
      // Append directly if still allowed
      if (allowedAppends > 0) {
        $element.append(escape(text));
        // When no longer allowed, re-enable appending after a delay
        if (--allowedAppends === 0)
          timeout = setTimeout(flush, delay);
      }
      // Otherwise, queue for appending
      else
        buffer += text;
    }
    // Writes buffered text and re-enables appending
    function flush() {
      // Clear timeout in case flush was explicitly triggered
      clearTimeout(timeout);
      timeout = null;
      // Re-enable appending right away if no text was queued
      if (!buffer)
        allowedAppends = 1;
      // Otherwise, append queued text and wait to re-enable
      else {
        $element.append(escape(buffer));
        buffer = '';
        timeout = setTimeout(flush, delay);
      }
    }
    // Export the append function
    append.clear = clear;
    append.flush = flush;
    return append;
  }

  // Escapes special HTML characters and convert URLs into links
  function escape(text) {
    return (text + '').replace(/(<)|(>)|(&)|http(s?:\/\/[^\s<>]+)/g, escapeMatch);
  }
  function escapeMatch(match, lt, gt, amp, url) {
    return lt && '&lt;' || gt && '&gt;' || amp && '&amp;' ||
           (url = 'http' + escape(url)) &&
           '<a href="' + url + '" target=_blank>' + url + '</a>';
  }

  // Converts the array to a hash with the elements as keys
  function toHash(array) {
    var hash = {}, length = array ? array.length : 0;
    for (var i = 0; i < length; i++)
      hash[array[i]] = false;
    return hash;
  }

  // Parses a yyyy-mm-dd date string into a Date
  function parseDate(date) {
    if (date) {
      try { return new Date(Date.parse(date)); }
      catch (e) { }
    }
  }

  // Transforms a result row into an HTML element
  function renderResult(row, container) {
    container = container || $('<div>', { 'class': 'result' }).append($('<dl>'))[0];
    $(container.firstChild).empty().append($.map(row, function (value, variable) {
      return [$('<dt>', { text: variable }), $('<dd>', { html: escape(value) })];
    }));
    return container;
  };

  // Transforms a log line into an HTML element
  function renderLogLine(text, element) {
    element = element || $('<p>')[0];
    element.innerHTML = escape(text);
    return element;
  };
})(jQuery);
