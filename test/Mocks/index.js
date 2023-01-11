/* eslint-disable no-underscore-dangle,max-classes-per-file */
class Request {
}

class Response {
    constructor() {
        this._headers = {};
        this._data = '';
    }

    setHeader(name, value) {
        this._headers[name] = value;
    }

    // eslint-disable-next-line no-unused-vars
    end(data, encoding) {
        this._data += data;
        if (this.done) { this.done(); }
    }
}

module.exports = { Request, Response };
