'use strict'

const SimplyImitatedSQS = require('../simply_imitated_sqs')

/* global describe, test, expect, beforeEach, afterEach */
describe('simply_imitated_sqs', () => {
  let sqs = null
  beforeEach(() => {
    sqs = new SimplyImitatedSQS()
  })
  afterEach(() => sqs.clear())

  test('sqs is instanceOf SimplyImitatedSQS', () => {
    expect(sqs).toBeInstanceOf(SimplyImitatedSQS)
  })

  describe('md5_(str)', () => {
    test('value of md5', () => {
      expect(sqs.md5_('hoge')).toBe('ea703e7aa1efda0064eaa507d9e8ab7e')
    })
  })

  describe('eventEmitter_(err, data)', () => {
    test('EventEmitter', () => {
      const eventEmitter = sqs.eventEmitter_()
      eventEmitter.on('test', (value) => {
        expect(value).toBe('piyo')
      })
      eventEmitter.emit('test', 'piyo')
    })

    test('promise()', () => {
      const eventEmitter = sqs.eventEmitter_(null, 'piyo')
      return eventEmitter.promise().then(data => {
        expect(data).toBe('piyo')
      })
    })

    test('promise() failed', () => {
      const eventEmitter = sqs.eventEmitter_(new Error('error'))
      return eventEmitter.promise().then(data => {
        expect(data).toBeUndefined()
      }).catch((e) => {
        expect(e).toEqual(new Error('error'))
      })
    })
  })

  describe('sendMessage()', () => {
    const params = {
      QueueUrl: 'QueueUrl',
      MessageBody: 'hoge'
    }

    const expected = {
      ResponseMetadata: {
        RequestId: 'SimplyImitatedSQS-RequestId'
      },
      MD5OfMessageBody: 'ea703e7aa1efda0064eaa507d9e8ab7e',
      MessageId: 'SimplyImitatedSQS-MessageId'
    }

    test('Return value', () => {
      sqs.sendMessage(params, (err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual(expected)
      })
    })

    test('Return value (promise)', () => {
      return sqs.sendMessage(params).promise().then(data => {
        expect(data).toEqual(expected)
      }).catch((err) => {
        // When entering here is abnormal
        expect(err).toBeNull()
      })
    })
  })

  describe('sendMessageBatch()', () => {
    const params = {
      QueueUrl: 'QueueUrl',
      Entries: [{
        MessageBody: '1',
        Id: 'a'
      }, {
        MessageBody: '2',
        Id: 'b'
      }]
    }

    const expected = {
      ResponseMetadata: {
        RequestId: 'SimplyImitatedSQS-RequestId'
      },
      Successful: [{
        Id: 'a',
        MessageId: 'SimplyImitatedSQS-MessageId-0',
        MD5OfMessageBody: 'c4ca4238a0b923820dcc509a6f75849b'
      }, {
        Id: 'b',
        MessageId: 'SimplyImitatedSQS-MessageId-1',
        MD5OfMessageBody: 'c81e728d9d4c2f636f067f89cc14862c'
      }],
      Failed: []
    }

    test('Return value', () => {
      sqs.sendMessageBatch(params, (err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual(expected)
      })
    })

    test('Return value (promise)', () => {
      return sqs.sendMessageBatch(params).promise().then(data => {
        expect(data).toEqual(expected)
      }).catch((err) => {
        // When entering here is abnormal
        expect(err).toBeNull()
      })
    })
  })

  describe('receiveMessage()', () => {
    const sendMessageParams = {
      QueueUrl: 'QueueUrl',
      MessageBody: 'hoge'
    }
    const receiveMessageParams = { QueueUrl: 'QueueUrl' }

    const expected = (receiptHandle) => {
      return {
        ResponseMetadata: {
          RequestId: 'SimplyImitatedSQS-RequestId'
        },
        Messages: [{
          MessageId: 'SimplyImitatedSQS-MessageId',
          ReceiptHandle: receiptHandle,
          MD5OfBody: 'ea703e7aa1efda0064eaa507d9e8ab7e',
          Body: 'hoge'
        }]
      }
    }

    test('Return value', () => {
      sqs.sendMessage(sendMessageParams, (err, data) => {
        expect(err).toBeNull()
        expect(data).toBeDefined()

        sqs.receiveMessage(receiveMessageParams, (err, data) => {
          const receiptHandle = Object.keys(sqs.vsq.data.value)[0]
          expect(err).toBeNull()
          expect(data).toEqual(expected(receiptHandle))
        })
      })
    })

    test('Return value (promise)', () => {
      return sqs.sendMessage(sendMessageParams).promise().then(data => {
        expect(data).toBeDefined()
        return data
      }).then(data => {
        return sqs.receiveMessage(receiveMessageParams).promise().then(data => {
          const receiptHandle = Object.keys(sqs.vsq.data.value)[0]
          expect(data).toEqual(expected(receiptHandle))
        })
      }).catch((err) => {
        // When entering here is abnormal
        expect(err).toBeNull()
      })
    })
  })

  describe('deleteMessage()', () => {
    const sendMessageParams = {
      QueueUrl: 'QueueUrl',
      MessageBody: 'hoge'
    }
    const deleteMessageParams = (receiptHandle) => {
      return {
        QueueUrl: 'QueueUrl',
        ReceiptHandle: receiptHandle
      }
    }

    const expected = {
      ResponseMetadata: {
        RequestId: 'SimplyImitatedSQS-RequestId'
      }
    }

    test('Return value', () => {
      sqs.sendMessage(sendMessageParams, (err, data) => {
        expect(err).toBeNull()
        expect(data).toBeDefined()

        const receiptHandle = Object.keys(sqs.vsq.data.value)[0]
        sqs.deleteMessage(deleteMessageParams(receiptHandle), (err, data) => {
          expect(err).toBeNull()
          expect(data).toEqual(expected)
        })
      })
    })

    test('Return value (promise)', () => {
      return sqs.sendMessage(sendMessageParams).promise().then(data => {
        expect(data).toBeDefined()
        return data
      }).then(data => {
        const receiptHandle = Object.keys(sqs.vsq.data.value)[0]
        return sqs.deleteMessage(deleteMessageParams(receiptHandle))
          .promise()
          .then(data => {
            expect(data).toEqual(expected)
          })
      }).catch((err) => {
        // When entering here is abnormal
        expect(err).toBeNull()
      })
    })
  })
})
