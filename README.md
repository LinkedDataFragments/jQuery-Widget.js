# Linked Data Fragments Browser Client

**[Try the _Linked Data Fragments Web Client_ online.](http://client.linkeddatafragments.org/)**
[<img src="http://linkeddatafragments.org/images/logo.svg" width="100" align="right" alt="" />](http://linkeddatafragments.org/)

This repository contains a browser interface to the [Linked Data Fragments client](https://github.com/LinkedDataFragments/Client).
<br>
In addition, it shows how to create applications using the [_ldf-client_ library](https://github.com/LinkedDataFragments/Client.js).

## How the browser client works
The original _ldf-client_ library is written for the Node.js environment. This repository shows how to compile it using [browserify](http://browserify.org/) to make it compatible with browsers.

The file `browser.js` makes the Node.js library _ldf-client_ available in global scope as `ldf`.
<br>
This script is compiled with its dependencies to `deps/ldf-client-browser.js` via `npm run postinstall`.

You can use the resulting `ldf-client-browser.js` in your browser applications.

## Examples in this repository
- **query-ui:** a user interface to execute SPARQL queries ([demo](http://client.linkeddatafragments.org/))
- **query-pull-based:** an example of query results arriving on demand

## Compiling the browser client
```bash
$ npm install      # install dependencies and compile browser script
$ cd query-ui
$ ./build-queries  # create the JSON version of the example queries
$ ./build-minified # create a minified version in query-ui/build/
```

## License
The Linked Data Fragments Browser Client is written by [Ruben Verborgh](http://ruben.verborgh.org/).

This code is copyrighted by [Multimedia Lab – iMinds – Ghent University](http://mmlab.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
