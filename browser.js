// Make the ldf-client module available as a global browser object.
// To be compiled with browserify into deps/ldf-client-browser.js

window.ldf = require('ldf-client');
window.N3  = require('ldf-client/node_modules/n3'); // expose the same N3 version as used in the client
