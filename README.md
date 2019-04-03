# fake-sqs

Runs a fake SQS server on a HTTP port.

## install
```
% npm install fake-sqs
```

## Example

```js
const assert = require('assert')
const SQSServer = require('fake-sqs').Server
const AWS = require('aws-sdk')

const myServer = new SQSServer()
myServer.run({
  port: 0
}, (err) => {
  if (err) throw err

  const sqs = new AWS.SQS({
    region: 'us-east-1',
    sslEnabled: false,
    accessKeyId: '123',
    secretAccessKey: 'abc',
    apiVersion: '2012-11-05'
  })
  const queueUrl = `http://` + myServer.hostPort
  sqs.sendMessage({
    QueueUrl: queueUrl,
    MessageBody: 'my message'
  }, (err) => {
    if (err) {
      console.log('err', err)
    }
  })

  myServer.waitForMessages(1, () => {
    var queue = myServer.getQueue()

    assert.equal(queue[0].MessageBody, 'my message')
    assert.equal(queue.length, 1)

    myServer.close(done)
  })
})
```
