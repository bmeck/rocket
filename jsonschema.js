function JSONSchema(schema) {
	this.schema = schema;
	return this;
}
module.exports = JSONSchema;
JSONSchema.prototype.getWalker = function () {
	var self = this;
	var map = new WeakMap();
	return function (done) {
		var parser = this;
		self.validate(parser.path, parser.root, self.schema, done);
	}
}
JSONSchema.prototype.executeValidate = function (path, value, schema, done) {
	console.log('VALIDATED', value, schema)
	//console.trace();
	if (this.onValidate) {
		this.onValidate.apply(this, arguments);
	}
	else if (done) done(null);
}
JSONSchema.prototype.validate = function (path, value, schema, done) {
	if (schema.type) switch(schema.type) {
		case 'null':
			if (value!==null) {
				done(new Error('Expected ' + path.keys + ' to be null'));
            	return;
			}
			break;
		case 'array':
			if (!Array.isArray(value)) {
				done(new Error('Expected ' + path.keys + ' to be an array'));
            	return;
			}
			this.validateArray(path, value, schema, done);
			return;
		case 'integer':
			if (value|0 !== value || typeof value !== 'number') {
				done(new Error('Expected ' + path.keys + ' to be an integer'));
				return;
			}
			this.validateNumeric(path, value, schema, done);
			return;
		case 'number':
			if (typeof value !== 'number') {
				done(new Error('Expected ' + path.keys + ' to be a number'));
				return;
			}
			this.validateNumeric(path, value, schema, done);
			return;
		case 'string':
			if (typeof value !== 'string') {
				done(new Error('Expected ' + path.keys + ' to be a string'));
				return;
			}
			this.validateString(path, value, schema, done);
			return;
		case 'object':
			if (typeof value !== 'object') {
				done(new Error('Expected ' + path.keys + ' to be an object'));
				return;
			}
			this.validateObject(path, value, schema, done);
			return;
		case 'boolean':
			if (typeof value !== 'boolean') {
				done(new Error('Expected ' + path.keys + ' to be a boolean'));
				return;
			}
			break;
		default:
			done(new Error('Unknown schema type'));
			return;
	}
	this.executeValidate(path, value, schema, done);
}
JSONSchema.prototype.validateObject = function (path, value, schema, done) {
	var self = this;
	if (schema.properties) {
		var toCheck = 0;
		for (var key in schema.properties) {
			toCheck++;
			path.preConnect([key], function (schema, keys, values, next) {
				self.validate(path, values[values.length-1], schema, function (err) {
					if (err) {
						next(err);
						return;
					}
					toCheck--;
					next(null);
					if (toCheck == 0) {
						console.log('PROPERTIES CHECKED OUT')
						self.executeValidate(path, value, schema);
					}
				});
			}.bind(null, schema.properties[key]));
		}
	}
	done(null);
}
JSONSchema.prototype.validateArray = function (path, value, schema, done) {
	var self = this;
	if (schema.items) {
		path.preConnect([null], function (schema, keys, values, next) {
			self.validate(path, values[values.length-1], schema, function (err) {
				if (err) {
					next(err);
					return;
				}
				next(null);
			});
		}.bind(null, schema.items));
		path.postConnect([], function (schema, keys, values, next) {
			console.log('POSTCONNECTED');
			next(null);
			self.executeValidate(path, value, schema);
		}.bind(null, schema.items));
	}
	done(null);
}
JSONSchema.prototype.validateNumeric = function (path, value, schema, done) {
	if (schema.multipleOf && value % schema.multipleOf !== 0) {
		done(new Error('Expected ' + path.keys + ' to be a multiple of ' + schema.multipleOf));
		return;
	}
	if (typeof schema.maximum === 'number') {
		if (schema.exclusiveMaximum === true) {
			if (value < schema.maximum) {
				done(new Error('Expected ' + path.keys + ' to be a less than ' + schema.maximum));
				return;
			}
		}
		else {
			if (value <= schema.maximum) {
				done(new Error('Expected ' + path.keys + ' to be a less or equal to ' + schema.maximum));
				return;
			}
		}
	}
	if (typeof schema.minimum === 'number') {
		if (schema.exclusiveMinimum === true) {
			if (value > schema.minimum) {
				done(new Error('Expected ' + path.keys + ' to be a greater than ' + schema.minimum));
				return;
			}
		}
		else {
			if (value >= schema.minimum) {
				done(new Error('Expected ' + path.keys + ' to be a greater or equal to ' + schema.minimum));
				return;
			}
		}
	}
	this.executeValidate(path, value, schema, done);
}
JSONSchema.prototype.validateString = function (path, value, schema, done) {
	if (typeof schema.maxLength === 'number') {
		if (value.length > schema.maxLength) {
			done(new Error('Expected ' + path.keys + ' to have a smaller length than ' + schema.maxLength));
			return;
		}
	}
	if (typeof schema.minLength === 'number') {
		if (value.length < schema.minLength) {
			done(new Error('Expected ' + path.keys + ' to have a larger length than ' + schema.minLength));
			return;
		}
	}
	if (typeof schema.pattern === 'string') {
		if (!new RegExp(schema.pattern).test(value)) {
			done(new Error('Expected ' + path.keys + ' to have a match the pattern ' + schema.pattern));
			return;
		}
	}
	this.executeValidate(path, value, schema, done);
}