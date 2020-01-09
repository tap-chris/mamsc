'use strict';
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

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var EventEmitter = require('events');

var dgram = require('dgram');

var MSG_ID = 0x474d4100;
var MSG_TYPE = 0x4d534300;
var MSG_RTSE = 0xf07f;
var MSG_MSC = 0x02;
var MSG_EOX = 0xf7;
var MSG_ALL = 0x7f;
var socketPool = new WeakMap();
var Command = Object.freeze({
  GO: 0x01,
  STOP: 0x02,
  RESUME: 0x03,
  TIMED: 0x04,
  SET: 0x06,
  FIRE: 0x07,
  OFF: 0x0a
});

var Message =
/*#__PURE__*/
function () {
  function Message(command, data, config) {
    (0, _classCallCheck2["default"])(this, Message);
    this.command = command || 'noop';
    this.data = data || {};

    if (!config) {
      this.target = MSG_ALL;
    } else {
      this.setTarget(config);
    }
  }

  (0, _createClass2["default"])(Message, [{
    key: "checkTarget",
    value: function checkTarget(config) {
      return this.target === MSG_ALL || this.target === config.deviceId || this.target === config.groupId + 0x6f;
    }
  }, {
    key: "setTarget",
    value: function setTarget(config) {
      switch (config.sendTo) {
        case 'all':
          this.target = MSG_ALL;
          break;

        case 'device':
          this.target = config.deviceId;
          break;

        case 'group':
          this.target = config.groupId + 0x6f;
          break;

        default:
          throw new Error('Invalid target: ' + config.sendTo);
      }
    }
  }, {
    key: "readHeader",
    value: function readHeader(buffer) {
      if (MSG_ID !== buffer.readInt32BE(0x00) || MSG_TYPE !== buffer.readInt32BE(0x04)) {
        throw new Error('Message has no MA signature');
      }

      if (MSG_RTSE !== buffer.readUInt16BE(0x0c)) {
        throw new Error('Invalid SysEx header');
      }

      if (MSG_MSC !== buffer.readUInt8(0x0f)) {
        throw new Error('Not a MIDI Show Control message');
      }

      if (MSG_ALL !== buffer.readUInt8(0x10)) {
        throw new Error('Unsupported command format');
      }

      this.target = buffer.readUInt8(0x0e);
      return {
        length: buffer.readInt32LE(0x08),
        command: buffer.readUInt8(0x11)
      };
    }
  }, {
    key: "readFadeTime",
    value: function readFadeTime(buffer, offset) {
      var hour = buffer.readUInt8(offset);
      var minute = buffer.readUInt8(++offset);
      var second = buffer.readUInt8(++offset);
      var frame = buffer.readUInt8(++offset);
      return hour * 3600 + minute * 60 + second + frame / 24;
    }
  }, {
    key: "readExec",
    value: function readExec(buffer, length, timed) {
      var data = buffer.toString('ascii', timed ? 0x17 : 0x12, length - 1).split('\0');
      this.data.exec = Number((--data[1]).toFixed(3));

      if (data[0]) {
        this.data.cue = Number(data[0]);
      }

      if (timed) {
        this.data.fade = this.readFadeTime(buffer, 0x12);
      }

      return this;
    }
  }, {
    key: "readFader",
    value: function readFader(buffer) {
      var fine = buffer.readUInt8(0x14);
      var coarse = buffer.readUInt8(0x15);
      var value = coarse * 128 + fine;
      this.data.position = {
        percent: Number((100 / 0x3fff * value).toFixed(2)),
        value: value
      };
      this.data.exec = Number(buffer.readUInt8(0x12) + '.' + buffer.readUInt8(0x13));

      if (MSG_EOX !== buffer.readUInt8(0x16)) {
        this.data.fade = this.readFadeTime(buffer, 0x16);
      }

      return this;
    }
  }, {
    key: "readBuffer",
    value: function readBuffer(buffer) {
      var _this$readHeader = this.readHeader(buffer),
          length = _this$readHeader.length,
          command = _this$readHeader.command;

      if (MSG_EOX !== buffer.readUInt8(length - 1)) {
        throw new Error('Invalid message length');
      }

      switch (command) {
        case Command.GO:
          this.command = 'goto';
          return this.readExec(buffer, length);

        case Command.STOP:
          this.command = 'pause';
          return this.readExec(buffer, length);

        case Command.RESUME:
          this.command = 'resume';
          return this.readExec(buffer, length);

        case Command.TIMED:
          this.command = 'goto';
          return this.readExec(buffer, length, true);

        case Command.SET:
          this.command = 'fader';
          return this.readFader(buffer);

        case Command.OFF:
          this.command = 'off';
          return this.readExec(buffer, length);

        default:
          throw new Error('Invalid or unsupported command: 0x' + Number(command).toString(16));
      }
    }
  }, {
    key: "writeHeader",
    value: function writeHeader(buffer, length, command) {
      buffer.writeInt32BE(MSG_ID, 0x00);
      buffer.writeInt32BE(MSG_TYPE, 0x04);
      buffer.writeInt32LE(length, 0x08);
      buffer.writeUInt16BE(MSG_RTSE, 0x0c);
      buffer.writeUInt8(this.target, 0x0e);
      buffer.writeUInt8(MSG_MSC, 0x0f);
      buffer.writeUInt8(MSG_ALL, 0x10);
      buffer.writeUInt8(command, 0x11);
    }
  }, {
    key: "writeFadeTime",
    value: function writeFadeTime(buffer, offset, time) {
      var hour = time / 3600;
      var minute = hour % 1 * 60;
      var second = minute % 1 * 60;
      buffer.writeUInt8(Math.trunc(hour), offset);
      buffer.writeUInt8(Math.trunc(minute), ++offset);
      buffer.writeUInt8(Math.trunc(second), ++offset);
      buffer.writeUInt16BE(0, ++offset);
      return ++offset;
    }
  }, {
    key: "writeExec",
    value: function writeExec(buffer, command) {
      var exec = Number(this.data.exec || 0);
      var offset = 0x12;

      if (this.data.fade) {
        offset = this.writeFadeTime(buffer, offset, this.data.fade) + 1;
      }

      offset += buffer.write((this.data.cue || 0).toFixed(3), offset);
      offset += buffer.write((exec + 1).toFixed() + '.' + (exec % 1 || 1), ++offset);
      buffer.writeUInt8(MSG_EOX, ++offset);
      this.writeHeader(buffer, offset, command);
      return buffer.slice(0, ++offset);
    }
  }, {
    key: "writeFader",
    value: function writeFader(buffer) {
      var _this$data$position = this.data.position,
          _this$data$position$p = _this$data$position.percent,
          percent = _this$data$position$p === void 0 ? this.data.position || 0 : _this$data$position$p,
          value = _this$data$position.value;
      var coarse = (value >= 0 ? value : 0x3fff / 100 * percent) / 128;
      var fine = coarse % 1 * 128;
      var exec = Number(this.data.exec || 0);
      buffer.writeUInt8(exec.toFixed(), 0x12);
      buffer.writeUInt8(exec % 1 || 1, 0x13);
      buffer.writeUInt8(Math.trunc(fine), 0x14);
      buffer.writeUInt8(Math.trunc(coarse), 0x15);
      var offset = 0x16;

      if (this.data.fade) {
        offset = this.writeFadeTime(buffer, offset, this.data.fade);
      }

      buffer.writeUInt8(MSG_EOX, ++offset);
      this.writeHeader(buffer, offset, Command.SET);
      return buffer.slice(0, ++offset);
    }
  }, {
    key: "writeFire",
    value: function writeFire(buffer) {
      var macro = Number(this.data.macro || 0);
      buffer.writeUInt8(macro.toFixed(), 0x12);
      buffer.writeUInt8(MSG_EOX, 0x13);
      this.writeHeader(buffer, 0x13, Command.FIRE);
      return buffer.slice(0, 0x14);
    }
  }, {
    key: "writeBuffer",
    value: function writeBuffer() {
      var buffer = Buffer.alloc(64, 0);

      switch (this.command) {
        case 'goto':
          return this.writeExec(buffer, this.data.fade ? Command.TIMED : Command.GO);

        case 'pause':
          return this.writeExec(buffer, Command.STOP);

        case 'resume':
          return this.writeExec(buffer, Command.RESUME);

        case 'fader':
          return this.writeFader(buffer);

        case 'fire':
          return this.writeFire(buffer);

        case 'off':
          return this.writeExec(buffer, Command.OFF);

        default:
          throw new Error('Invalid or unsupported command: ' + this.command);
      }
    }
  }], [{
    key: "fromBuffer",
    value: function fromBuffer(buffer) {
      return new Message().readBuffer(buffer);
    }
  }, {
    key: "toBuffer",
    value: function toBuffer(command, data, config) {
      return new Message(command, data, config).writeBuffer();
    }
  }]);
  return Message;
}();
/**
 * MIDI Show Control over Ethernet Receiver
 * @extends external:EventEmitter
 * @emits module:mamsc~Receiver#event:error
 * @emits module:mamsc~Receiver#event:message
 * @emits module:mamsc~Receiver#event:goto
 * @emits module:mamsc~Receiver#event:pause
 * @emits module:mamsc~Receiver#event:resume
 * @emits module:mamsc~Receiver#event:fader
 * @emits module:mamsc~Receiver#event:off
 * @hideconstructor
 */


