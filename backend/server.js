const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const { detectLanguage } = require("./detector");
const { generateDockerfile } = require("./dockerfile");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = {};

wss.on("connection", (ws, req) => {
  const buildId = req.url.replace("/", "");
  clients[buildId] = ws;
  console.log(`WebSocket connected for build: ${buildId}`);

  ws.on("close", () => {
    delete clients[buildId];
    console.log(`WebSocket closed for build: ${buildId}`);
  });
});

app.get("/", (req, res) => {
  res.json({ status: "AutoDeploy backend is running!" });
});

app.post("/deploy", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl || !repoUrl.startsWith("https://github.com/")) {
    return res.status(400).json({ error: "Please provide a valid GitHub URL" });
  }

  const buildId = Date.now().toString();
  const os = require("os");
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
      if (ws && ws.readyState === 1) {
        ws.close();
      }
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

      const dockerfile = generateDockerfile(lang);
      fs.writeFileSync(path.join(buildDir, "Dockerfile"), dockerfile);
      send("Dockerfile written!");

      send(
        "Building Docker image... (this can take 1-2 minutes the first time)",
      );

      const imageName = `deploy-${buildId}`;
      const dockerBuild = spawn("docker", ["build", "-t", imageName, buildDir]);

      dockerBuild.stdout.on("data", (data) => {
        const lines = data
          .toString()
          .split("\n")
          .filter((l) => l.trim());
        lines.forEach((line) => send(line));
      });

      dockerBuild.stderr.on("data", (data) => {
        const lines = data
          .toString()
          .split("\n")
          .filter((l) => l.trim());
        lines.forEach((line) => send(line));
      });

      dockerBuild.on("close", (code) => {
        if (code === 0) {
          send(`Image built successfully: ${imageName}`);
          send("BUILD_COMPLETE");
        } else {
          sendError("Docker build failed. Check the logs above.");
        }
      });
    } catch (err) {
      sendError(err.message);
    }
  }, 400);
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
