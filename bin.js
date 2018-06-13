#!/usr/bin/env node

require('./')(process.argv.slice(2)).on('data', console.log)
