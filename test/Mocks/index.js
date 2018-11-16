function Request() {
}

function Response() {
	this._headers = {};
	this._data = '';
}

Response.prototype.setHeader = function(name, value) {
	this._headers[name] = value;
};

Response.prototype.end = function(data, encoding) {
	this._data += data;
	if (this.done) { this.done(); }
};

module.exports ={Request, Response}