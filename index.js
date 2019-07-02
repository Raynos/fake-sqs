'use strict'

const http = require('http')
const querystring = require('querystring')
const util = require('util')
const crypto = require('crypto')

const WaitGroup = require('./sync-wait-group.js')

const RID = 'FakeSQS-RequestId'

// TODO: add support for multiple queues
// TODO: add support for wait time seconds
class FakeSQSServer {
  constructor (options = {}) {
    this.server = http.createServer()
    this.port = options.port || 0
    this.hostPort = null

    this.queue = []

    this.sendCount = 0
    this.messageWaiters = []

    this.deleteCount = 0
    this.deleteWaiters = []

    this.pendingCount = 0
    this.flushWaiter = null
  }

  async bootstrap () {
    this.server.on('request', (req, res) => {
      this._handleServerRequest(req, res)
    })

    await util.promisify((cb) => {
      this.server.listen(this.port, cb)
    })()

    this.hostPort = `localhost:${this.server.address().port}`
    return this.hostPort
  }

  async close () {
    await util.promisify((cb) => {
      this.server.close(cb)
    })()
  }

  async waitForMessages (count) {
    if (this.sendCount >= count) {
      return
    }

    if (this.messageWaiters[count]) {
      return this.messageWaiters[count].wait()
    }

    const w = this.messageWaiters[count] = new WaitGroup()
    w.add(1)
    return w.wait()
  }

  async waitForDeletes (count) {
    if (this.deleteCount >= count) {
      return
    }

    if (this.deleteWaiters[count]) {
      return this.deleteWaiters[count].wait()
    }

    const w = this.deleteWaiters[count] = new WaitGroup()
    w.add(1)
    return w.wait()
  }

  async waitForFlush () {
    if (this.pendingCount === 0) {
      return
    }

    if (this.flushWaiter) {
      return this.flushWaiter.wait()
    }

    const w = this.flushWaiter = new WaitGroup()
    w.add(1)
    return w.wait()
  }

  getQueue () {
    const copy = []
    for (const o of this.queue) {
      copy.push(o.value)
    }
    return copy
  }

  _checkWaiters () {
    const deleteW = this.deleteWaiters[this.deleteCount]
    if (deleteW) {
      this.deleteWaiters[this.deleteCount] = null
      deleteW.done()
    }

    const messageW = this.messageWaiters[this.sendCount]
    if (messageW) {
      this.messageWaiters[this.sendCount] = null
      messageW.done()
    }

    if (this.pendingCount === 0) {
      const flushW = this.flushWaiter
      this.flushWaiter = null
      flushW.done()
    }
  }

