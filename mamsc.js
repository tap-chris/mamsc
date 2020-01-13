'use strict'

/**
 * MIDI Schow Control over Ethernet for MA lighting
 * @module mamsc
 * @license
 * Copyright (C) 2018 Christian Volmering <christian@volmering.name>
 * Licensed under the MIT and GPL-3.0 licenses.
 */

if (require('semver').satisfies(process.version, '>=7.0.0')) {
  module.exports = require('./lib/mamsc.es6')
} else {
  module.exports = require('./lib/mamsc.babel')
}
