'use strict';
require('dotenv').config();

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
        return;
    }

    const printResultFor = op => {
        return (err, res) => {
            if (err) console.log(op + ' error: ' + err.toString());
            if (res) console.log(op + ' status: ' + res.constructor.name);
        };
    };

    // Received message handler
    client.on('message', message => {
        console.log('Message received from cloud:');
        console.log(message.getData().toString('utf-8'));
        client.complete(message, printResultFor('completed'));
        console.log();
    });

    client.getTwin((err, t) => {
        if (err) {
            console.error('Could not get twin');
            return;
        }
        twin = t;

        // Received twin desired property handler
        twin.on('properties.desired', desired => {
            console.log('New desired properties received:');
            console.log(JSON.stringify(desired));
            if (desired && desired.telemetryConfig && desired.telemetryConfig.sendFrequency) {
                sendFrequency = desired.telemetryConfig.sendFrequency;
                console.log('Sending frequency is changed to', sendFrequency);
                clearInterval(timer);
                setSendTimer(sendFrequency);
            }
            console.log();
        });

        // Send message constantly
        setSendTimer(sendFrequency);

        // Send twin
        const reported = {
            connectedSensor: {
                info: '1122334455'
            }
        };
        updateTwinReported(reported);
    });
});

const setSendTimer = sendFrequency => {
    timer = setInterval(() => {
        // Send twin reported update
        const reported = { connectedSensor: { info: '1122334455' } };
        updateTwinReported(reported);

        // Send message to cloud
        const text = JSON.stringify({ text: 'hoge' });
        const message = new Message(text);
        sendMessage(message);
    }, sendFrequency);
};

const sendMessage = message => {
    client.sendEvent(message, err => {
        if (err) {
            console.log(err.toString());
            return;
        }
        console.log('Sending message:', message.data, '\n');
    });
};

const updateTwinReported = patch => {
    twin.properties.reported.update(patch, err => {
        if (err) {
            console.error('Could not update twin');
            return;
        }
        console.log('Updating Twin reported properties:', patch, '\n');
    });
};