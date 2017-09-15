#!/usr/bin/env node

'use strict'
const server = new (require('..').Server)()
server.run()
