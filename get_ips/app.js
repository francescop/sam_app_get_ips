const axios = require('axios');
const url = 'http://checkip.amazonaws.com/';

let response;
let dynamoConnector = require('./dynamoconnector.js');

exports.lambda_handler = async (event, context, callback) => {
    try {
        let ips = await dynamoConnector.getAll(function(err, result) {
            if(err) {
                return []
            } else {
                return result
            }
        })

        const ret = await axios(url);

        var ip = event.requestContext.identity.sourceIp;
        console.log(ip);
        dynamoConnector.addIp(ip);

        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                ips: ips
            })
        }
    }
    catch (err) {
        console.log(err);
        callback(err, null);
    }

    callback(null, response)
};
