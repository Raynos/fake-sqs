'use strict'

const AWS = require('aws-sdk')
const tape = require('tape')
const tapeCluster = require('tape-cluster')

const SQSServer = require('../index.js')

class TestHarness {
  constructor () {
    this.sqsServer = new SQSServer({ port: 0 })
    this.queueUrl = null
    this.sqs = new AWS.SQS({
      region: 'us-east-1',
      sslEnabled: false,
      accessKeyId: '123',
      secretAccessKey: 'abc',
      apiVersion: '2012-11-05'
    })
  }

  async bootstrap () {
    await this.sqsServer.bootstrap()
    this.queueUrl = `http://${this.sqsServer.hostPort}`
  }

  async close () {
    await this.sqsServer.close()
  }

  async sendMessage (params) {
    params.QueueUrl = this.queueUrl
    params.MessageAttributes = {
      ProcessEnv: {
        DataType: 'String',
        StringValue: 'development'
      },
      ProcessApp: {
        DataType: 'String',
        StringValue: 'my-app'
      }
    }
    // params.MessageBody
    return this.sqs.sendMessage(params).promise()
  }

  async receiveMessage (params) {
    params = params || {}
    params.QueueUrl = this.queueUrl
    params.MaxNumberOfMessages = 10
    params.WaitTimeSeconds = 20
    params.VisibilityTimeout = 1.5
    params.MessageAttributeNames = ['ProcessEnv', 'ProcessApp']
    return this.sqs.receiveMessage(params).promise()
  }

  async deleteMessage (params) {
    params.QueueUrl = this.queueUrl
    // params.Receipthandle
    return this.sqs.deleteMessage(params).promise()
  }

  async waitForMessages (n) {
    return this.sqsServer.waitForMessages(n)
  }

  async waitForDeletes (n) {
    return this.sqsServer.waitForDeletes(n)
  }

  async waitForFlush () {
    return this.sqsServer.waitForFlush()
  }

  getQueue () {
    return this.sqsServer.getQueue()
  }
}

TestHarness.test = tapeCluster(tape, TestHarness)

module.exports = TestHarness
