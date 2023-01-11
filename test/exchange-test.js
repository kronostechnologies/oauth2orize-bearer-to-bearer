/* eslint-disable no-underscore-dangle */
const chai = require('chai');
const sinonChai = require('sinon-chai');
const TokenError = require('oauth2orize/lib/errors/tokenerror');
const bearerToBearer = require('../lib/oauth2orize-bearer-to-bearer').Exchange;
const mock = require('./Mocks');

chai.use(sinonChai);
const { expect } = chai;

let bearerToBearerExchange;
let req;
let res;

function setUpBearerToBearerExchangeMiddleware(options, issue) {
    bearerToBearerExchange = bearerToBearer(issue, options);
}

function getDefaultIssueFunction() {
    return (client, scope, jwt, done) => {
        if (client.id === 'c123' && jwt === 'header.claimSet.signature') {
            return done(null, 's3cr1t');
        }
        return done(new Error('something is wrong'));
    };
}

function getIssueReturningRefreshTokenFunction() {
    return (client, scope, jwt, done) => {
        if (client.id === 'c123' && jwt === 'header.claimSet.signature') {
            return done(null, 's3cr1t', 'R3fr3SHs3cr1t');
        }
        return done(new Error('something is wrong'));
    };
}

function getIssueMergingCustomParamsFunction(params) {
    return (client, scope, jwt, done) => {
        if (client.id === 'c123' && jwt === 'header.claimSet.signature') {
            return done(null, 's3cr1t', null, params);
        }
        return done(new Error('something is wrong'));
    };
}

describe('exchange middleware', () => {
    it('should return a function', () => {
        const jwtBearerFunction = bearerToBearer(() => {
        });
        expect(jwtBearerFunction).to.be.a('Function');
    });

    describe('Request Validation', () => {
        beforeEach(() => {
            res = new mock.Response();
            setUpBearerToBearerExchangeMiddleware({}, getDefaultIssueFunction());
        });

        it('Should throw TokenError if no assertion is found', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = {};

            function next(err) {
                expect(err).to.be.an.instanceof(TokenError);
                expect(err.status).to.equal(400);
                expect(err.code).to.eql('invalid_request');
                expect(err.message).to.eql('missing assertion parameter');
                done();
            }

            bearerToBearerExchange(req, res, next);
        });

        it('Should throw TokenError if scope parameter is not a string', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = { assertion: 'header.claimSet.signature', scope: {} };

            function next(err) {
                expect(err).to.be.an.instanceof(TokenError);
                expect(err.status).to.equal(400);
                expect(err.code).to.eql('invalid_request');
                expect(err.message).to.eql('Invalid parameter: scope must be a string');
                done();
            }

            bearerToBearerExchange(req, res, next);
        });

        it('Should use userProperty configuration to get client', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.userOptional = { id: 'c12345', name: 'Example Optional' };
            req.body = { assertion: 'header.claimSet.signature' };

            setUpBearerToBearerExchangeMiddleware({}, (client) => {
                expect(client).to.deep.equal({ id: 'c123', name: 'Example' });
                return done();
            });

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('Should modify userProperty configuration from options to get client', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.userOptional = { id: 'c12345', name: 'Example Optional' };
            req.body = { assertion: 'header.claimSet.signature' };

            setUpBearerToBearerExchangeMiddleware({ userProperty: 'userOptional' }, (client) => {
                expect(client).to.deep.equal({ id: 'c12345', name: 'Example Optional' });
                done();
            });

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('Should use scopeSeparator configuration to split scope', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = { assertion: 'header.claimSet.signature', scope: 'scope1:read scope2:write scope3' };

            setUpBearerToBearerExchangeMiddleware({}, (client, scope) => {
                expect(scope).to.deep.equal(['scope1:read', 'scope2:write', 'scope3']);
                done();
            });

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('Should use scopeSeparator configuration to split scope', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = { assertion: 'header.claimSet.signature', scope: 'scope1:read.scope2:write.scope3' };

            setUpBearerToBearerExchangeMiddleware({ scopeSeparator: ':' }, (client, scope) => {
                expect(scope).to.deep.equal(['scope1', 'read.scope2', 'write.scope3']);
                done();
            });

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('Should send empty array if no scope is in body', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = { assertion: 'header.claimSet.signature' };

            setUpBearerToBearerExchangeMiddleware({ scopeSeparator: ':' }, (client, scope) => {
                expect(scope).to.deep.equal([]);
                done();
            });

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('Should send empty array if scope is an empty string', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = { assertion: 'header.claimSet.signature', scope: '' };

            setUpBearerToBearerExchangeMiddleware({ scopeSeparator: ':' }, (client, scope) => {
                // eslint-disable-next-line no-unused-expressions
                expect(scope).to.be.empty;
                done();
            });

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('Should give back assertion as is from body', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = { assertion: 'header.claimSet.signature' };

            setUpBearerToBearerExchangeMiddleware({}, (client, scope, assertion) => {
                expect(assertion).to.equal('header.claimSet.signature');
                done();
            });

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });
    });

    describe('Response', () => {
        beforeEach(() => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = { assertion: 'header.claimSet.signature' };

            res = new mock.Response();

            setUpBearerToBearerExchangeMiddleware({}, getDefaultIssueFunction());
        });

        it('Should not send response if error is sent to issued function', (done) => {
            req = new mock.Request();
            req.user = { id: 'c123', name: 'Example' };
            req.body = {};

            res.end = () => {
                done(new Error('Shouldn\'t have call end() of response'));
            };

            function next(err) {
                expect(err).to.be.an.instanceof(Error);
                done();
            }

            bearerToBearerExchange(req, res, next);
        });

        it('should set Content-Type header to application/json', (done) => {
            res.end = () => {
                expect(res._headers['Content-Type']).to.eql('application/json');
                done();
            };

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('should set Cache-Control header to no-store', (done) => {
            res.end = () => {
                expect(res._headers['Cache-Control']).to.eql('no-store');
                done();
            };

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('should set Pragma header to no-cache', (done) => {
            res.end = () => {
                expect(res._headers.Pragma).to.eql('no-cache');
                done();
            };

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('should set access token in response', (done) => {
            res.done = () => {
                expect(res._data).to.eql('{"access_token":"s3cr1t","token_type":"Bearer"}');
                done();
            };

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('should set refresh token in response', (done) => {
            setUpBearerToBearerExchangeMiddleware({}, getIssueReturningRefreshTokenFunction());
            res.done = () => {
                expect(res._data).to.eql(
                    '{"access_token":"s3cr1t","refresh_token":"R3fr3SHs3cr1t","token_type":"Bearer"}',
                );
                done();
            };

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('should merge custom params in response', (done) => {
            setUpBearerToBearerExchangeMiddleware({}, getIssueMergingCustomParamsFunction({ test: 'testValue' }));
            res.done = () => {
                expect(res._data).to.eql('{"access_token":"s3cr1t","test":"testValue","token_type":"Bearer"}');
                done();
            };

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });

        it('should overwrite params while merging custom params in response', (done) => {
            setUpBearerToBearerExchangeMiddleware({}, getIssueMergingCustomParamsFunction({
                access_token: 'overwrite.access.token',
                test: 'testValue',
            }));
            res.done = () => {
                expect(res._data).to.eql(
                    '{"access_token":"overwrite.access.token","test":"testValue","token_type":"Bearer"}',
                );
                done();
            };

            bearerToBearerExchange(req, res, (err) => { if (err) done(err); });
        });
    });
});
