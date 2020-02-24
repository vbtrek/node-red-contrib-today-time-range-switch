/* eslint-disable max-lines-per-function */
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

module.exports = function(RED) {
    const SunCalc = require('suncalc2');
    const MomentRange = require('moment-range');
    const moment = MomentRange.extendMoment(require('moment'));
    const fmt = 'YYYY-MM-DD HH:mm';

    RED.nodes.registerType('time-range-switch', function(config) {
        RED.nodes.createNode(this, config);

        const momentFor = (time, now) => {
            let m = null;
            const matches = new RegExp(/(\d+):(\d+)/).exec(time);
            if (matches && matches.length) {
                m = now
                    .clone()
                    .hour(matches[1])
                    .minute(matches[2])
                    .second(0);
            } else {
                // Schedex#57 Suncalc appears to give the best results if you
                // calculate at midday.
                const sunDate = now
                    .clone()
                    .hour(12)
                    .minute(0)
                    .second(0)
                    .toDate();
                const sunCalcTimes = SunCalc.getTimes(sunDate, config.lat, config.lon);
                const sunTime = sunCalcTimes[time];
                if (sunTime) {
                    // Schedex#57 Nadir appears to work differently to other sun times
                    // in that it will calculate tomorrow's nadir if the time is
                    // too close to today's nadir. So we just take the time and
                    // apply that to the event's moment. That's doesn't yield a
                    // perfect suntime but it's close enough.
                    m = now
                        .clone()
                        .hour(sunTime.getHours())
                        .minute(sunTime.getMinutes())
                        .second(sunTime.getSeconds());
                }
            }

            if (!m) {
                this.status({ fill: 'red', shape: 'dot', text: `Invalid time: ${time}` });
            }
            return m;
        };

        this.on('input', msg => {
            const now = this.now().milliseconds(0);
            const start = momentFor(config.startTime, now);
            if (config.startOffset) {
                start.add(config.startOffset, 'minutes');
            }
            const end = momentFor(config.endTime, now);
            if (config.endOffset) {
                end.add(config.endOffset, 'minutes');
            }
            // align end to be before AND within 24 hours of start
            while (end.diff(start, 'seconds') < 0) {
                // end before start
                end.add(1, 'day');
            }
            while (end.diff(start, 'seconds') > 86400) {
                // end more than day before start
                end.subtract(1, 'day');
            }
            // move start and end window to be within a day of now
            while (end.diff(now, 'seconds') < 0) {
                // end before now
                start.add(1, 'day');
                end.add(1, 'day');
            }
            while (end.diff(now, 'seconds') > 86400) {
                // end more than day from now
                start.subtract(1, 'day');
                end.subtract(1, 'day');
            }

            const range = moment.range(start, end);
            const output = range.contains(now) ? 1 : 2;
            const msgs = [];
            msgs[output - 1] = msg;
            this.send(msgs);
            this.status({
                fill: 'green',
                shape: output === 1 ? 'dot' : 'ring',
                text: `${start.format(fmt)} - ${end.format(fmt)}`
            });
        });

        this.now = function() {
            return moment();
        };
    });
};