var Receiver =
/*#__PURE__*/
function (_EventEmitter) {
  (0, _inherits2["default"])(Receiver, _EventEmitter);

  function Receiver(port, address, type) {
    var _this;

    (0, _classCallCheck2["default"])(this, Receiver);
    _this = (0, _possibleConstructorReturn2["default"])(this, (0, _getPrototypeOf2["default"])(Receiver).call(this));
    /**
     * @type {Object}
     * @property {Number} [deviceId=1] - Set this to a value between `0` and
     * `111` to only listen for messages received for this device ID. We'll
     * still react on messages send to everyone.
     * @property {Number} [groupId=1] - Set this to a value between `1` and `15`
     * to only listen for messages received for this group ID. We'll still
     * react on messages send to everyone.
     */

    _this.config = {
      deviceId: 1,
      groupId: 1
    };
    socketPool.set((0, _assertThisInitialized2["default"])(_this), dgram.createSocket({
      type: type || 'udp4',
      reuseAddr: true
    }).on('error', function (err) {
      _this.emit('error', err);

      _this.close();
    }).on('message', function (buffer) {
      try {
        var msg = Message.fromBuffer(buffer);

        if (msg.checkTarget(_this.config)) {
          (function (_ref) {
            var _this2;

            var command = _ref.command,
                data = _ref.data;

            _this.emit('message', command, data);

            (_this2 = _this).emit.apply(_this2, [command].concat((0, _toConsumableArray2["default"])(Object.values(data))));
          })(msg);
        }
      } catch (err) {
        _this.emit('error', err);
      }
    }).bind(port, address));
    return _this;
  }
  /**
   * Close the socket and stop listening for incoming messages.
   * @returns {module:mamsc~Receiver}
   */


  (0, _createClass2["default"])(Receiver, [{
    key: "close",
    value: function close() {
      socketPool.get(this).close();
      return this;
    }
  }]);
  return Receiver;
}(EventEmitter);
/**
 * Emitted whenever an error accurs within the receiver. This could be either
 * socket errors or errors from the protocol parser.
 * @event module:mamsc~Receiver#error
 * @param {external:Error} err - The error which occurred
 */

