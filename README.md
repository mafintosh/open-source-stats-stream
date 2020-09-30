# Open-source-stats-stream :

A stream that tails npm and node core commits to produce an open
source stat digest of a group on contributors

```
npm install open-source-stats-stream
```

## Usage :

``` js
const createStream = require('open-source-stats-stream')

// pass in an array of names that identify the contributors
createStream(['mafintosh', 'Mathias Buus'])
  .on('data', console.log) // emitted everytime the stats are updated
```

Will produce a stream of stats that looks like this:

```js
{ npm: 
   { totalModules: 646719,
     maintaining: 687,
     lastMonth: { downloads: 293745180, updated: 62, created: 4 } },
  nodeCore: 
   { lastMonth: { totalCommits: 415, authored: 3, reviewed: 0, committed: 1 } } }
```

## Command line tool :

There is also an command line tool available

```sh
npm install -g open-source-stats-stream
open-source-stats-stream mafintosh 'Mathias Buus'
```

## License :

MIT
