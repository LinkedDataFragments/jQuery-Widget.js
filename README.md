# Linked Data Fragments jQuery Widget

**[Try the _Linked Data Fragments jQuery Widget_ online.](http://client.linkeddatafragments.org/)**
[<img src="http://linkeddatafragments.org/images/logo.svg" width="100" align="right" alt="" />](http://linkeddatafragments.org/)

This jQuery widget is a browser-based user interface to the [Linked Data Fragments client](https://github.com/LinkedDataFragments/Client).
It allows users to execute SPARQL queries over one or multiple datasets exposed through a [Triple Pattern Fragments interface](http://www.hydra-cg.com/spec/latest/triple-pattern-fragments/).

## Using the code
- Run `npm install` to fetch dependencies and build the browser version of the client code.
- Place the files from this repository on a local Web server
  (for instance, by starting a tool such as [https://github.com/ddfreyne/adsf] in the root folder).
- Open `index.html` in the browser through your Web server (typically `http://localhost:3000/`).
- Edit datasources in `settings.json` and queries in the `queries` folder, and run `queries-to-json` to compile both of them in a single JSON file.
- Run `./build-minified` to generate a production version in the `build` folder.

## How the browser client works
The original _ldf-client_ library is written for the Node.js environment. The [browserify](http://browserify.org/) library makes it compatible with browsers.

The file `browser.js` makes the Node.js library _ldf-client_ available in global scope as `ldf`.
<br>
This script is compiled with its dependencies to `deps/ldf-client-browser.js` via `npm run postinstall`.

You can use the resulting `ldf-client-browser.js` in your browser applications; it is independent of the jQuery UI widget.

## License
The Linked Data Fragments jQuery Widget is written by [Ruben Verborgh](http://ruben.verborgh.org/).

This code is copyrighted by [Multimedia Lab – iMinds – Ghent University](http://mmlab.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
