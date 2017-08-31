'use strict'

const os = require('os')
const fs = require('fs')
const path = require('path')
const SimplyImitatedSQS = require('../simply_imitated_sqs')

/* global describe, test, expect, beforeEach, afterEach */
describe('simply_imitated_sqs', () => {
  let sqs = null
  beforeEach(() => {
    sqs = new SimplyImitatedSQS()
  })

  afterEach(() => {
    if (fs.existsSync(sqs.dbFile)) fs.unlinkSync(sqs.dbFile)
  })

  test('sqs is instanceOf SimplyImitatedSQS', () => {
    expect(sqs).toBeInstanceOf(SimplyImitatedSQS)
  })

  describe('defaultDbFile()', () => {
    test('File path including pid', () => {
      expect(sqs.defaultDbFile())
      .toMatch(/SimplyImitatedSQS-\d{1,}\.json/)
    })
  })

  describe('sqs.dbFile variable', () => {
    test('File path including pid', () => {
      expect(sqs.dbFile)
      .toMatch(/SimplyImitatedSQS-\d{1,}\.json/)
    })

    test('Specify file path at instance creation', () => {
      const filePath = path.join(os.tmpdir(), 'SimplyImitatedSQS-test.json')
      sqs = new SimplyImitatedSQS(filePath)
      expect(sqs.dbFile).toBe(filePath)
    })
  })

  describe('reload() and clear()', () => {
    test('Remove the file with clear and delete vsq. Recreate with reload', () => {
      const dbFile = sqs.dbFile
      expect(fs.existsSync(dbFile)).toBeTruthy()

      sqs.clear()
      expect(fs.existsSync(dbFile)).toBeFalsy()
      expect(sqs.vsq).toBeUndefined()

      sqs.reload()
      expect(fs.existsSync(dbFile)).toBeTruthy()
      expect(sqs.vsq).toBeDefined()
    })
  })

  describe('md5_(str)', () => {
    test('value of md5', () => {
      expect(sqs.md5_('hoge')).toBe('ea703e7aa1efda0064eaa507d9e8ab7e')
    })
  })

  describe('sendMessage()', () => {
    test('Return value', () => {
      const params = {
        QueueUrl: 'QueueUrl',
        MessageBody: 'hoge'
      }
      sqs.sendMessage(params, (err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual({
          ResponseMetadata: {
            RequestId: 'SimplyImitatedSQS-RequestId'
          },
          MD5OfMessageBody: 'ea703e7aa1efda0064eaa507d9e8ab7e',
          MessageId: 'SimplyImitatedSQS-MessageId'
        })
      })
    })
  })

  describe('receiveMessage()', () => {
    test('Return value', () => {
      const params = {
        QueueUrl: 'QueueUrl',
        MessageBody: 'hoge'
      }
      sqs.sendMessage(params, (err, data) => {
        expect(err).toBeNull()
        expect(data).toBeDefined()

        const params = {QueueUrl: 'QueueUrl'}
        sqs.receiveMessage(params, (err, data) => {
          const receiptHandle = Object.keys(sqs.vsq.data.value)[0]
          expect(err).toBeNull()
          expect(data).toEqual({
            ResponseMetadata: {
              RequestId: 'SimplyImitatedSQS-RequestId'
            },
            Messages: [{
              MessageId: 'SimplyImitatedSQS-MessageId',
              ReceiptHandle: receiptHandle,
              MD5OfBody: 'ea703e7aa1efda0064eaa507d9e8ab7e',
              Body: 'hoge'
            }]
          })
        })
      })
    })
  })

  describe('deleteMessage()', () => {
    test('Return value', () => {
      const params = {
        QueueUrl: 'QueueUrl',
        MessageBody: 'hoge'
      }
      sqs.sendMessage(params, (err, data) => {
        expect(err).toBeNull()
        expect(data).toBeDefined()

        const receiptHandle = Object.keys(sqs.vsq.data.value)[0]
        const params = {
          QueueUrl: 'QueueUrl',
          ReceiptHandle: receiptHandle
        }
        sqs.deleteMessage(params, (err, data) => {
          expect(err).toBeNull()
          expect(data).toEqual({
            ResponseMetadata: {
              RequestId: 'SimplyImitatedSQS-RequestId'
            }
          })
        })
      })
    })
  })
})