  _handleServerRequest (req, res) {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      const params = querystring.parse(body)
      const xml = this._handleMessage(params.Action, params)
      if (!xml) {
        res.statusCode = 404
        return res.end('Not Found')
      }

      res.writeHead(200, { 'Content-Type': 'text/xml' })
      res.end(xml)
    })
  }

  _handleMessage (action, params) {
    switch (action) {
      case 'DeleteMessage':
        return this._handleDelete(params)

      case 'SendMessage':
        return this._handleSend(params)

      case 'SendMessageBatch':
        return this._handleSendBatch(params)

      case 'ReceiveMessage':
        return this._handleReceive(params)

      default:
        return null
    }
  }

  _handleDelete (params) {
    const id = params.ReceiptHandle
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].id === id) {
        this.deleteCount++
        this.queue.splice(i, 1)
        break
      }
    }

    this.pendingCount = this.queue.length
    this._checkWaiters()
    return `<DeleteMessageResponse>
      <ResponseMetadata>
        <RequestId>${RID}</RequestId>
      </ResponseMetadata>
    </DeleteMessageResponse>`
  }

  _handleSend (params) {
    this._processSend(params)

    return `<SendMessageResponse>
      <SendMessageResult>
        <MD5OfMessageBody>${md5(params.MessageBody)}</MD5OfMessageBody>
        <MessageId>FakeSQS-MessageId</MessageId>
      </SendMessageResult>
      <ResponseMetadata>
        <RequestId>${RID}</RequestId>
      </ResponseMetadata>
    </SendMessageResponse>`
  }

  _handleSendBatch (params) {
    const messages = []
    for (let i = 1; i <= 10; i++) {
      const idKey = `SendMessageBatchRequestEntry.${i}.Id`
      const bodyKey = `SendMessageBatchRequestEntry.${i}.MessageBody`
      if (params[idKey] && params[bodyKey]) {
        messages.push({
          Id: params[idKey],
          MessageBody: params[bodyKey]
        })
      }
    }

    let innerXML = ''
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      this._processSend(msg)

      innerXML += `<SendMessageBatchResultEntry>
        <Id>entry.Id</Id>
        <MessageId>FakeSQS-MessageId-${i}</MessageId>
        <MD5OfMessageBody>${md5(msg.MessageBody)}</MD5OfMessageBody>
      </SendMessageBatchResultEntry>\n`
    }

    return `<SendMessageBatchResponse>
      <SendMessageBatchResult>
        ${innerXML}
      </SendMessageBatchResult>
      <ResponseMetadata>
        <RequestId>${RID}</RequestId>
      </ResponseMetadata>
    </SendMessageBatchResponse>`
  }

  _scanForItem (now) {
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i]
      if (now <= item.visibilityTimeout) {
        continue
      }

      return item
    }

    return null
  }

  _handleReceive (params) {
    if (this.queue.length === 0) {
      return `<ReceiveMessageResponse>
        <ReceiveMessageResult>
        </ReceiveMessageResult>
        <ResponseMetadata>
          <RequestId>${RID}</RequestId>
        </ResponseMetadata>
      </ReceiveMessageResponse>`
    }

    let xml = `<ReceiveMessageResponse>
      <ReceiveMessageResult>`

    const maxItems = params.MaxNumberOfMessages
    const now = Date.now()
    for (let i = 0; i < maxItems; i++) {
      const item = this._scanForItem(now)
      if (item === null) {
        break
      }
      item.visibilityTimeout =
        Date.now() + (params.VisibilityTimeout * 1000)

      xml += `<Message>
        <MessageId>${RID}</MessageId>
        <ReceiptHandle>${item.id}</ReceiptHandle>
        <MD5OfBody>${md5(item.value.MessageBody)}</MD5OfBody>
        <Body>${item.value.MessageBody}</Body>\n`

      for (let i = 1; i <= 10; i++) {
        const key = `MessageAttribute.${i}.Name`
        if (!item.value[key]) {
          continue
        }

        const valKey = `MessageAttribute.${i}.Value.StringValue`
        xml += `<MessageAttribute>
          <Name>${item.value[key]}</Name>
          <Value>
            <StringValue>${item.value[valKey]}</StringValue>
            <DataType>String</DataType>
          </Value>
        </MessageAttribute>\n`
      }

      xml += `</Message>\n`
    }

    xml += `</ReceiveMessageResult>
      <ResponseMetadata>
        <RequestId>${RID}</RequestId>
      </ResponseMetadata>
    </ReceiveMessageResponse>`

    return xml
  }

  _processSend (params) {
    this.queue.push({
      id: id(),
      value: params,
      visibilityTimeout: 0
    })
    this.sendCount++
    this.pendingCount = this.queue.length
    this._checkWaiters()
  }
}

module.exports = FakeSQSServer

function cuuid () {
  const str = (Date.now().toString(16) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)).slice(0, 32)
  return str.slice(0, 8) + '-' + str.slice(8, 12) + '-' + str.slice(12, 16) + '-' + str.slice(16, 20) + '-' + str.slice(20)
}

function id () {
  const d = Math.floor(new Date().getTime() / 10000)
  return `${d}-${cuuid()}`
}

function md5 (str) {
  return crypto.createHash('md5')
    .update(str, 'utf8')
    .digest('hex')
}
