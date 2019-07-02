# fake-sqs

Runs a fake SQS server on a HTTP port.

## Example

```js
const assert = require('assert')
const SQSServer = require('fake-sqs')
const AWS = require('aws-sdk')

async function test() {
  const myServer = new SQSServer({
    port: 0
  })

  await myServer.bootstrap()

  const sqs = new AWS.SQS({
    region: 'us-east-1',
    sslEnabled: false,
    accessKeyId: '123',
    secretAccessKey: 'abc',
    apiVersion: '2012-11-05'
  })
  const queueUrl = `http://` + myServer.hostPort

  await sqs.sendMessage({
    QueueURL: queueUrl,
    MessageBody: 'my message'
  }).promise()

  await myServer.waitForMessages(1)

  var queue = myServer.getQueue()

  assert.equal(queue[0].MessageBody, 'my message')
  assert.equal(queue.length, 1)

  await myServer.close()
}

process.on('unhandledReject', (err) => { throw err })
test()
```

## Docs :

### `const server = new SQSServer(opts)`

Create a fake SQS server

- `opts.port` ; defaults to 0

### `await server.bootstrap()`

Starts the server.

After bootstrap returns you can read `server.hostPort` to get
the actual listening port of the server.

### `server.getQueue()`

Returns the current array of items queued in SQS. These are shaped
like aws SQS objects.

### `await server.waitForMessages(count)`

Get notified once N messages have in total been sent to this fake SQS.

### `await server.waitForDeletes(count)`

Get notified once N messages have in total been deleted from
this fake SQS.

### `await server.waitForFlush()`

Get notified when the number of pending messages in the SQS
queue is zero.

This can be used with `waitForMessages()` to first wait for N
messages to be send and then wait for them to have been received
and deleted from the queue.

### `await server.close()`

Closes the underlying http server.


## install

```
% npm install fake-sqs
```
