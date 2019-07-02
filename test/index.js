'use strict'

const test = require('./test-harness.js').test

test('sending a msg', async (server, assert) => {
  await server.sendMessage({
    MessageBody: 'my message'
  })

  await server.waitForMessages(1)

  const q = server.getQueue()

  assert.equal(q.length, 1)
  assert.equal(q[0].MessageBody, 'my message')
})

test('sending + receiving three messages',
  async (server, assert) => {
    const p1 = server.sendMessage({
      MessageBody: 'my message1'
    })
    const p2 = server.sendMessage({
      MessageBody: 'my message2'
    })
    const p3 = server.sendMessage({
      MessageBody: 'my message3'
    })

    await server.waitForMessages(3)
    await Promise.all([p1, p2, p3])

    const q = server.getQueue()
    assert.equal(q.length, 3)

    const v = await server.receiveMessage()
    assert.equal(v.Messages.length, 3)
    assert.equal(v.Messages[0].Body, 'my message1')
    assert.equal(v.Messages[1].Body, 'my message2')
    assert.equal(v.Messages[2].Body, 'my message3')

    const p4 = server.deleteMessage({
      ReceiptHandle: v.Messages[0].ReceiptHandle
    })
    const p5 = server.deleteMessage({
      ReceiptHandle: v.Messages[1].ReceiptHandle
    })
    const p6 = server.deleteMessage({
      ReceiptHandle: v.Messages[2].ReceiptHandle
    })

    await server.waitForFlush()
    await Promise.all([p4, p5, p6])
  }
)

test('sending and receiving a msg', async (server, assert) => {
  await server.sendMessage({
    MessageBody: 'my message'
  })

  const v = await server.receiveMessage()

  assert.equal(v.Messages.length, 1)
  const msg = v.Messages[0]
  assert.equal(msg.Body, 'my message')
  assert.equal(
    msg.MessageAttributes.ProcessEnv.StringValue, 'development'
  )
  assert.equal(
    msg.MessageAttributes.ProcessApp.StringValue, 'my-app'
  )
})

test('sending and double receiving a msg',
  async (server, assert) => {
    await server.sendMessage({
      MessageBody: 'my message'
    })

    const v = await server.receiveMessage()

    assert.equal(v.Messages.length, 1)
    const msg = v.Messages[0]
    assert.equal(msg.Body, 'my message')
    assert.equal(
      msg.MessageAttributes.ProcessEnv.StringValue, 'development'
    )
    assert.equal(
      msg.MessageAttributes.ProcessApp.StringValue, 'my-app'
    )

    const v2 = await server.receiveMessage()
    assert.equal(v2.Messages, undefined)
  }
)

test('deleting a msg', async (server, assert) => {
  await server.sendMessage({
    MessageBody: 'my message'
  })

  const p = receiveInBackground()

  await server.waitForMessages(1)
  await server.waitForFlush()
  await p

  async function receiveInBackground() {
    const v = await server.receiveMessage()

    assert.equal(v.Messages.length, 1)
    assert.equal(v.Messages[0].Body, 'my message')

    await server.deleteMessage({
      ReceiptHandle: v.Messages[0].ReceiptHandle
    })
  }
})
