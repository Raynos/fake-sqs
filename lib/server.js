'use strict'

const http = require('http')
const querystring = require('querystring')
const SimplyImitatedSQS = require('./simply_imitated_sqs')

class SimplyImitatedSQSHttpServer {
  constructor () {
    this.server = null
    this.hostPort = null
    this.sqs = new SimplyImitatedSQS()
  }

  // TODO: Other Action

  SendMessage (params) {
    this.sqs.vsq.send(params.MessageBody)
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
        this.sqs.vsq.send(entry.MessageBody)
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
    return `<ReceiveMessageResponse>
      <ReceiveMessageResult>
        <Message>
          <MessageId>SimplyImitatedSQS-MessageId</MessageId>
          <ReceiptHandle>${response.id}</ReceiptHandle>
          <MD5OfBody>${this.sqs.md5_(response.body)}</MD5OfBody>
          <Body>${response.body}</Body>
        </Message>
      </ReceiveMessageResult>
      <ResponseMetadata>
        <RequestId>SimplyImitatedSQS-RequestId</RequestId>
      </ResponseMetadata>
    </ReceiveMessageResponse>`
  }

  DeleteMessage (params) {
    this.sqs.vsq.delete(params.ReceiptHandle)
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
          this.close()
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

  getQueue() {
    return this.sqs.items()
  }

  close (cb) {
    if (this.server == null) return
    this.sqs.clear()
    return this.server.close(cb)
  }
}

module.exports = SimplyImitatedSQSHttpServer
