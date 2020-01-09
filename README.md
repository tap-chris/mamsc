# mamsc
*MIDI Schow Control over Ethernet for MA lighting*

This is an implementation of the MIDI Show Control protocol used by MA lighting.
While initially developed for the dot2 lineup it also works for grandMA with
some slight differences which are documented below.

## Limitations
MIDI Show Control inherited some of the limitations of MIDI. While the protocol
is specific to MA lighting control equipment it still has some limitations.
Executor numbers for example are `7 bit`. This means that the highest executor
value available is `127`. Macro numbers can in fact be `8 bit`.

If you are using dot2 you will be limited to the main executor and executors on
the first page. Additionally this implementation is limited to the command
format: `All`.

## Note
While this implementation was initially written for the dot2, it also works for
the grandMA. There are a few differences though. Executor `0` is used for the
main executor on the dot2. If you are using grandMA, executor `0` is actually
the first executor. So numbering of the executors for the grandMA is zero based.

Another important thing to note is that this implementation swaps the executor
and page numbers. While you see fader `1.2` (page 1, exec 2) being sent from the
console it will arive as `2.1`. The reason for this is that the page number is
optional or even useless on dot2 and so you can just drop the fraction.

## Console/onPC configuration
You are required to set the MIDI Show Control mode to `Ethernet`, exec to
`Exec.Page` and the command format to `All`. The rest of the configuration
depends on your needs. In and out ports need to be between `6000` and `6100`
as per the MA documentation and shouldn't be the same to prevent loops.
MIDI channels are ignored when mode is set to `Ethernet`.

## Installation
```sh
$ npm install mamsc --save
```

## API Reference

