'use strict'

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

  describe('server.port', () => {
    test('default port', () => {
      expect(server.port).toBe('1234')
    })

    test('custom port', () => {
      const _server = new SimplyImitatedSQSHttpServer('2345')
      expect(_server.port).toBe('2345')
      _server.sqs.clear()
    })
  })

  describe('server.host', () => {
    test('default host', () => {
      expect(server.host).toBe('localhost')
    })

    test('custom host', () => {
      const _server = new SimplyImitatedSQSHttpServer('2345', '127.0.0.1')
      expect(_server.port).toBe('2345')
      expect(_server.host).toBe('127.0.0.1')
      _server.sqs.clear()
    })
  })

  describe('getUrl()', () => {
    test('URL string', () => {
      expect(server.getUrl()).toBe('http://localhost:1234')
    })
  })

  describe('SendMessage()', () => {
    const params = {MessageBody: 'hoge'}
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
      const receiptHandle = server.sqs.vsq.send('hoge')
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
    test('TODO: Add test')
  })

  describe('close()', () => {
    test('TODO: Add test')
  })
})
