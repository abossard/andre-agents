/**
 * Test setup — registers a mock for the 'vscode' module so that
 * compiled extension code can be required in plain Node.js.
 */
'use strict';

const Module = require('module');
const path = require('path');

const vscodeMock = require('./vscode-mock');

// Intercept require('vscode') to return our mock
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'vscode') {
    return require.resolve('./vscode-mock');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

module.exports = { vscodeMock };
