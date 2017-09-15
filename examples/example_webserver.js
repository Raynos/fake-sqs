'use strict'

// !!!
// If the value of the environment variable LOCAL_TEST is set,
// it will be tested with SimplyImitatedSQS

const AWS = require('aws-sdk')
const sqs = new AWS.SQS({
  region: 'us-east-1',
  apiVersion: '2012-11-05'
})

// Existing code remains the same except booting the server
// and reassigning the `queueUrl`.
const server = new (require('@abetomo/simply-imitated-sqs').Server)()
var queueUrl = 'https://sqs.us-east-1.amazonaws.com/xxx/test'
if (process.env.LOCAL_TEST === '1') {
  /// !!! Server start and `queueUrl` reassignment
  queueUrl = server.run()
}

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
    // !!! Finally shutdown the server
    console.log('server shutdown')
    server.close()
  }
})
