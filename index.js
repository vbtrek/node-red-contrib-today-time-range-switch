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

module.exports = function (RED) {
    'use strict';

    var SunCalc = require('suncalc');
    var moment = require('moment');
    require('twix');
    var fmt = 'YYYY-MM-DD HH:mm';

    RED.nodes.registerType('time-range-switch', function (config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.log(JSON.stringify(config, null, 4));

        node.on('input', function (msg) {
            var start = momentFor(config.startTime);
            var end = momentFor(config.endTime);
            var now = node.now();
            if (now.isAfter(start) && end.isBefore(start)) {
                end.add(1, 'day');
            } else if (now.isBefore(end) && start.isAfter(end)) {
                start.subtract(1, 'day');
            }
            var range = moment.twix(start, end);
            if (range.contains(now)) {
                node.log(now.format(fmt) + ' - output 1');
                node.send([msg, null]);
            } else {
                node.log(now.format(fmt) + ' - output 2');
                node.send([null, msg]);
            }
            if (range.isPast()) {
                // start.add(1, 'day');
                // end.add(1, 'day');
            }
            node.status({
                text: ' START ' + start.format(fmt) + ' END ' + end.format(fmt)
            });
        });

        function momentFor(time) {
            var m, matches = new RegExp(/(\d+):(\d+)/).exec(time);
            if (matches && matches.length) {
                m = node.now().hour(matches[1]).minute(matches[2]);
            } else {
                var sunCalcTimes = SunCalc.getTimes(new Date(), config.lat, config.lon);
                var date = sunCalcTimes[time];
                if (date) {
                    m = moment(date);
                }
            }
            if (m) {
                m.seconds(0);
            } else {
                node.status({fill: 'red', shape: 'dot', text: 'Invalid time: ' + time});
            }
            return m;
        }

        this.now = function() {
            return moment();
        }
    });
};