# This project has been deprecated in favor of [Comunica's jQuery Widget](https://github.com/comunica/jQuery-Widget.js), which is part of the [Comunica](https://github.com/comunica/comunica) platform. It can do everything this jQuery-Widget.js can do, and more.

-----

# Linked Data Fragments jQuery Widget
[<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />](http://linkeddatafragments.org/)

[![Build Status](https://travis-ci.org/LinkedDataFragments/jQuery-Widget.js.svg?branch=master)](https://travis-ci.org/LinkedDataFragments/jQuery-Widget.js)
[![Docker Automated Build](https://img.shields.io/docker/automated/linkeddatafragments/jquery-widget.js.svg)](https://hub.docker.com/r/linkeddatafragments/jquery-widget.js/)

**[Try the _Linked Data Fragments jQuery Widget_ online.](http://client.linkeddatafragments.org/)**

This jQuery widget is a browser-based user interface to the [Linked Data Fragments client](https://github.com/LinkedDataFragments/Client).
It allows users to execute SPARQL queries over one or multiple datasets exposed through a [Triple Pattern Fragments interface](http://www.hydra-cg.com/spec/latest/triple-pattern-fragments/).

## Using the code
- Run `npm install` to fetch dependencies and build the browser version of the client code.
- Run `npm start` to run a local Web server.
- Edit datasources in `settings.json` and queries in the `queries` folder, and run `queries-to-json` to compile both of them in a single JSON file.
- Run `npm run production` to generate a production version in the `build` folder.

## How the browser client works
The original _ldf-client_ library is written for the Node.js environment.
The [browserify](http://browserify.org/) library makes it compatible with browsers.

The query engine itself runs in a background thread
using [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).
The user interface (`ldf-client-ui.js`)
instructs the worker (`ldf-client-worker.js`) to evaluate queries
by sending messages,
and the worker sends results back.

### _(Optional)_ Running in a Docker container

If you want to rapidly deploy this widget as a microservice, you can build a [Docker](https://www.docker.com/) container as follows:

```bash
$ docker build -t ldf-client-widget .
```

Next, configure your widget by creating a `settings.json` file in your working directory based on the [example](https://github.com/LinkedDataFragments/jQuery-Widget.js/blob/master/settings.json).
Next, create a `queries` directory in which you should insert the queries that will be present by default in the widget, as is done [here](https://github.com/LinkedDataFragments/jQuery-Widget.js/tree/master/queries).

After that, you can run your newly created container by mounting your current folder to the Docker container:
```bash
$ docker run -p 3000:3000 -it --rm -v $(pwd)/:/tmp/ ldf-client-widget
```

## License
The Linked Data Fragments jQuery Widget is written by [Ruben Verborgh](https://ruben.verborgh.org/).

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
