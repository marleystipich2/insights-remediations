'use strict';

require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const uuid = require('uuid');

const app = require('../app');
const config = require('../config');
const vmaas = require('../connectors/vmaas');
const identityUtils = require('../middleware/identity/utils');
const USERS = require('../../src/connectors/users/mock').MOCK_USERS;
const request = require('../util/request');
const RequestError = require('request-promise-core/errors').RequestError;

// because some VMaaS tests take a long time to finish
// eslint-disable-next-line no-process-env
jest.setTimeout(parseInt(process.env.TEST_TIMEOUT) || 20000);

let server;

beforeAll(async () => {
    server = await app.start();
});

beforeEach(() => {
    exports.sandbox = sinon.createSandbox();
});

exports.getSandbox = () => exports.sandbox;

exports.mockDate = () => exports.sandbox.stub(Date.prototype, 'toUTCString').returns('Sat, 29 Dec 2018 08:20:35 GMT');

afterEach(() => {
    exports.sandbox.restore();
    delete exports.sandbox;
});

afterAll(async () => {
    if (server) {
        await server.stop();
    }
});

exports.request = supertest.agent(`http://localhost:${config.port}${config.path.base}`);
exports.requestLegacy = supertest.agent(`http://localhost:${config.port}/r/insights/platform/remediations`);

function createHeader (id, account_number, internal) {
    return {
        [identityUtils.IDENTITY_HEADER]: identityUtils.createIdentityHeader(String(id), account_number, internal)
    };
}

exports.auth = Object.freeze({
    default: createHeader(),
    emptyInternal: createHeader('test01User', 'test01'),
    emptyCustomer: createHeader('test02User', 'test02', false),
    testWrite: createHeader(USERS.testWriteUser.username, USERS.testWriteUser.account_number, false),
    testReadSingle: createHeader(USERS.testReadSingleUser.username, USERS.testReadSingleUser.account_number, false),
    testStatus: createHeader(USERS.testStatus.username, USERS.testStatus.account_number, false),
    cert01: {
        [identityUtils.IDENTITY_HEADER]: identityUtils.createCertIdentityHeader('diagnosis01')
    }
});

exports.mockVmaas = function () {
    exports.sandbox.stub(vmaas, 'getErratum').callsFake(() => ({ synopsis: 'mock synopsis' }));
};

exports.throw404 = () => {
    const error =  new Error();
    error.name === 'StatusCodeError';
    error.statusCode === 404;
    throw new error;
};

exports.reqId = () => {
    const id = uuid.v4();

    return {
        header: {
            'x-rh-insights-request-id': id
        },
        id
    };
};

exports.mockRequestError = function (options = {}, response = {}) {
    exports.sandbox.stub(request, 'run').rejects(new RequestError('RequestError', options, response));
};

exports.mockRequestStatusCode = function (statusCode = 500) {
    exports.sandbox.stub(request, 'run').resolves({ statusCode });
};
