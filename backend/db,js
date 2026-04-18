const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
const path = require("path");
const os = require("os");

const dbPath = path.join(os.tmpdir(), "autodeploy-db.json");
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, { deploys: [] });

async function initDb() {
  await db.read();
  db.data ||= { deploys: [] };
  await db.write();
}

initDb();

async function saveDeploy(id, repo, language) {
  await db.read();
  db.data.deploys.push({
    id,
    repo,
    language,
    status: "building",
    port: null,
    container_name: null,
    created_at: Date.now(),
  });
  await db.write();
}

async function updateDeploy(id, status, port, containerName) {
  await db.read();
  const deploy = db.data.deploys.find((d) => d.id === id);
  if (deploy) {
    deploy.status = status;
    deploy.port = port;
    deploy.container_name = containerName;
  }
  await db.write();
}

async function getAllDeploys() {
  await db.read();
  return [...db.data.deploys].reverse();
}

async function getDeployById(id) {
  await db.read();
  return db.data.deploys.find((d) => d.id === id) || null;
}

module.exports = { saveDeploy, updateDeploy, getAllDeploys, getDeployById };