/**
 * This is a general message event if you want to listen for all commands.
 * @event module:mamsc~Receiver#message
 * @param {String} command - The type of message received
 * @param {Object} data - Depends on the message type. See the individual events
 * for details
 * @example
 * // Create a new receiver and list for MSC on port 6001
 * const msc = require('mamsc').in(6001)
 *
 * // Listen for all but the error events and log them to the console
 * msc.on('message', (command, data) => { console.log(command, data) })
 */

/**
 * Emitted if a Goto command is executed.
 * @event module:mamsc~Receiver#goto
 * @param {Number} cue - Cue Number
 * @param {Number} exec - Executor Number
 * @param {Number} [fade] - Optional fade time
 */

/**
 * Emitted if a cue is paused.
 * @event module:mamsc~Receiver#pause
 * @param {Number} exec - Executor Number
 */

/**
 * Emitted if a paused cue is continued.
 * @event module:mamsc~Receiver#resume
 * @param {Number} exec - Executor Number
 */

/**
 * Emitted if a fader changed its position. The console only transmits the
 * position of some faders.
 * @event module:mamsc~Receiver#fader
 * @param {Object} position
 * @param {Number} position.value - Position value `[0..128²-1]`
 * @param {Number} position.percent - Position of the fader as percentage
 * @param {Number} exec - Executor Number
 * @param {Number} [fade] - Optional fade time
 */

