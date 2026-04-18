const { execSync, spawn } = require("child_process");

function findAvailablePort() {
  const port = Math.floor(Math.random() * 10000) + 30000;
  return port;
}

function stopExistingContainer(containerName) {
  try {
    execSync(`docker stop ${containerName}`, { stdio: "ignore" });
    execSync(`docker rm ${containerName}`, { stdio: "ignore" });
  } catch (err) {
    // container didn't exist, that's fine
  }
}

function runContainer(imageName, port, send) {
  return new Promise((resolve, reject) => {
    const containerName = imageName.replace("deploy-", "container-");

    stopExistingContainer(containerName);

    send(`Starting container on port ${port}...`);

    const args = [
      "run",
      "-d",
      "--name",
      containerName,
      "-p",
      `${port}:3000`,
      imageName,
    ];

    try {
      execSync(
        `docker run -d --name ${containerName} -p ${port}:3000 ${imageName}`,
      );
      send(`Container started: ${containerName}`);
      send(`App running at http://localhost:${port}`);
      resolve({ containerName, port });
    } catch (err) {
      send(`Trying port mapping for Python/Go app...`);
      try {
        execSync(
          `docker run -d --name ${containerName}-py -p ${port}:5000 ${imageName}`,
        );
        send(`Container started on Python port`);
        send(`App running at http://localhost:${port}`);
        resolve({ containerName: containerName + "-py", port });
      } catch (err2) {
        reject(new Error("Could not start container: " + err2.message));
      }
    }
  });
}

function getContainerStatus(containerName) {
  try {
    const result = execSync(
      `docker inspect --format='{{.State.Status}}' ${containerName}`,
    )
      .toString()
      .trim()
      .replace(/'/g, "");
    return result;
  } catch (err) {
    return "not found";
  }
}

module.exports = {
  runContainer,
  getContainerStatus,
  stopExistingContainer,
  findAvailablePort,
};
