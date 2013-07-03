var JSONSchema = require('./jsonschema');
var JSONParser = require('./jsonparse');
var gameSchema = {
	"id": "local/game",
	"type": "object",
	"properties": {
		"id": {"type": "string"},
		"owner": {"type": "string"},
		"members": {
			"type": "array",
			"items": {"type": "string"}
		}
	}
}
var game = {
	"id": "1234",
	"owner": "bmeck",
	"members": ["okamera", "casses", "kperch"]
}
var schemaWalker = new JSONSchema(gameSchema).getWalker();
schemaWalker.onVerify = function (path, value, schema) {
	console.log('VERIFIED', arguments);
}
var parser = new JSONParser();
parser.onRoot = schemaWalker;
parser.write(JSON.stringify(game), function () {
	console.log(arguments);
});