const fs = require('fs')
const path = require('path')

function detectLanguage(repoPath) {
  try {
    const files = fs.readdirSync(repoPath)

    if (files.includes('package.json'))     return 'node'
    if (files.includes('requirements.txt')) return 'python'
    if (files.includes('go.mod'))           return 'go'
    if (files.includes('Gemfile'))          return 'ruby'

    const pyFiles = files.filter(f => f.endsWith('.py'))
    if (pyFiles.length > 0) return 'python'

    const jsFiles = files.filter(f => f.endsWith('.js') && f !== 'dockerfile.js')
    if (jsFiles.length > 0) return 'node'

    const goFiles = files.filter(f => f.endsWith('.go'))
    if (goFiles.length > 0) return 'go'

    const rbFiles = files.filter(f => f.endsWith('.rb'))
    if (rbFiles.length > 0) return 'ruby'

    return 'unknown'
  } catch (err) {
    return 'unknown'
  }
}

module.exports = { detectLanguage }