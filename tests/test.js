/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-undef */
/* eslint-disable func-style */
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

const Assert = require('assert');
const _ = require('lodash');
const Moment = require('moment');
const Mock = require('node-red-contrib-mock-node');
const NodeRedModule = require('../index.js');

function runBetween(start, end, startOffset, endOffset) {
    const node = Mock(NodeRedModule, {
        startTime: start,
        endTime: end,
        startOffset,
        endOffset,
        lat: 51.33411,
        lon: -0.83716,
        unitTest: true,
    });

    const counts = { o1: 0, o2: 0 };
    node.send = function (msg) {
        if (msg[0]) {
            counts.o1++;
        }

        if (msg[1]) {
            counts.o2++;
        }
    };

    const time = Moment('2016-01-01');

    node.now = function () {
        return time.clone().milliseconds(0);
    };

    for (let i = 0; i < 7 * 24; ++i) {
        time.add(1, 'hour');
        node.emit('input', {});
    }

    counts.status = node.status();
    return counts;
}

describe('time-range-switch', function () {
    it('should execute programmatic configuration', function (done) {
        this.timeout(60000 * 3);
        console.log(`\t[${this.test.title}] will take 120-ish seconds, please wait...`);

        const node = Mock(NodeRedModule, {
            startTime: '12:35:13',
            endTime: 'dusk',
            startOffset: 0,
            endOffset: 0,
            lat: 51.33411,
            lon: -0.83716,
            unitTest: true,
        });

        node.emit('input', {
            __config: {
                startTime: node.now().format('HH:mm'),
                endTime: node.now().add(1, 'minute').format('HH:mm'),
            },
        });
        Assert.strictEqual(node.sent().length, 0);

        node.emit('input', { payload: 'expect output 1' });
        Assert.strictEqual(node.sent().length, 1);
        let expected = [];
        expected[0] = { payload: 'expect output 1' };
        Assert.deepStrictEqual(node.sent(0), expected);

        setTimeout(function () {
            node.emit('input', { payload: 'expect output 2' });
            Assert.strictEqual(node.sent().length, 2);
            expected = [];
            expected[1] = { payload: 'expect output 2' };
            Assert.deepStrictEqual(node.sent(1), expected);
            done();
        }, 122000);
    });
    it('should accept programmatic configuration', function () {
        const config = {
            startTime: '12:35',
            endTime: 'dusk',
            startOffset: 0,
            endOffset: 0,
            lat: 51.33411,
            lon: -0.83716,
            unitTest: true,
        };

        const node = Mock(NodeRedModule, config);

        Assert.deepStrictEqual(node.getConfig(), config);

        node.emit('input', { payload: 'whatevs' });

        Assert.deepStrictEqual(node.getConfig(), config);

        const newConfig = {
            startTime: '13:33',
            endTime: 'night',
            startOffset: 1,
            endOffset: 2,
            lat: 22.33333,
            lon: -0.4589,
            unitTest: true,
        };

        _.forIn(newConfig, (value, key) => {
            config[key] = value;
            node.emit('input', { __config: { [key]: value } });
            Assert.deepStrictEqual(node.getConfig(), config);
        });
    });

    it('should pass message after programmatic configuration', function () {
        const config = {
            startTime: '12:35',
            endTime: 'dusk',
            startOffset: 0,
            endOffset: 0,
            lat: 51.33411,
            lon: -0.83716,
            unitTest: true,
        };

        const node = Mock(NodeRedModule, config);
        node.now = function () {
            return Moment('2021-03-16T23:51:00').milliseconds(0);
        };

        Assert.deepStrictEqual(node.getConfig(), config);

        config.startTime = '14:44';
        node.emit('input', { __config: { startTime: '14:44' } });
        Assert.deepStrictEqual(node.getConfig(), config);

        Assert.strictEqual(node.sent().length, 0);

        config.endTime = '15:55';
        node.emit('input', { __config: { endTime: '15:55' }, payload: 'emit me' });
        Assert.deepStrictEqual(node.getConfig(), config);

        Assert.strictEqual(node.sent().length, 1);
        const expected = [];
        expected[1] = { payload: 'emit me' };
        Assert.deepStrictEqual(node.sent(0), expected);
    });

    // TODO - all these tests should assert the actual times rather than just the counts.
    it('should work between 12:45...02:45', function () {
        const counts = runBetween('12:45', '02:45');
        Assert.strictEqual(98, counts.o1);
        Assert.strictEqual(70, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-07 12:45 - 2016-01-08 02:45');
    });
    it('should work between 01:45...02:45', function () {
        const counts = runBetween('01:45', '02:45');
        Assert.strictEqual(7, counts.o1);
        Assert.strictEqual(161, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-08 01:45 - 2016-01-08 02:45');
    });
    it('should work between 11:45...12:45', function () {
        const counts = runBetween('11:45', '12:45');
        Assert.strictEqual(7, counts.o1);
        Assert.strictEqual(161, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-08 11:45 - 2016-01-08 12:45');
    });
    it('should work between 22:45...01:45', function () {
        const counts = runBetween('22:45', '01:45');
        Assert.strictEqual(21, counts.o1);
        Assert.strictEqual(147, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-07 22:45 - 2016-01-08 01:45');
    });
    it('should work between 06:30...03:30', function () {
        const counts = runBetween('06:30', '03:30');
        Assert.strictEqual(147, counts.o1);
        Assert.strictEqual(21, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-07 06:30 - 2016-01-08 03:30');
    });
    it('should work between dawn...dusk', function () {
        const counts = runBetween('dawn', 'dusk');
        Assert.strictEqual(63, counts.o1);
        Assert.strictEqual(105, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-08 07:28 - 2016-01-08 16:53');
    });
    it('should work between goldenHour...dawn', function () {
        const counts = runBetween('goldenHour', 'dawn');
        Assert.strictEqual(112, counts.o1);
        Assert.strictEqual(56, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-07 15:15 - 2016-01-08 07:28');
    });
    it('should work between 22:45...01:45 with a start offset of 16', function () {
        const counts = runBetween('22:45', '01:45', 16);
        Assert.strictEqual(14, counts.o1);
        Assert.strictEqual(154, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-07 23:01 - 2016-01-08 01:45');
    });
    it('should work between 22:45...01:45 with an end offset of -46', function () {
        const counts = runBetween('22:45', '01:45', 0, -46);
        Assert.strictEqual(14, counts.o1);
        Assert.strictEqual(154, counts.o2);
        Assert.strictEqual(counts.status.text, '2016-01-07 22:45 - 2016-01-08 00:59');
    });
    it('issue 26', function () {
        const invocations = [
            ['2019-10-23 19:29:25', 2],
            ['2019-10-23 20:29:25', 2],
            ['2019-10-23 21:29:25', 2],
            ['2019-10-23 22:29:25', 1],
            ['2019-10-23 23:29:25', 1],
            ['2019-10-24 00:29:25', 1],
            ['2019-10-24 01:29:25', 1],
            ['2019-10-24 02:29:25', 1],
            ['2019-10-24 03:29:25', 1],
            ['2019-10-24 04:29:25', 1],
            ['2019-10-24 05:29:25', 1],
            ['2019-10-24 06:29:25', 2],
            ['2019-10-24 07:29:25', 2],
            ['2019-10-24 08:29:25', 2],
            ['2019-10-24 09:29:25', 2],
            ['2019-10-24 10:29:25', 2],
            ['2019-10-24 11:29:25', 2],
            ['2019-10-24 12:29:25', 2],
            ['2019-10-24 13:29:25', 2],
            ['2019-10-24 14:29:25', 2],
            ['2019-10-24 15:29:25', 2],
            ['2019-10-24 16:29:25', 2],
            ['2019-10-24 17:29:25', 2],
            ['2019-10-24 18:29:25', 2],
        ];

        const node = Mock(NodeRedModule, {
            startTime: '22:00',
            endTime: '06:00',
            lat: 48.2205998,
            lon: 16.239978,
            unitTest: true,
        });

        function findOutput(msgs) {
            if (msgs[0]) {
                return 1;
            }

            if (msgs[1]) {
                return 2;
            }

            throw new Error('No output');
        }

        invocations.forEach(function (invocation, i) {
            const time = Moment(invocation[0]);

            node.now = function () {
                return time.clone();
            };

            node.emit('input', { payload: 'fire' });
            const msgs = node.sent(i);
            const output = findOutput(msgs);
            // console.log(time.toString() + ', output ' + output);
            Assert.strictEqual(invocation[1], output);
        });
    });
});
