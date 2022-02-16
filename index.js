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

module.exports = function (RED) {
    const SunCalc = require('suncalc2');
    const MomentRange = require('moment-range');
    const _ = require('lodash');

    const Moment = MomentRange.extendMoment(require('moment'));
    const fmt = 'YYYY-MM-DD HH:mm';

    const configuration = Object.freeze({
        startTime: String,
        startOffset: Number,
        endTime: String,
        endOffset: Number,
        lon: Number,
        lat: Number,
    });

    RED.nodes.registerType('time-range-switch', function (config) {
        RED.nodes.createNode(this, config);

        const momentFor = (time, now) => {
            let m = null;
            const matches = new RegExp(/(\d+):(\d+)/).exec(time);
            if (matches && matches.length) {
                m = now.clone().hour(matches[1]).minute(matches[2]).second(0);
            } else {
                // Schedex#57 Suncalc appears to give the best results if you
                // calculate at midday.
                const sunDate = now.clone().hour(12).minute(0).second(0).toDate();
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

        const calculateStartAndEnd = (now) => {
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

            return { start, end };
        };

        const setInitialStatus = () => {
            const { start, end } = calculateStartAndEnd(this.now());
            this.status({
                fill: 'yellow',
                shape: 'dot',
                text: `${start.format(fmt)} - ${end.format(fmt)}`,
            });
        };

        this.on('input', (msg) => {
            if (msg.__config) {
                _.forIn(configuration, (typeConverter, prop) => {
                    if (Object.prototype.hasOwnProperty.call(msg.__config, prop)) {
                        config[prop] = typeConverter(msg.__config[prop]);
                    }
                });

                delete msg.__config;

                // Now try to work out if there was anything in the msg
                // other that the standard _msgid. If there is, we'll
                // send the message. Otherwise, we assume that the msg
                // was solely intended for us to change the configuration.
                const keys = _.without(Object.keys(msg), '_msgid');
                if (keys.length === 0) {
                    setInitialStatus();
                    return;
                }
            }

            const now = this.now();
            const { start, end } = calculateStartAndEnd(now);
            const range = Moment.range(start, end);
            const output = range.contains(now, { excludeEnd: true; }) ? 1 : 2;
            const msgs = [];
            msgs[output - 1] = msg;
            this.send(msgs);

            this.status({
                fill: 'green',
                shape: output === 1 ? 'dot' : 'ring',
                text: `${start.format(fmt)} - ${end.format(fmt)}`,
            });
        });

        this.now = function () {
            return Moment().milliseconds(0);
        };

        this.getConfig = function () {
            return config;
        };

        setInitialStatus();
    });
};
