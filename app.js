'use strict';
require('dotenv').config()

const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const Protocol = require('azure-iot-device-mqtt').Mqtt;

const connectionString = process.env.DeviceConnectionString;
const client = Client.fromConnectionString(connectionString, Protocol);

let twin;
let sendFrequency = 1000000;
let timer;

client.open(err => {
    if (err) {
        console.error('Could not open IotHub client');
    } else {
        console.log('Client opened');

        client.on('message', msg => {
            console.log('Message received from cloud', msg);
        });

        client.getTwin((err, t) => {
            if (err) {
                console.error('Could not get twin');
            } else {
                twin = t;
                twin.on('properties.desired', delta => {
                    console.log('New desired properties received:', JSON.stringify(delta));
                    if (delta && delta.telemetryConfig && delta.telemetryConfig.sendFrequency) {
                        sendFrequency = delta.telemetryConfig.sendFrequency;
                        console.log('Sending frequency is changed to', sendFrequency);
                        clearInterval(timer);
                        startTimer(sendFrequency);
                    }
                });
                startTimer(sendFrequency);
            }
        });
    }
});

const startTimer = sendFrequency => {
    timer = setInterval(() => {
        const patch = {
            info: {
                type: 'hoge'
            }
        };
        updateTwinReported(patch);

        const message = new Message('Some data from my device');
        sendMessage(message);
    }, sendFrequency);
}

const sendMessage = message => {
    client.sendEvent(message, err => {
        if (err) {
            console.log(err.toString());
        } else {
            console.log('Message sent:', message);
        };
    });
}

const updateTwinReported = patch => {
    twin.properties.reported.update(patch, err => {
        if (err) {
            console.error('Could not update twin');
        } else {
            console.log('Twin reported properties:', patch);
        }
    });
}