/**
 * Emitted if a executor is switched off.
 * @event module:mamsc~Receiver#off
 * @param {Number} exec - Executor Number
 */

/**
 * MIDI Show Control over Ethernet Transmitter
 * @extends external:EventEmitter
 * @emits module:mamsc~Transmitter#event:error
 * @hideconstructor
 */


var Transmitter =
/*#__PURE__*/
function (_EventEmitter2) {
  (0, _inherits2["default"])(Transmitter, _EventEmitter2);

  function Transmitter(port, address, type) {
    var _this3;

    (0, _classCallCheck2["default"])(this, Transmitter);
    _this3 = (0, _possibleConstructorReturn2["default"])(this, (0, _getPrototypeOf2["default"])(Transmitter).call(this));
    /**
     * @type {Object}
     * @property {Number} [deviceId=1] - Set this to a value between `0` and
     * `111` to restrict messages to a device and set sendTo to `'device'`
     * @property {Number} [groupId=1] - Set this to a value between `1` and `15`
     * to restrict messages to a group and set sendTo to `'group'`
     * @property {String} [sendTo='all'] - If you want to restrict who should
     * react on messages send you can set this to either `'device'` and set the
     * deviceId or `'group'` and set the groupId accordingly. By default it is
     * set to `'all'` so everyone will react on messages.
     */

    _this3.config = {
      deviceId: 1,
      groupId: 1,
      sendTo: 'all'
    };
    var target = address || '255.255.255.255';
    var socket = dgram.createSocket({
      type: type || 'udp4',
      reuseAddr: true
    }).on('error', function (err) {
      _this3.emit('error', err);
    }).on('listening', function () {
      socket.setBroadcast(target.endsWith('255'));
    }).unref();

    socket.sendBuffer = function (buffer) {
      return socket.send(buffer, 0, buffer.length, port, target);
    };

    socket.sendMessage = function (command, data) {
      return socket.sendBuffer(Message.toBuffer(command, data, _this3.config));
    };

    socketPool.set((0, _assertThisInitialized2["default"])(_this3), socket);
    return _this3;
  }
  /**
   * Sends one of the defined commands by name. The command name is identical
   * to the function name. Lookup the parameters for the command at each
   * function definition.
   * @param {String} command - Command to be send
   * @param {Object} data - Parameters for the command
   * @returns {module:mamsc~Transmitter}
   * @throws {external:Error}
   * @example
   * // Create a new transmitter and brodcast MSC to port 6100
   * const msc = require('mamsc').out(6100)
   *
   * // Set fader position of executor 12 on page 1 to 42%
   * msc.send('fader', { position: 42, exec: 12 })
   *
   * // Goto cue Number 8.100 on the default executor with a fade time of 5 seconds
   * msc.send('goto', { cue: 8.100, fade: 5 })
   */


  (0, _createClass2["default"])(Transmitter, [{
    key: "send",
    value: function send(command, data) {
      socketPool.get(this).sendMessage(command, data || {});
      return this;
    }
    /**
     * Goto a specific cue. If you don't define an executor then the main
     * executor is assumed. An optional fade time can be defined in seconds.
     * @param {Number} cue - Cue Number
     * @param {Number} [exec=main] - Executor Number
     * @param {Number} [fade=no fade] - Optional fade time in seconds
     * @returns {module:mamsc~Transmitter}
     * @throws {external:Error}
     * @example
     * // Create a new transmitter and send MSC to 10.6.7.2 port 6008
     * const msc = require('mamsc').out(6008, '10.6.7.2')
     *
     * // Goto cue Number 4.000 on executor 7, page 1
     * msc.goto(4.000, 7.1)
     */

  }, {
    key: "goto",
    value: function goto(cue, exec, fade) {
      return this.send('goto', {
        cue: cue,
        exec: exec,
        fade: fade
      });
    }
    /**
     * Pause an executor. If you don't define an executor then the main
     * executor is assumed.
     * @param {Number} [exec=main] - Executor Number
     * @returns {module:mamsc~Transmitter}
     * @throws {external:Error}
     */

  }, {
    key: "pause",
    value: function pause(exec) {
      return this.send('pause', {
        exec: exec
      });
    }
    /**
     * Resume an executor. If you don't define an executor then the main
     * executor is assumed.
     * @param {Number} [exec=main] - Executor Number
     * @returns {module:mamsc~Transmitter}
     * @throws {external:Error}
     */

  }, {
    key: "resume",
    value: function resume(exec) {
      return this.send('resume', {
        exec: exec
      });
    }
    /**
     * Move a fader to a specific position. You can either set it by percentage
     * or using a value between `0` and `128²-1`. If you pass a Number, percentage
     * is used. If you don't define an executor then the main executor is
     * assumed. An optional fade time can be defined in seconds.
     * @param {(Number|Object)} position - Pass a Number to set the position by
     * percentage or an Object with one of the following properties:
     * @param {Number} position.percent - Position of the fader as percentage
     * @param {Number} position.value - Position of the fader using a value
     * between `0` and `128²-1`
     * @param {Number} [exec=main] - Executor Number
     * @param {Number} [fade=no fade] - Optional fade time
     * @returns {module:mamsc~Transmitter}
     * @throws {external:Error}
     * @example
     * // Create a new transmitter and bordcast MSC to port 6004 on network 10.6.7.x
     * const msc = require('mamsc').out(6004, '10.6.7.255')
     *
     * // Set fader position of executor 3 on page 1 to 50%
     * msc.fader(50, 3.1)
     *
     * // Set fader position of executor 8 on page 1 to 50% with a fade time of 10 seconds
     * msc.fader({ value: 0x1fff }, 8, 10)
     */

  }, {
    key: "fader",
    value: function fader(position, exec, fade) {
      return this.send('fader', {
        position: position,
        exec: exec,
        fade: fade
      });
    }
    /**
     * Fire a macro.
     * @param {Number} - Macro number between `1` and `255`.
     * @returns {module:mamsc~Transmitter}
     * @throws {external:Error}
     */

  }, {
    key: "fire",
    value: function fire(macro) {
      return this.send('fire', {
        macro: macro
      });
    }
    /**
     * Switch an executor off. If you don't define an executor then the main
     * executor is assumed.
     * @param {Number} [exec=main] - Executor Number
     * @returns {module:mamsc~Transmitter}
     * @throws {external:Error}
     */

  }, {
    key: "off",
    value: function off(exec) {
      return this.send('off', {
        exec: exec
      });
    }
  }]);
  return Transmitter;
}(EventEmitter);
/**
 * Emitted whenever an error accurs within the transmitter. This is usually a
 * socket error. User input errors are thrown and not emitted.
 * @event module:mamsc~Transmitter#error
 * @param {external:Error} err - The error which occurred
 */

