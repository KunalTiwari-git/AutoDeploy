const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { v4: uuidv4 } = require("uuid");

const { detectLanguage } = require("./detector");
const { generateDockerfile } = require("./dockerfile");
const { runContainer, findAvailablePort } = require("./runner");
const {
  saveDeploy,
  updateDeploy,
  getAllDeploys,
  getDeployById,
} = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = {};

wss.on("connection", (ws, req) => {
  const buildId = req.url.replace("/", "");
  clients[buildId] = ws;
  console.log(`WebSocket connected: ${buildId}`);
  ws.on("close", () => {
    delete clients[buildId];
  });
});

app.get("/", (req, res) => {
  res.json({ status: "AutoDeploy backend running" });
});

app.get('/deploys', async (req, res) => {
  const deploys = await getAllDeploys()
  res.json(deploys)
})

app.get('/deploys/:id', async (req, res) => {
  const deploy = await getDeployById(req.params.id)
  if (!deploy) return res.status(404).json({ error: 'Deploy not found' })
  res.json(deploy)
})

app.post("/deploy", (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl || !repoUrl.startsWith("https://github.com/")) {
    return res.status(400).json({ error: "Please provide a valid GitHub URL" });
  }

  const buildId = uuidv4();
  const buildDir = path.join(os.tmpdir(), "builds", buildId);

  res.json({ buildId });

  setTimeout(async () => {
    const ws = clients[buildId];

    function send(message) {
      if (ws && ws.readyState === 1) {
        ws.send(message);
      }
    }

    function sendError(message) {
      send(`ERROR: ${message}`);
      updateDeploy(buildId, "failed", null, null);
      if (ws && ws.readyState === 1) ws.close();
    }

    try {
      fs.mkdirSync(buildDir, { recursive: true });

      send("Cloning repository...");
      try {
        execSync(`git clone ${repoUrl} ${buildDir}`, { timeout: 30000 });
      } catch (err) {
        return sendError(
          "Could not clone repo. Is the URL correct and public?",
        );
      }
      send("Clone complete!");

      const lang = detectLanguage(buildDir);
      send(`Detected language: ${lang}`);

      if (lang === "unknown") {
        return sendError(
          "Could not detect language. Supported: Node.js, Python, Go, Ruby.",
        );
      }

      saveDeploy(buildId, repoUrl, lang);

      const dockerfile = generateDockerfile(lang);
      fs.writeFileSync(path.join(buildDir, "Dockerfile"), dockerfile);
      send("Dockerfile written!");

      send("Building Docker image... (first time takes 1-2 minutes)");

      const imageName = `deploy-${buildId}`;

      await new Promise((resolve, reject) => {
        const dockerBuild = spawn("docker", [
          "build",
          "-t",
          imageName,
          buildDir,
        ]);

        dockerBuild.stdout.on("data", (data) => {
          data
            .toString()
            .split("\n")
            .filter((l) => l.trim())
            .forEach((line) => send(line));
        });

        dockerBuild.stderr.on("data", (data) => {
          data
            .toString()
            .split("\n")
            .filter((l) => l.trim())
            .forEach((line) => send(line));
        });

        dockerBuild.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error("Docker build failed"));
        });
      });

      send("Image built successfully!");

      const port = findAvailablePort();

      const { containerName } = await runContainer(imageName, port, send);

      updateDeploy(buildId, "live", port, containerName);

      send(`DEPLOY_COMPLETE:${port}`);

      if (ws && ws.readyState === 1) ws.close();
    } catch (err) {
      sendError(err.message);
    }
  }, 400);
});

app.post('/stop/:id', async (req, res) => {
  const deploy = await getDeployById(req.params.id)
  if (!deploy) return res.status(404).json({ error: 'Deploy not found' })
  try {
    const { stopExistingContainer } = require('./runner')
    stopExistingContainer(deploy.container_name)
    await updateDeploy(deploy.id, 'stopped', null, null)
    res.json({ message: 'Container stopped' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
