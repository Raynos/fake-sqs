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

## Docs :

### `const server = new SQSServer()`

Create a fake SQS server

### `server.run(opts, cb)`

 - `opts.port` ; defaults to 0
 - `opts.host` ; defaults to `localhost`

Starts the server. `cb` get's called once listening on a port.

### `server.getQueue()`

Returns the current array of items queued in SQS. These are shaped
like aws SQS objects.

### `server.waitForMessages(count, listener)`

Get notified once N messages have in total been sent to this fake SQS.

`listener` is called once.

### `server.waitForFlush(listener)`

Get notified when the number of pending messages in the SQS
queue is zero.

This can be used with `waitForMessages()` to first wait for N
messages to be send and then wait for them to have been received
and deleted from the queue.

`listener` is called once.

### `server.close(cb)`

Closes the underlying http server.
