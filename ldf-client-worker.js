self.importScripts('deps/ldf-client-browser.js');

// The active fragments client and the current results
var fragmentsClient, resultsIterator;

// Set up logging
var logger = new ldf.Logger();
ldf.Logger.setLevel('info');
logger._print = function (items) {
  postMessage({ type: 'log', log: items.slice(2).join(' ').trim() + '\n' });
};

// Handlers of incoming messages
var handlers = {
  // Execute the given query with the given options
  query: function (config) {
    // Create a client to fetch the fragments through HTTP
    config.logger = logger;
    config.fragmentsClient = fragmentsClient =
      new ldf.FragmentsClient(config.datasources, config);

    // Create an iterator to evaluate the query
    try { resultsIterator = new ldf.SparqlIterator(config.query, config); }
    catch (error) { return postMessage({ type: 'error', error: error }); }

    // Post query metadata
    postMessage({ type: 'queryInfo', queryType: resultsIterator.queryType });

    // Post iterator events
    resultsIterator.on('data', function (result) {
      postMessage({ type: 'result', result: result });
    });
    resultsIterator.on('end', function () {
      postMessage({ type: 'end' });
    });
    resultsIterator.on('error', function (error) {
      error = { message: error.message || error.toString() };
      postMessage({ type: 'error', error: error });
    });
  },

  // Stop the execution of the current query
  stop: function () {
    if (resultsIterator) {
      resultsIterator.removeAllListeners();
      resultsIterator = null;
    }
    if (fragmentsClient) {
      fragmentsClient.abortAll();
      fragmentsClient = null;
    }
  },
};

// Send incoming message to the appropriate handler
self.onmessage = function (m) { handlers[m.data.type](m.data); };
