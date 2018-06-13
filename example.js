const createStream = require('./')

createStream(['mafintosh', 'Mathias Buus'])
  .on('data', console.log)
