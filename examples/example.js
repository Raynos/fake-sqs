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

/*
# Access AWS.
% node example.js
+++
{
 "ResponseMetadata": {
  "RequestId": "aaa"
 },
 "MD5OfMessageBody": "8a1d909a4370c22b8302a4f2748089e7",
 "MessageId": "bbb"
}
+++
===
{
 "ResponseMetadata": {
  "RequestId": "ccc"
 },
 "Messages": [
  {
   "MessageId": "ddd",
   "ReceiptHandle": "eee",
   "MD5OfBody": "35f5187169af6201c56bb7a9494102ff",
   "Body": "hogeThu Aug 31 2017 13:49:10 GMT+0900 (JST)"
  }
 ]
}
===
---
{
 "ResponseMetadata": {
  "RequestId": "fff"
 }
}
---
*/

/***********************************************************************************/

/*
# Local Completion Test
% LOCAL_TEST=1 node example.js
+++
{
 "ResponseMetadata": {
  "RequestId": "SimplyImitatedSQS-RequestId"
 },
 "MD5OfMessageBody": "ae4a2d14fb4fa108b2322af5dc0c1dde",
 "MessageId": "SimplyImitatedSQS-MessageId"
}
+++
===
{
 "ResponseMetadata": {
  "RequestId": "SimplyImitatedSQS-RequestId"
 },
 "Messages": [
  {
   "MessageId": "SimplyImitatedSQS-MessageId",
   "ReceiptHandle": "150415524-c223feda-afe1-4053-bb44-b673b89ddabd",
   "MD5OfBody": "ae4a2d14fb4fa108b2322af5dc0c1dde",
   "Body": "hogeThu Aug 31 2017 13:54:00 GMT+0900 (JST)"
  }
 ]
}
===
---
{
 "ResponseMetadata": {
  "RequestId": "SimplyImitatedSQS-RequestId"
 }
}
---
*/
