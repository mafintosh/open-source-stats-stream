const commitStream = require('node-core-commit-stream')
const pump = require('pump')
const each = require('stream-each')
const get = require('simple-get')
const JSONStream = require('JSONStream')
const counts = require('npm-package-download-counts')
const { Readable, PassThrough } = require('stream')

module.exports = createStream

function createStream (isRelevant) {
  if (Array.isArray(isRelevant)) {
    const names = isRelevant
    isRelevant = name => names.indexOf(name) > -1
  }

  // stats are always 1 month ago atm
  const lastMonth = Date.now() - 31 * 24 * 3600 * 1000
  var stopped = false

  const stats = {
    npm: {
      totalModules: 0,
      maintaining: 0,
      lastMonth: {
        downloads: 0,
        updated: 0,
        created: 0
      }
    },
    nodeCore: {
      lastMonth: {
        totalCommits: 0,
        authored: 0,
        reviewed: 0,
        committed: 0
      }
    }
  }

  function destroy (err, cb) {
    stopped = true
    cb(err)
  }

  var missing = 2
  const stream = new Readable({objectMode: true, read: () => {}, destroy})

  stream.stats = stats
  npmStats(done)
  nodeStats(done)

  return stream

  function done (err) {
    if (stopped) return
    if (err) return stream.destroy(err)
    stream.push(stats)
    if (!--missing) stream.push(null)
  }

  function nodeStats (cb) {
    const commits = commitStream()

    commits.on('data', function (data) {
      if (stopped) return commits.destroy()

      const time = new Date(data.committer.date).getTime()

      if (time < lastMonth) {
        commits.destroy()
        return
      }

      var updated = false

      if (isRelevant(data.author.name)) {
        stats.nodeCore.lastMonth.authored++
        updated = true
      }
      if (isRelevant(data.committer.name)) {
        stats.nodeCore.lastMonth.committed++
        updated = true
      }
      if (data.reviewedBy.map(r => r.name).some(isRelevant)) {
        stats.nodeCore.lastMonth.reviewed++
        updated = true
      }

      stats.nodeCore.lastMonth.totalCommits++
      if (updated) stream.push(stats)
    })

    commits.on('error', function (err) {
      cb(err)
    })

    commits.on('close', function () {
      cb(null)
    })
  }

  function npmStats (cb) {
    const u = `https://skimdb.npmjs.com/registry/_changes?include_docs=true`

    get(u, function (err, res) {
      if (stopped) return
      if (err) return cb(err)

      each(pump(res, JSONStream.parse('results.*'), new PassThrough({objectMode: true})), ondata, cb)

      function ondata (data, cb) {
        if (stopped) return res.destroy()

        if (data.id[0] === '_' || data.deleted) return cb(null)
        stats.npm.totalModules++

        const created = new Date(data.doc.time.created).getTime()
        const modified = new Date(data.doc.time.modified).getTime()

        if (!isMaintaining(data)) return cb(null)

        stats.npm.maintaining++

        if (created > lastMonth) {
          stats.npm.lastMonth.created++
        } else if (modified > lastMonth) {
          stats.npm.lastMonth.updated++
        }

        counts({
          packages: [data.id],
          period: 'last-month'
        }, function (err, data) {
          if (stopped) return
          if (err) return cb(null) // nbd

          try {
            const downloads = data[0].data.map(d => d[1]).reduce((a, b) => a + b)
            stats.npm.lastMonth.downloads += downloads
          } catch (err) {}

          stream.push(stats)
          cb(null)
        })
      }

      function isMaintaining (data) {
        const doc = data.doc
        if (!doc) return false
        const main = (doc.maintainers || []).concat(doc.author || []).map(m => m.name)
        return main.some(isRelevant)
      }
    })
  }
}
