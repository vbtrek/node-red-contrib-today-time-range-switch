## Time Range Switch

A simple Node-RED node that routes messages depending on the time. If the current time falls within the range specified
in the node configuration, the message is routed to output 1. Otherwise the message is routed to output 2.


### Installation
 
Change directory to your node red installation:

    $ npm install node-red-contrib-time-range-switch
 
### Configuration 
    
The times can be a 24 hour time or a [suncalc](https://github.com/mourner/suncalc) event:


| Time        | Description                                                              |
| --------------- | ------------------------------------------------------------------------ |
| `00:00 ... 23:59` | 24hr time in hours and minutes                                   |
| `00:00:03 ... 23:59:13` | 24hr time in hours minutes and seconds                     |
| `sunrise`       | sunrise (top edge of the sun appears on the horizon)                     |
| `sunriseEnd`    | sunrise ends (bottom edge of the sun touches the horizon)                |
| `goldenHourEnd` | morning golden hour (soft light, best time for photography) ends         |
| `solarNoon`     | solar noon (sun is in the highest position)                              |
| `goldenHour`    | evening golden hour starts                                               |
| `sunsetStart`   | sunset starts (bottom edge of the sun touches the horizon)               |
| `sunset`        | sunset (sun disappears below the horizon, evening civil twilight starts) |
| `dusk`          | dusk (evening nautical twilight starts)                                  |
| `nauticalDusk`  | nautical dusk (evening astronomical twilight starts)                     |
| `night`         | night starts (dark enough for astronomical observations)                 |
| `nadir`         | nadir (darkest moment of the night, sun is in the lowest position)       |
| `nightEnd`      | night ends (morning astronomical twilight starts)                        |
| `nauticalDawn`  | nautical dawn (morning nautical twilight starts)                         |
| `dawn`          | dawn (morning nautical twilight ends, morning civil twilight starts)     |

### Offsets


The start and end time can have an offset. This is specified in minutes:
- -ve number brings the time forward. E.g. if the time is dusk and offset is -60, the start time will be 60 minutes before dusk.
- +ve number delays the time by the specified number of minutes

### Programmatic Configuration

This node can be controlled programmatically by sending configuration settings to the node input.

**It is very important to note that properties set programmatically in this manner are transient. They will not persist over a NodeRED restart or redeploy!**

E.g. send the following to the input:
```javascript
    msg.__config = {
        startTime: '12:35',
        endTime: 'dusk',
        startOffset: 0,
        endOffset: 0,
        lat: 51.33411,
        lon: -0.83716
    }
```

You can send any combination of those configuration properties. For example, you might just want to set `startTime` and `endTime`, so you only include those properties in the configuration object.

If you send a message to the input with only the __config object included, the node will consume the message and emit no output. 

If you send a message to the input with the __config object included and/or a payload/topic, the node will firstly process the __config object, remove it from the message and allow the remainder of the message to be emitted as per the configured rules.