* [mamsc](#module_mamsc)
    * _static_
        * [.in(port, [address], [type])](#module_mamsc.in) ⇒ [<code>Receiver</code>](#module_mamsc..Receiver)
        * [.out(port, [address], [type])](#module_mamsc.out) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
    * _inner_
        * [~Receiver](#module_mamsc..Receiver) ⇐ [<code>EventEmitter</code>](http://nodejs.org/api/events.html)
            * [.config](#module_mamsc..Receiver+config) : <code>Object</code>
            * [.close()](#module_mamsc..Receiver+close) ⇒ [<code>Receiver</code>](#module_mamsc..Receiver)
            * ["error" (err)](#module_mamsc..Receiver+event_error)
            * ["message" (command, data)](#module_mamsc..Receiver+event_message)
            * ["goto" (cue, exec, [fade])](#module_mamsc..Receiver+event_goto)
            * ["pause" (exec)](#module_mamsc..Receiver+event_pause)
            * ["resume" (exec)](#module_mamsc..Receiver+event_resume)
            * ["fader" (position, exec, [fade])](#module_mamsc..Receiver+event_fader)
            * ["off" (exec)](#module_mamsc..Receiver+event_off)
        * [~Transmitter](#module_mamsc..Transmitter) ⇐ [<code>EventEmitter</code>](http://nodejs.org/api/events.html)
            * [.config](#module_mamsc..Transmitter+config) : <code>Object</code>
            * [.send(command, data)](#module_mamsc..Transmitter+send) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
            * [.goto(cue, [exec], [fade])](#module_mamsc..Transmitter+goto) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
            * [.pause([exec])](#module_mamsc..Transmitter+pause) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
            * [.resume([exec])](#module_mamsc..Transmitter+resume) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
            * [.fader(position, [exec], [fade])](#module_mamsc..Transmitter+fader) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
            * [.fire(macro)](#module_mamsc..Transmitter+fire) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
            * [.off([exec])](#module_mamsc..Transmitter+off) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
            * ["error" (err)](#module_mamsc..Transmitter+event_error)

<a name="module_mamsc.in"></a>

### mamsc.in(port, [address], [type]) ⇒ [<code>Receiver</code>](#module_mamsc..Receiver)
Create a new MIDI Show Control over Ethernet Receiver.The port needs to be between `6000` and `6100` as per the documentation. Ifno address is defined, the socket is bound to all interfaces.

**Kind**: static method of [<code>mamsc</code>](#module_mamsc)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| port | <code>Number</code> |  | Port to listen for incoming messages on (needs to be between `6000` and `6100`) |
| [address] | <code>String</code> | <code>&#x27;0.0.0.0&#x27;</code> | Address to listen for incoming messages on |
| [type] | <code>String</code> | <code>&#x27;udp4&#x27;</code> | The socket family: Either `'udp4'` or `'udp6'` |

**Example**  
```js
// Create a new receiver and receive MSC on port 6004 on all interfacesconst receiver = require('mamsc').in(6004)
```
<a name="module_mamsc.out"></a>

### mamsc.out(port, [address], [type]) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
Create a new MIDI Show Control over Ethernet Transmitter.The port needs to be between `6000` and `6100` as per the documentation. Ifno address is defined, we brodcast to the local network.

**Kind**: static method of [<code>mamsc</code>](#module_mamsc)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| port | <code>Number</code> |  | Destination port (needs to be between `6000` and `6100`) |
| [address] | <code>String</code> | <code>&#x27;255.255.255.255&#x27;</code> | Destination hostname or IP address |
| [type] | <code>String</code> | <code>&#x27;udp4&#x27;</code> | The socket family: Either `'udp4'` or `'udp6'` |

**Example**  
```js
// Create a new transmitter and brodcast MSC to port 6005 on the local networkconst transmitter = require('mamsc').out(6005)
```
<a name="module_mamsc..Receiver"></a>

### mamsc~Receiver ⇐ [<code>EventEmitter</code>](http://nodejs.org/api/events.html)
MIDI Show Control over Ethernet Receiver

**Kind**: inner class of [<code>mamsc</code>](#module_mamsc)  
**Extends**: [<code>EventEmitter</code>](http://nodejs.org/api/events.html)  
**Emits**: [<code>error</code>](#module_mamsc..Receiver+event_error), [<code>message</code>](#module_mamsc..Receiver+event_message), [<code>goto</code>](#module_mamsc..Receiver+event_goto), [<code>pause</code>](#module_mamsc..Receiver+event_pause), [<code>resume</code>](#module_mamsc..Receiver+event_resume), [<code>fader</code>](#module_mamsc..Receiver+event_fader), [<code>off</code>](#module_mamsc..Receiver+event_off)  

* [~Receiver](#module_mamsc..Receiver) ⇐ [<code>EventEmitter</code>](http://nodejs.org/api/events.html)
    * [.config](#module_mamsc..Receiver+config) : <code>Object</code>
    * [.close()](#module_mamsc..Receiver+close) ⇒ [<code>Receiver</code>](#module_mamsc..Receiver)
    * ["error" (err)](#module_mamsc..Receiver+event_error)
    * ["message" (command, data)](#module_mamsc..Receiver+event_message)
    * ["goto" (cue, exec, [fade])](#module_mamsc..Receiver+event_goto)
    * ["pause" (exec)](#module_mamsc..Receiver+event_pause)
    * ["resume" (exec)](#module_mamsc..Receiver+event_resume)
    * ["fader" (position, exec, [fade])](#module_mamsc..Receiver+event_fader)
    * ["off" (exec)](#module_mamsc..Receiver+event_off)

<a name="module_mamsc..Receiver+config"></a>

#### receiver.config : <code>Object</code>
**Kind**: instance property of [<code>Receiver</code>](#module_mamsc..Receiver)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [deviceId] | <code>Number</code> | <code>1</code> | Set this to a value between `0` and `111` to only listen for messages received for this device ID. We'll still react on messages send to everyone. |
| [groupId] | <code>Number</code> | <code>1</code> | Set this to a value between `1` and `15` to only listen for messages received for this group ID. We'll still react on messages send to everyone. |

<a name="module_mamsc..Receiver+close"></a>

#### receiver.close() ⇒ [<code>Receiver</code>](#module_mamsc..Receiver)
Close the socket and stop listening for incoming messages.

**Kind**: instance method of [<code>Receiver</code>](#module_mamsc..Receiver)  
<a name="module_mamsc..Receiver+event_error"></a>

#### "error" (err)
Emitted whenever an error accurs within the receiver. This could be eithersocket errors or errors from the protocol parser.

**Kind**: event emitted by [<code>Receiver</code>](#module_mamsc..Receiver)  

| Param | Type | Description |
| --- | --- | --- |
| err | [<code>Error</code>](https://nodejs.org/api/errors.html) | The error which occurred |

<a name="module_mamsc..Receiver+event_message"></a>

#### "message" (command, data)
This is a general message event if you want to listen for all commands.

**Kind**: event emitted by [<code>Receiver</code>](#module_mamsc..Receiver)  

| Param | Type | Description |
| --- | --- | --- |
| command | <code>String</code> | The type of message received |
| data | <code>Object</code> | Depends on the message type. See the individual events for details |

**Example**  
```js
// Create a new receiver and list for MSC on port 6001const msc = require('mamsc').in(6001)// Listen for all but the error events and log them to the consolemsc.on('message', (command, data) => { console.log(command, data) })
```
<a name="module_mamsc..Receiver+event_goto"></a>

#### "goto" (cue, exec, [fade])
Emitted if a Goto command is executed.

**Kind**: event emitted by [<code>Receiver</code>](#module_mamsc..Receiver)  

| Param | Type | Description |
| --- | --- | --- |
| cue | <code>Number</code> | Cue Number |
| exec | <code>Number</code> | Executor Number |
| [fade] | <code>Number</code> | Optional fade time |

<a name="module_mamsc..Receiver+event_pause"></a>

#### "pause" (exec)
Emitted if a cue is paused.

**Kind**: event emitted by [<code>Receiver</code>](#module_mamsc..Receiver)  

| Param | Type | Description |
| --- | --- | --- |
| exec | <code>Number</code> | Executor Number |

<a name="module_mamsc..Receiver+event_resume"></a>

#### "resume" (exec)
Emitted if a paused cue is continued.

**Kind**: event emitted by [<code>Receiver</code>](#module_mamsc..Receiver)  

| Param | Type | Description |
| --- | --- | --- |
| exec | <code>Number</code> | Executor Number |

<a name="module_mamsc..Receiver+event_fader"></a>

#### "fader" (position, exec, [fade])
Emitted if a fader changed its position. The console only transmits theposition of some faders.

**Kind**: event emitted by [<code>Receiver</code>](#module_mamsc..Receiver)  

| Param | Type | Description |
| --- | --- | --- |
| position | <code>Object</code> |  |
| position.value | <code>Number</code> | Position value `[0..128²-1]` |
| position.percent | <code>Number</code> | Position of the fader as percentage |
| exec | <code>Number</code> | Executor Number |
| [fade] | <code>Number</code> | Optional fade time |

<a name="module_mamsc..Receiver+event_off"></a>

#### "off" (exec)
Emitted if a executor is switched off.

**Kind**: event emitted by [<code>Receiver</code>](#module_mamsc..Receiver)  

| Param | Type | Description |
| --- | --- | --- |
| exec | <code>Number</code> | Executor Number |

<a name="module_mamsc..Transmitter"></a>

### mamsc~Transmitter ⇐ [<code>EventEmitter</code>](http://nodejs.org/api/events.html)
MIDI Show Control over Ethernet Transmitter

**Kind**: inner class of [<code>mamsc</code>](#module_mamsc)  
**Extends**: [<code>EventEmitter</code>](http://nodejs.org/api/events.html)  
**Emits**: [<code>error</code>](#module_mamsc..Transmitter+event_error)  

* [~Transmitter](#module_mamsc..Transmitter) ⇐ [<code>EventEmitter</code>](http://nodejs.org/api/events.html)
    * [.config](#module_mamsc..Transmitter+config) : <code>Object</code>
    * [.send(command, data)](#module_mamsc..Transmitter+send) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
    * [.goto(cue, [exec], [fade])](#module_mamsc..Transmitter+goto) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
    * [.pause([exec])](#module_mamsc..Transmitter+pause) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
    * [.resume([exec])](#module_mamsc..Transmitter+resume) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
    * [.fader(position, [exec], [fade])](#module_mamsc..Transmitter+fader) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
    * [.fire(macro)](#module_mamsc..Transmitter+fire) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
    * [.off([exec])](#module_mamsc..Transmitter+off) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
    * ["error" (err)](#module_mamsc..Transmitter+event_error)

<a name="module_mamsc..Transmitter+config"></a>

#### transmitter.config : <code>Object</code>
**Kind**: instance property of [<code>Transmitter</code>](#module_mamsc..Transmitter)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [deviceId] | <code>Number</code> | <code>1</code> | Set this to a value between `0` and `111` to restrict messages to a device and set sendTo to `'device'` |
| [groupId] | <code>Number</code> | <code>1</code> | Set this to a value between `1` and `15` to restrict messages to a group and set sendTo to `'group'` |
| [sendTo] | <code>String</code> | <code>&#x27;all&#x27;</code> | If you want to restrict who should react on messages send you can set this to either `'device'` and set the deviceId or `'group'` and set the groupId accordingly. By default it is set to `'all'` so everyone will react on messages. |

<a name="module_mamsc..Transmitter+send"></a>

#### transmitter.send(command, data) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
Sends one of the defined commands by name. The command name is identicalto the function name. Lookup the parameters for the command at eachfunction definition.

**Kind**: instance method of [<code>Transmitter</code>](#module_mamsc..Transmitter)  
**Throws**:

- [<code>Error</code>](https://nodejs.org/api/errors.html) 


| Param | Type | Description |
| --- | --- | --- |
| command | <code>String</code> | Command to be send |
| data | <code>Object</code> | Parameters for the command |

**Example**  
```js
// Create a new transmitter and brodcast MSC to port 6100const msc = require('mamsc').out(6100)// Set fader position of executor 12 on page 1 to 42%msc.send('fader', { position: 42, exec: 12 })// Goto cue Number 8.100 on the default executor with a fade time of 5 secondsmsc.send('goto', { cue: 8.100, fade: 5 })
```
<a name="module_mamsc..Transmitter+goto"></a>

#### transmitter.goto(cue, [exec], [fade]) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
Goto a specific cue. If you don't define an executor then the mainexecutor is assumed. An optional fade time can be defined in seconds.

**Kind**: instance method of [<code>Transmitter</code>](#module_mamsc..Transmitter)  
**Throws**:

- [<code>Error</code>](https://nodejs.org/api/errors.html) 


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| cue | <code>Number</code> |  | Cue Number |
| [exec] | <code>Number</code> | <code>main</code> | Executor Number |
| [fade] | <code>Number</code> | <code>no fade</code> | Optional fade time in seconds |

**Example**  
```js
// Create a new transmitter and send MSC to 10.6.7.2 port 6008const msc = require('mamsc').out(6008, '10.6.7.2')// Goto cue Number 4.000 on executor 7, page 1msc.goto(4.000, 7.1)
```
<a name="module_mamsc..Transmitter+pause"></a>

#### transmitter.pause([exec]) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
Pause an executor. If you don't define an executor then the mainexecutor is assumed.

**Kind**: instance method of [<code>Transmitter</code>](#module_mamsc..Transmitter)  
**Throws**:

- [<code>Error</code>](https://nodejs.org/api/errors.html) 


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [exec] | <code>Number</code> | <code>main</code> | Executor Number |

<a name="module_mamsc..Transmitter+resume"></a>

#### transmitter.resume([exec]) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
Resume an executor. If you don't define an executor then the mainexecutor is assumed.

**Kind**: instance method of [<code>Transmitter</code>](#module_mamsc..Transmitter)  
**Throws**:

- [<code>Error</code>](https://nodejs.org/api/errors.html) 


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [exec] | <code>Number</code> | <code>main</code> | Executor Number |

<a name="module_mamsc..Transmitter+fader"></a>

#### transmitter.fader(position, [exec], [fade]) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
Move a fader to a specific position. You can either set it by percentageor using a value between `0` and `128²-1`. If you pass a Number, percentageis used. If you don't define an executor then the main executor isassumed. An optional fade time can be defined in seconds.

**Kind**: instance method of [<code>Transmitter</code>](#module_mamsc..Transmitter)  
**Throws**:

- [<code>Error</code>](https://nodejs.org/api/errors.html) 


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| position | <code>Number</code> \| <code>Object</code> |  | Pass a Number to set the position by percentage or an Object with one of the following properties: |
| position.percent | <code>Number</code> |  | Position of the fader as percentage |
| position.value | <code>Number</code> |  | Position of the fader using a value between `0` and `128²-1` |
| [exec] | <code>Number</code> | <code>main</code> | Executor Number |
| [fade] | <code>Number</code> | <code>no fade</code> | Optional fade time |

**Example**  
```js
// Create a new transmitter and bordcast MSC to port 6004 on network 10.6.7.xconst msc = require('mamsc').out(6004, '10.6.7.255')// Set fader position of executor 3 on page 1 to 50%msc.fader(50, 3.1)// Set fader position of executor 8 on page 1 to 50% with a fade time of 10 secondsmsc.fader({ value: 0x1fff }, 8, 10)
```
<a name="module_mamsc..Transmitter+fire"></a>

#### transmitter.fire(macro) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
Fire a macro.

**Kind**: instance method of [<code>Transmitter</code>](#module_mamsc..Transmitter)  
**Throws**:

- [<code>Error</code>](https://nodejs.org/api/errors.html) 


| Param | Type | Description |
| --- | --- | --- |
| macro | <code>Number</code> | Macro number between `1` and `255`. |

<a name="module_mamsc..Transmitter+off"></a>

#### transmitter.off([exec]) ⇒ [<code>Transmitter</code>](#module_mamsc..Transmitter)
Switch an executor off. If you don't define an executor then the mainexecutor is assumed.

**Kind**: instance method of [<code>Transmitter</code>](#module_mamsc..Transmitter)  
**Throws**:

- [<code>Error</code>](https://nodejs.org/api/errors.html) 


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [exec] | <code>Number</code> | <code>main</code> | Executor Number |

<a name="module_mamsc..Transmitter+event_error"></a>

#### "error" (err)
Emitted whenever an error accurs within the transmitter. This is usually asocket error. User input errors are thrown and not emitted.

**Kind**: event emitted by [<code>Transmitter</code>](#module_mamsc..Transmitter)  

| Param | Type | Description |
| --- | --- | --- |
| err | [<code>Error</code>](https://nodejs.org/api/errors.html) | The error which occurred |


* * *

&copy; 2018 Christian Volmering &lt;christian@volmering.name&gt;
