/**
 * Hybrid Windows build:
 * 1. Build Encryptic Movies portable app
 * 2. Bundle it inside Encryptic Movies Setup.exe
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

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

if (!fs.existsSync(path.join(installerDir, "assets", "posters"))) {
  console.log("Tip: run npm run installer:cache-posters for showcase images.\n");
}

console.log("=== Step 1/3: Build Encryptic Movies (portable) ===\n");
run("npm run dist:win-desktop", root);

if (!fs.existsSync(payloadSrc)) {
  console.error("\nMissing app payload:", payloadSrc);
  process.exit(1);
}

console.log("\n=== Step 2/3: Build Encryptic Movies Setup.exe ===\n");
require("./build-setup-only.js");

if (!fs.existsSync(setupOut)) {
  console.error("\nSetup EXE not found at:", setupOut);
  process.exit(1);
}

const desktopSetup = path.join(os.homedir(), "Desktop", "Encryptic Movies Setup.exe");
try {
  fs.copyFileSync(setupOut, desktopSetup);
  console.log("\nCopied to Desktop:", desktopSetup);
} catch (e) {
  console.warn("\nCould not copy to Desktop:", e.message);
}

const setupMb = (fs.statSync(setupOut).size / 1024 / 1024).toFixed(1);
console.log(`\nDone. Setup installer: ${setupOut} (${setupMb} MB)`);
console.log("Users run Setup → pick folder → Install now (real copy + shortcuts).");
