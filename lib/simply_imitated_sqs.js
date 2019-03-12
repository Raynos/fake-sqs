'use strict'

const crypto = require('crypto')
const uuidv4 = require('uuid/v4')
const EventEmitter = require('events').EventEmitter

class VerySimpleQueueLikeSQS {
  constructor () {
    this.data = { value: {} }
  }

  items() {
    var values = []
    var keys = Object.keys(this.data.value)
    for (var i = 0; i < keys.length; i++) {
      values.push(this.data.value[keys[i]])
    }
    return values
  }

  size () {
    return Object.keys(this.data.value).length
  }

  id () {
    return `${parseInt((new Date()).getTime() / 10000)}-${uuidv4()}`
  }

  send (data) {
    const id = this.id()
    this.data.value[id] = data
    return id
  }

  receive () {
    if (this.size() === 0) return null
    const key = Object.keys(this.data.value).sort()[0]
    return {
      id: key,
      body: this.data.value[key]
    }
  }

  delete (id) {
    if (!this.data.value.hasOwnProperty(id)) return null
    const ret = delete this.data.value[id]
    return ret
  }
}

class SimplyImitatedSQS {
  constructor () {
    this.vsq = new VerySimpleQueueLikeSQS()
  }

  clear () {
    delete this.vsq
  }

  md5_ (str) {
    return crypto
      .createHash('md5')
      .update(str, 'utf8')
      .digest('hex')
  }

  eventEmitter_ (err, data) {
    const eventEmitter = new EventEmitter()
    eventEmitter.promise = () => {
      if (err) return Promise.reject(err)
      return Promise.resolve(data)
    }
    return eventEmitter
  }

  // TODO: Other methods

  sendMessage (params, callback) {
    this.vsq.send(params.MessageBody)
    const data = {
      ResponseMetadata: {
        RequestId: 'SimplyImitatedSQS-RequestId'
      },
      MD5OfMessageBody: this.md5_(params.MessageBody),
      MessageId: 'SimplyImitatedSQS-MessageId'
    }
    if (callback) callback(null, data)
    return this.eventEmitter_(null, data)
  }

  sendMessageBatch (params, callback) {
    const data = {
      ResponseMetadata: {
        RequestId: 'SimplyImitatedSQS-RequestId'
      },
      Successful: params.Entries.map((entry, i) => {
        this.vsq.send(entry.MessageBody)
        return {
          Id: entry.Id,
          MessageId: `SimplyImitatedSQS-MessageId-${i}`,
          MD5OfMessageBody: this.md5_(entry.MessageBody)
        }
      }),
      Failed: []
    }
    if (callback) callback(null, data)
    return this.eventEmitter_(null, data)
  }

  receiveMessage (params, callback) {
    const response = this.vsq.receive()
    const data = {
      ResponseMetadata: {
        RequestId: 'SimplyImitatedSQS-RequestId'
      },
      Messages: [{
        MessageId: 'SimplyImitatedSQS-MessageId',
        ReceiptHandle: response.id,
        MD5OfBody: this.md5_(response.body),
        Body: response.body
      }]
    }
    if (callback) callback(null, data)
    return this.eventEmitter_(null, data)
  }

  deleteMessage (params, callback) {
    this.vsq.delete(params.ReceiptHandle)
    const data = {
      ResponseMetadata: {
        RequestId: 'SimplyImitatedSQS-RequestId'
      }
    }
    if (callback) callback(null, data)
    return this.eventEmitter_(null, data)
  }
}

module.exports = SimplyImitatedSQS
