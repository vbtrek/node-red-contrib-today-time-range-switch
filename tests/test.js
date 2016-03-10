/**
 The MIT License (MIT)

 Copyright (c) 2016 @biddster

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

"use strict";
var assert = require('assert');
var moment = require('moment');

function loadNode(config, redModule) {
    var _events = [], _status = undefined, _error = undefined, _messages = [];
    var RED = {
        nodes: {
            registerType: function (nodeName, nodeConfigFunc) {
                this.nodeConfigFunc = nodeConfigFunc;
            },
            createNode: function () {
            }
        },
        on: function (event, eventFunc) {
            _events[event] = eventFunc;
        },
        emit: function (event, data) {
            _events[event](data);
        },
        error: function (error) {
            if (error) _error = error;
            return _error;
        },
        status: function (status) {
            if (status) _status = status;
            return _status;
        },
        log: function () {
            console.log.apply(this, arguments);
        },
        send: function (msg) {
            assert(msg);
            _messages.push(msg);
        },
        messages: function (messages) {
            if (messages) _messages = messages;
            return _messages;
        }
    };
    redModule(RED);
    RED.nodes.nodeConfigFunc.call(RED, config);
    return RED;
}


var nodeRedModule = require('../index.js');


describe('time-range-swithc', function () {
    it('should schedule initially', function () {
        var node = loadNode({
            startTime: '23:45',
            endTime: '13:45',
            lat: 51.33411,
            lon: -0.83716,
            unitTest: true
        }, nodeRedModule);

        var o1 = 0, o2 = 0;
        node.send = function (msg) {
            if (msg[0]) o1++;
            if (msg[1]) o2++;
        };

        var time = moment('2016-01-01');

        node.now = function () {
            return time.clone();
        };

        for (var i = 0; i < 48; ++i) {
            time.add(1, 'hour');
            console.log(time.toISOString());
            node.emit('input', {});
        }

        console.log(o1);
        console.log(o2);

        // assert.strictEqual(2881, node.messages().length);
    });
});
