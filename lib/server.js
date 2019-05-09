'use strict'

const http = require('http')
const querystring = require('querystring')
const SimplyImitatedSQS = require('./simply_imitated_sqs')

class SimplyImitatedSQSHttpServer {
  constructor () {
    this.server = null
    this.hostPort = null
    this.waiters = []
    this.pendingItems = 0
    this.sendItems = 0
    this.sqs = new SimplyImitatedSQS()
  }

  // TODO: Other Action

  _send (params) {
    this.sqs.vsq.send(params)
    this.sendItems++
    var queue = this.getQueue()
    this.pendingItems = queue.length
    this.checkWaiters()
  }

  SendMessage (params) {
    this._send(params)
    return `<SendMessageResponse>
      <SendMessageResult>
        <MD5OfMessageBody>${this.sqs.md5_(params.MessageBody)}</MD5OfMessageBody>
        <MessageId>SimplyImitatedSQS-MessageId</MessageId>
      </SendMessageResult>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </SendMessageResponse>`
  }

  SendMessageBatch (params) {
    const entryXML = (() => {
      const entries = []
      for (let i = 1; i <= 10; i++) {
        if (params[`SendMessageBatchRequestEntry.${i}.Id`] &&
            params[`SendMessageBatchRequestEntry.${i}.MessageBody`]) {
          entries.push({
            Id: params[`SendMessageBatchRequestEntry.${i}.Id`],
            MessageBody: params[`SendMessageBatchRequestEntry.${i}.MessageBody`]
          })
        }
      }
      return entries.map((entry, i) => {
        this._send(entry)
        return `
        <SendMessageBatchResultEntry>
          <Id>entry.Id</Id>
          <MessageId>SimplyImitatedSQS-MessageId-${i}</MessageId>
          <MD5OfMessageBody>${this.sqs.md5_(entry.MessageBody)}</MD5OfMessageBody>
        </SendMessageBatchResultEntry>`
      }).join('\n')
    })()
    return `<SendMessageBatchResponse>
      <SendMessageBatchResult>${entryXML}
      </SendMessageBatchResult>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </SendMessageBatchResponse>`
  }

  ReceiveMessage (params) {
    const response = this.sqs.vsq.receive()
    if (!response) {
      return `<ReceiveMessageResponse>
        <ReceiveMessageResult>
        </ReceiveMessageResult>
        <ResponseMetadata>
          <RequestId>SimplyImitatedSQS-RequestId</RequestId>
        </ResponseMetadata>
      </ReceiveMessageResponse>`
    }

    let receiveXML = `<ReceiveMessageResponse>
      <ReceiveMessageResult>
        <Message>
          <MessageId>SimplyImitatedSQS-MessageId</MessageId>
          <ReceiptHandle>${response.id}</ReceiptHandle>
          <MD5OfBody>${this.sqs.md5_(response.body.MessageBody)}</MD5OfBody>
          <Body>${response.body.MessageBody}</Body>\n`

    for (let i = 1; i < 11; i++) {
      const key = `MessageAttribute.${i}.Name`
      if (!response.body[key]) {
        break
      }

      const attrValue = `MessageAttribute.${i}.Value.StringValue`
      receiveXML += `<MessageAttribute>
        <Name>${response.body[key]}</Name>
        <Value>
          <StringValue>${response.body[attrValue]}</StringValue>
          <DataType>String</DataType>
        </Value>
      </MessageAttribute>\n`
    }

    receiveXML = receiveXML.slice(0, receiveXML.length - 1)

    receiveXML += `
        </Message>
      </ReceiveMessageResult>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </ReceiveMessageResponse>`

    return receiveXML
  }

  DeleteMessage (params) {
    this.sqs.vsq.delete(params.ReceiptHandle)
    this.pendingItems = this.getQueue().length
    this.checkWaiters()
    return `<DeleteMessageResponse>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </DeleteMessageResponse>`
  }

  run (options, cb) {
    if (options != null) this.logging = !!options.logging

    // this.signalHandle()
    this.server = http.createServer((request, response) => {
      let postData = ''
      request.on('data', (chunk) => {
        postData += chunk
      })

      request.on('end', () => {
        const params = querystring.parse(postData)
        response.writeHead(200, { 'Content-Type': 'text/xml' })
        try {
          response.end(this[params.Action](params))
        } catch (e) {
          response.end('error')
        }
      })
    })
    const port = options.port || 0
    const host = options.host || 'localhost'
    this.server.listen(port, host, () => {
      this.hostPort = `localhost:${this.server.address().port}`
      if (cb) cb()
    })
  }

  getQueue () {
    return this.sqs.items()
  }

  checkWaiters () {
    var newWaiters = []
    for (var i = 0; i < this.waiters.length; i++) {
      var waiter = this.waiters[i]
      if (
        waiter.type === 'send' &&
        this.sendItems >= waiter.count
      ) {
        process.nextTick(waiter.cb)
        continue
      }

      if (
        waiter.type == 'pending' &&
        this.pendingItems === waiter.count
      ) {
        process.nextTick(waiter.cb)
        continue
      }

      newWaiters.push(waiter)
    }
    this.waiters = newWaiters
  }

  waitForMessages (count, cb) {
    const q = this.getQueue()
    if (q.length >= count) {
      return process.nextTick(cb)
    }

    this.waiters.push({ type: 'send', count: count, cb: cb })
  }

  waitForFlush (cb) {
    if (this.pendingItems === 0) {
      return process.nextTick(cb)
    }

    this.waiters.push({ type: 'pending', count: 0, cb: cb })
  }

  close (cb) {
    if (this.server == null) return

    this.sqs.clear()
    return this.server.close(cb)
  }
}

module.exports = SimplyImitatedSQSHttpServer
