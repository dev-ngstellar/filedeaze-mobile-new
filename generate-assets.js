const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "src", "assets");

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// 1x1 transparent PNG base64 representation
const BASE64_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const pngBuffer = Buffer.from(BASE64_PNG, "base64");

const filesToGenerate = [
  "icon.png",
  "splash.png",
  "adaptive-icon.png",
  "favicon.png",
];

console.log("Generating Expo asset placeholders...");

filesToGenerate.forEach((filename) => {
  const filePath = path.join(ASSETS_DIR, filename);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    console.log(`Skipping (already exists and has content): ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated: ${filePath}`);
});

console.log("Assets successfully initialized!");
