# Simply-imitated-SQS-for-testing
Simply imitated SQS for testing

Simple SQS class that can be used for local test.
You do not even need to use Docker.

## install
```
% npm install @abetomo/simply-imitated-sqs
```

## Application example
```javascript
'use strict'

// !!!
// If the value of the environment variable LOCAL_TEST is set,
// it will be tested with SimplyImitatedSQS

const AWS = require('aws-sdk')
const sqs = (() => {
  // !!! If environment variable is set, use SimplyImitatedSQS
  if (process.env.LOCAL_TEST === '1') {
    const SimplyImitatedSQS = require('@abetomo/simply-imitated-sqs')
    return new SimplyImitatedSQS()
  }
  return new AWS.SQS({
    region: 'us-east-1',
    apiVersion: '2012-11-05'
  })
})()

// Once you create the sqs instance, you do not need to modify any other code.
const queueUrl = 'https://sqs.us-east-1.amazonaws.com/xxx/test'

Promise.resolve().then(() => {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: 'hoge' + (new Date()).toString()
  }
  return new Promise(resolve => {
    sqs.sendMessage(params, (err, data) => {
      if (err) console.error(err)
      console.log('+++\n%s\n+++', JSON.stringify(data, null, ' '))
      resolve()
    })
  })
}).then(() => {
  const params = { QueueUrl: queueUrl }
  return new Promise(resolve => {
    sqs.receiveMessage(params, (err, data) => {
      if (err) console.error(err)
      console.log('===\n%s\n===', JSON.stringify(data, null, ' '))
      resolve(data)
    })
  })
}).then(data => {
  const params = {
    QueueUrl: queueUrl,
    ReceiptHandle: data.Messages[0].ReceiptHandle
  }
  return new Promise(resolve => {
    sqs.deleteMessage(params, (err, data) => {
      if (err) console.error(err)
      console.log('---\n%s\n---', JSON.stringify(data, null, ' '))
      resolve()
    })
  })
}).then(() => {
  if (process.env.LOCAL_TEST === '1') {
    // !!! SimplyImitatedSQS creates a file to store the queue, so remove it.
    sqs.clear()
  }
})
```

```
# Access AWS.
% node example.js

# Local Completion Test
% LOCAL_TEST=1 node example.js
```
