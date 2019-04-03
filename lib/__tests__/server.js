'use strict'

const AWS = require('aws-sdk')
const SimplyImitatedSQSHttpServer = require('../server')

/* global describe, test, expect, beforeEach, afterEach */
describe('web server', () => {
  let server = null
  beforeEach(() => {
    server = new SimplyImitatedSQSHttpServer()
  })
  afterEach(() => server.sqs.clear())

  test('server is instanceOf SimplyImitatedSQSHttpServer', () => {
    expect(server).toBeInstanceOf(SimplyImitatedSQSHttpServer)
  })

  describe('SendMessage()', () => {
    const params = { MessageBody: 'hoge' }
    const expected = `<SendMessageResponse>
      <SendMessageResult>
        <MD5OfMessageBody>ea703e7aa1efda0064eaa507d9e8ab7e</MD5OfMessageBody>
        <MessageId>SimplyImitatedSQS-MessageId</MessageId>
      </SendMessageResult>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </SendMessageResponse>`

    test('XML is returned', () => {
      expect(server.SendMessage(params)).toBe(expected)
    })
  })

  describe('SendMessageBatch()', () => {
    const params = {
      QueueUrl: 'QueueUrl',
      'SendMessageBatchRequestEntry.1.Id': 'a',
      'SendMessageBatchRequestEntry.1.MessageBody': '1',
      'SendMessageBatchRequestEntry.2.Id': 'b',
      'SendMessageBatchRequestEntry.2.MessageBody': '2'
    }
    const expected = `<SendMessageBatchResponse>
      <SendMessageBatchResult>
        <SendMessageBatchResultEntry>
          <Id>entry.Id</Id>
          <MessageId>SimplyImitatedSQS-MessageId-0</MessageId>
          <MD5OfMessageBody>c4ca4238a0b923820dcc509a6f75849b</MD5OfMessageBody>
        </SendMessageBatchResultEntry>

        <SendMessageBatchResultEntry>
          <Id>entry.Id</Id>
          <MessageId>SimplyImitatedSQS-MessageId-1</MessageId>
          <MD5OfMessageBody>c81e728d9d4c2f636f067f89cc14862c</MD5OfMessageBody>
        </SendMessageBatchResultEntry>
      </SendMessageBatchResult>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </SendMessageBatchResponse>`

    test('XML is returned', () => {
      expect(server.SendMessageBatch(params)).toBe(expected)
    })
  })

  describe('ReceiveMessage()', () => {
    const expected = (receiptHandle) => {
      return `<ReceiveMessageResponse>
      <ReceiveMessageResult>
        <Message>
          <MessageId>SimplyImitatedSQS-MessageId</MessageId>
          <ReceiptHandle>${receiptHandle}</ReceiptHandle>
          <MD5OfBody>ea703e7aa1efda0064eaa507d9e8ab7e</MD5OfBody>
          <Body>hoge</Body>
        </Message>
      </ReceiveMessageResult>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </ReceiveMessageResponse>`
    }

    test('XML is returned', () => {
      const receiptHandle = server.sqs.vsq.send({ MessageBody: 'hoge' })
      expect(server.ReceiveMessage({})).toBe(expected(receiptHandle))
    })
  })

  describe('DeleteMessage()', () => {
    const expected = `<DeleteMessageResponse>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </DeleteMessageResponse>`

    test('XML is returned', () => {
      expect(server.DeleteMessage({})).toBe(expected)
    })
  })

  describe('run()', () => {
    test('calling out to fake SQS with aws', (done) => {
      const myServer = new SimplyImitatedSQSHttpServer()
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
          // cb not optional lol wtf
        })

        myServer.waitForMessages(1, () => {
          var queue = myServer.getQueue()
          expect(queue[0].MessageBody).toBe('my message')
          expect(queue.length).toBe(1)

          myServer.close(done)
        })
      })
    })
  })

  describe('run() with attributes', () => {
    test('calling out to fake SQS with aws', (done) => {
      const myServer = new SimplyImitatedSQSHttpServer()

      const sqs = new AWS.SQS({
        region: 'us-east-1',
        sslEnabled: false,
        accessKeyId: '123',
        secretAccessKey: 'abc',
        apiVersion: '2012-11-05'
      })
      myServer.run({
        port: 0
      }, onServerStart)

      function onServerStart (err) {
        if (err) throw err

        const queueUrl = `http://` + myServer.hostPort
        sqs.sendMessage({
          QueueUrl: queueUrl,
          MessageBody: 'my message',
          MessageAttributes: {
            ProcessEnv: {
              DataType: 'String',
              StringValue: 'development'
            },
            ProcessApp: {
              DataType: 'String',
              StringValue: 'my-app'
            }
          }
        }, onMessagePublished)
      }

      function onMessagePublished (err) {
        if (err) {
          console.log('err', err)
        }

        const queueUrl = `http://` + myServer.hostPort
        sqs.receiveMessage({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          MessageAttributeNames: [
            'ProcessEnv', 'ProcessApp'
          ]
        }, onMessageReceive)
      }

      function onMessageReceive (err, response) {
        if (err) {
          console.error('err', err)
        }

        const messages = response.Messages
        expect(messages.length).toBe(1)

        const msg = messages[0]
        expect(msg.Body).toBe('my message')
        expect(msg.Attributes).toEqual({
          ProcessEnv: 'development',
          ProcessApp: 'my-app'
        })

        myServer.close(done)
      }
    })
  })

  describe('close()', () => {
    test('should be undefined if this.server is null', () => {
      expect(server.server).toBeNull()
      expect(server.close()).toBeUndefined()
    })
    test.skip('TODO: Add test', () => {})
  })
})
