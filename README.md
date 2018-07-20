# ip list lamda

This is a simple lambda that shows the ips of the visitors.
It is based on the following technologies:

* [AWS Api Gateway](https://aws.amazon.com/api-gateway/)
* [AWS Lambda](https://aws.amazon.com/lambda/)
* [AWS DynamoDB](https://aws.amazon.com/dynamodb/)

The whole project has been created using [aws sam cli](https://github.com/awslabs/aws-sam-cli).

```bash
.
├── README.md                   <-- This instructions file
├── get_ips                     <-- Source code for a lambda function
│   ├── app.js                  <-- Lambda function code
│   ├── dynamoconnector.js      <-- Module that interacts with DynamoDB
│   ├── package.json            <-- NodeJS dependencies
│   └── tests                   <-- Unit tests
│       └── unit
│           └── test_handler.js
└── template.yaml               <-- SAM template
```

## Requirements

* AWS CLI already configured with at least PowerUser permission
* [NodeJS 8.10+ installed](https://nodejs.org/en/download/)
* [Docker installed](https://www.docker.com/community-edition)

## Setup process

### Installing dependencies

In this example we use `npm` but you can use `yarn` if you prefer to manage NodeJS dependencies:

```bash
cd get_ips
npm install
cd ../
```

### Local development

In order to test dynamodb with your locally executed lambda you have to run a dynamodb container in such a way that's reachable by the container the lambda runs on.

Given that containers should run in the same network, we will create a new docker network named, for example, `aws`

```bash
docker network create aws
```

Run the dynamodb docker container

```bash
docker run --network aws -d -v "$PWD":/dynamodb_local_db -p 8000:8000 --name dynamodb cnadiminti/dynamodb-local
```

Create the `test-ips` table on the local dynamodb container

```bash
aws dynamodb create-table \
      --endpoint-url http://localhost:8000 \
      --table-name test-ips \
      --attribute-definitions AttributeName=id,AttributeType=S \
      --key-schema AttributeName=id,KeyType=HASH \
      --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
      --region us-east-1
```

**Invoking function locally through local API Gateway** on our new docker network

```bash
sam local start-api --docker-network aws
```

If the previous command ran successfully you should now be able to hit the following local endpoint to invoke your function `http://localhost:3000/`

Check the dynamodb table, your local ip should have been saved

```bash
aws dynamodb scan --table-name test-ips --region us-east-1 --endpoint http://localhost:8000
```

**SAM CLI** is used to emulate both Lambda and API Gateway locally and uses our `template.yaml` to understand how to bootstrap this environment (runtime, where the source code is, etc.) - The following excerpt is what the CLI will read in order to initialize an API and its routes:

```yaml
...
Events:
    ApiProxy:
        Type: Api # More info about API Event Source: https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#api
        Properties:
            Path: /
            Method: get
```

## Packaging and deployment

AWS Lambda NodeJS runtime requires a flat folder with all dependencies including the application. SAM will use `CodeUri` property to know where to look up for both application and dependencies:

```yaml
...
    FirstFunction:
        Type: AWS::Serverless::Function
        Properties:
            CodeUri: get_ips/
            ...
```

Firstly, we need a `S3 bucket` where we can upload our Lambda functions packaged as ZIP before we deploy anything - If you don't have a S3 bucket to store code artifacts then this is a good time to create one:

```bash
aws s3 mb s3://BUCKET_NAME
```

Next, run the following command to package our Lambda function to S3:

```bash
sam package \
    --template-file template.yaml \
    --output-template-file packaged.yaml \
    --s3-bucket REPLACE_THIS_WITH_YOUR_S3_BUCKET_NAME
```

Next, the following command will create a Cloudformation Stack and deploy your SAM resources.

```bash
sam deploy \
    --template-file packaged.yaml \
    --stack-name sam-app \
    --capabilities CAPABILITY_IAM
```

> **See [Serverless Application Model (SAM) HOWTO Guide](https://github.com/awslabs/serverless-application-model/blob/master/HOWTO.md) for more details in how to get started.**

After deployment is complete you can run the following command to retrieve the API Gateway Endpoint URL:

```bash
aws cloudformation describe-stacks \
    --stack-name sam-app \
    --query 'Stacks[].Outputs'
``` 

## Testing

We use `jest` for testing our code and it is already added in `package.json` under `scripts`, so that we can simply run the following command to run our tests:

```bash
cd get_ips
npm run test
```

# Appendix

## AWS CLI commands

AWS CLI commands to package, deploy and describe outputs defined within the cloudformation stack:

```bash
sam package \
    --template-file template.yaml \
    --output-template-file packaged.yaml \
    --s3-bucket REPLACE_THIS_WITH_YOUR_S3_BUCKET_NAME

sam deploy \
    --template-file packaged.yaml \
    --stack-name sam-app \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides MyParameterSample=MySampleValue

aws cloudformation describe-stacks \
    --stack-name sam-app --query 'Stacks[].Outputs'
```

**NOTE**: Alternatively this could be part of package.json scripts section.
