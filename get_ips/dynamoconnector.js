const AWS = require('aws-sdk');

const awsRegion = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.TABLE_NAME;

const params = {
    region: awsRegion,
    TableName: tableName,
};

if(process.env.AWS_SAM_LOCAL) {
    params.endpoint = 'http://dynamodb:8000';
}

let dynamoDbClient = new AWS.DynamoDB.DocumentClient(params);

// function to add an ip
const addIp = (ip) => {
    params.Item = {
        "ip" : ip
    };

    dynamoDbClient.put(params).promise()
        .catch((err) => { 
            console.log(err) 
        });
};

// api call to retrieve all the ips
const getAll = (callback) => {
    let error = null;
    var ips = dynamoDbClient.scan(params).promise()
        .then((data) => {
            let ipArray = []
            data.Items.forEach(function(item){
                ipArray.push(item.ip)
            })
            return ipArray
        })
        .catch((error) => {
            error = error
            return []
        })

    return callback(error, ips)
};

module.exports = {
    addIp: (ip) => addIp(ip),
    getAll: (callback) => getAll(callback),
};
