'use strict'

/**
 * MIDI Schow Control over Ethernet for MA lighting
 * @module mamsc
 * @license
 * Copyright (C) 2018 Christian Volmering <christian@volmering.name>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

if (require('semver').satisfies(process.version, '>=7.0.0')) {
  module.exports = require('./lib/mamsc.es6')
} else {
  module.exports = require('./lib/mamsc.babel')
}