const { execSync } = require('child_process')

function findAvailablePort() {
  return Math.floor(Math.random() * 10000) + 30000
}

function stopExistingContainer(containerName) {
  try {
    execSync(`docker stop ${containerName}`, { stdio: 'ignore' })
    execSync(`docker rm ${containerName}`, { stdio: 'ignore' })
  } catch (err) {
    // container didn't exist, fine
  }
}

function getInternalPort(lang) {
  if (lang === 'python') return 5000
  if (lang === 'ruby')   return 4567
  if (lang === 'go')     return 8080
  return 3000
}

function runContainer(imageName, port, send, lang) {
  return new Promise(async (resolve, reject) => {
    const containerName = imageName.replace('deploy-', 'container-')
    stopExistingContainer(containerName)

    const internalPort = getInternalPort(lang)
    send(`Starting container on port ${port}...`)

    try {
      execSync(
        `docker run -d --name ${containerName} -p ${port}:${internalPort} -e PORT=${internalPort} ${imageName}`
      )

      await new Promise(resolve => setTimeout(resolve, 2000))

      const status = getContainerStatus(containerName)
      if (status === 'running') {
        send(`Container started: ${containerName}`)
        send(`App running at http://localhost:${port}`)
        resolve({ containerName, port })
      } else {
        try {
          const logs = execSync(`docker logs ${containerName}`).toString().trim()
          reject(new Error(`Container exited immediately. Logs: ${logs}`))
        } catch (e) {
          reject(new Error('Container exited immediately after starting'))
        }
      }
    } catch (err) {
      reject(new Error('Could not start container: ' + err.message))
    }
  })
}

function getContainerStatus(containerName) {
  try {
    const result = execSync(
      `docker inspect --format={{.State.Status}} ${containerName}`
    ).toString().trim()
    return result
  } catch (err) {
    return 'not found'
  }
}

module.exports = {
  runContainer,
  getContainerStatus,
  stopExistingContainer,
  findAvailablePort,
}