/**
 * Create a new MIDI Show Control over Ethernet Receiver.
 * The port needs to be between `6000` and `6100` as per the documentation. If
 * no address is defined, the socket is bound to all interfaces.
 * @param {Number} port - Port to listen for incoming messages on
 * (needs to be between `6000` and `6100`)
 * @param {String} [address='0.0.0.0'] - Address to listen for incoming
 * messages on
 * @param {String} [type='udp4'] The socket family: Either `'udp4'` or `'udp6'`
 * @returns {module:mamsc~Receiver}
 * @example
 * // Create a new receiver and receive MSC on port 6004 on all interfaces
 * const receiver = require('mamsc').in(6004)
 */


module.exports["in"] = function (port, address, type) {
  return new Receiver(port, address, type);
};
/**
 * Create a new MIDI Show Control over Ethernet Transmitter.
 * The port needs to be between `6000` and `6100` as per the documentation. If
 * no address is defined, we brodcast to the local network.
 * @param {Number} port - Destination port (needs to be between `6000` and `6100`)
 * @param {String} [address='255.255.255.255'] - Destination hostname or IP address
 * @param {String} [type='udp4'] The socket family: Either `'udp4'` or `'udp6'`
 * @returns {module:mamsc~Transmitter}
 * @example
 * // Create a new transmitter and brodcast MSC to port 6005 on the local network
 * const transmitter = require('mamsc').out(6005)
 */


module.exports.out = function (port, address, type) {
  return new Transmitter(port, address, type);
};
/**
 * @external EventEmitter
 * @see http://nodejs.org/api/events.html
 */

/**
 * @external Error
 * @see https://nodejs.org/api/errors.html
 */
