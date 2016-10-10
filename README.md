# Linked Data Fragments jQuery Widget

**[Try the _Linked Data Fragments jQuery Widget_ online.](http://client.linkeddatafragments.org/)**
[<img src="http://linkeddatafragments.org/images/logo.svg" width="100" align="right" alt="" />](http://linkeddatafragments.org/)

This jQuery widget is a browser-based user interface to the [Linked Data Fragments client](https://github.com/LinkedDataFragments/Client).
It allows users to execute SPARQL queries over one or multiple datasets exposed through a [Triple Pattern Fragments interface](http://www.hydra-cg.com/spec/latest/triple-pattern-fragments/).

## Using the code
- Run `npm install` to fetch dependencies and build the browser version of the client code.
- Run `npm start` to run a local Web server.
- Edit datasources in `settings.json` and queries in the `queries` folder, and run `queries-to-json` to compile both of them in a single JSON file.
- Run `npm run production` to generate a production version in the `build` folder.

## How the browser client works
The original _ldf-client_ library is written for the Node.js environment. The [browserify](http://browserify.org/) library makes it compatible with browsers.

The file `browser.js` makes the Node.js library _ldf-client_ available in global scope as `ldf`.
<br>
This script is compiled with its dependencies to `deps/ldf-client-browser.js` via `npm run postinstall`.

You can use the resulting `deps/ldf-client-browser.js` in your browser applications; it is independent of the jQuery UI widget.

### _(Optional)_ Running in a Docker container

If you want to rapidly deploy this widget as a microservice, you can build a [Docker](https://www.docker.com/) container as follows:

```bash
$ docker build -t ldf-client-widget .
```

Next, configure your widget by creating a `settings.json` file in your working directory based on the [example](https://github.com/LinkedDataFragments/jQuery-Widget.js/blob/master/settings.json).
Next, create a `queries` directory in which you should insert the queries that will be present by default in the widget, as is done [here](https://github.com/LinkedDataFragments/jQuery-Widget.js/tree/master/queries).

After that, you can run your newly created container in which `settings.json` and `queries` is mounted to the Docker container:
```bash
$ docker run -p 3000:3000 -it --rm -v $(pwd)/settings.json:/tmp/settings.json -v $(pwd)/queries:/tmp/queries ldf-client-widget
```

## License
The Linked Data Fragments jQuery Widget is written by [Ruben Verborgh](http://ruben.verborgh.org/).

This code is copyrighted by [Multimedia Lab – iMinds – Ghent University](http://mmlab.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
