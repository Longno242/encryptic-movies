/**
 * Stage portable app into installer/payload and build Setup.exe.
 * Used by CI after the main Windows portable build.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const installerDir = path.join(root, "installer");
const payloadSrc = path.join(root, "dist", "Encryptic Movies.exe");
const payloadDest = path.join(installerDir, "payload", "Encryptic Movies.exe");
const setupOut = path.join(root, "dist", "Encryptic Movies Setup.exe");

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
}

const rootPkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const installerPkgPath = path.join(installerDir, "package.json");
const installerPkg = JSON.parse(fs.readFileSync(installerPkgPath, "utf8"));
installerPkg.version = rootPkg.version;
fs.writeFileSync(installerPkgPath, JSON.stringify(installerPkg, null, 2) + "\n");

fs.mkdirSync(path.join(installerDir, "assets"), { recursive: true });
const logoSrc = path.join(root, "public", "encryptic-logo.png");
const logoDest = path.join(installerDir, "assets", "encryptic-logo.png");
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, logoDest);
}

if (!fs.existsSync(payloadSrc)) {
  console.error("Missing app payload:", payloadSrc);
  process.exit(1);
}

fs.mkdirSync(path.dirname(payloadDest), { recursive: true });
fs.copyFileSync(payloadSrc, payloadDest);

const installerModules = path.join(installerDir, "node_modules", "electron");
if (!fs.existsSync(installerModules)) {
  run("npm install", installerDir);
}
run("npx electron-builder --win portable --publish never", installerDir);

if (!fs.existsSync(setupOut)) {
  console.error("Setup EXE not found at:", setupOut);
  process.exit(1);
}

console.log("Built:", setupOut);
