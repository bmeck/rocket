var JSAXParser = require('./jsonparse.js');
var async = require('async');
async.forEach([
  'true',
  'false',
  'null',
  '0',
  '0e0',
  '0e+1',
  '1e-2',
  '-3',
  '0.1',
  '0.1e0',
  '0.1e+0',
  '0.1e-0',
  '""',
  '" "',
  '" a "',
  '"\\r"',
  '"\\n\\t\\f\\b\\"\\\\\\/"',
  '"\\u0000"',
  '"\ub33f"',
  '{}',
  '[]',
  '[true]',
  '[1,""]',
  '{"":""}',
  '{"x":false,"":[{}]}'
], function (value, next) {

  var parser = new JSAXParser();
  parser.onRoot = function () {
    console.log(arguments);
    console.log('ROOT',value,parser);
  };
  parser.write(value,
    function (err) {
      if (err) {
        console.log(err.stack,parser.state); next(); return;
        return;
      }
      parser.finish(function () {
	console.log(JSON.stringify(parser.root), value);
	next();
      });
  })

}, function() {});
