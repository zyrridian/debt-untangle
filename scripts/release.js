const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');

try {
  // 1. Read app.json
  const appJson = require(appJsonPath);

  // 2. Bump the version string (e.g. 1.0.0 -> 1.0.1)
  const oldVersion = appJson.expo.version || "1.0.0";
  const parts = oldVersion.split('.');
  parts[2] = parseInt(parts[2]) + 1; // Bump patch version
  const newVersion = parts.join('.');
  appJson.expo.version = newVersion;

  // 3. Bump the Android versionCode (e.g. 1 -> 2)
  if (!appJson.expo.android) appJson.expo.android = {};
  const oldCode = appJson.expo.android.versionCode || 1;
  const newCode = oldCode + 1;
  appJson.expo.android.versionCode = newCode;

  // 4. Save the file back
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`✅ Bumped app.json to version ${newVersion} (versionCode ${newCode})`);

  // 5. Automatically Commit, Tag, and Push!
  console.log(`🚀 Committing and pushing tag v${newVersion}...`);
  execSync(`git commit -am "Auto-bump version to v${newVersion}"`, { stdio: 'inherit' });
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
  execSync(`git push`, { stdio: 'inherit' });
  execSync(`git push --tags`, { stdio: 'inherit' });

  console.log(`\n🎉 Success! GitHub Actions is now building and releasing v${newVersion}!`);
} catch (error) {
  console.error("❌ Failed to run release script:");
  console.error(error.message);
}
