const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const isOld = args.includes('--old');

console.log('Building APK...');
const androidDir = path.join(__dirname, '..', 'android');

try {
  // Use gradlew.bat on Windows, ./gradlew on others
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  let command = `${gradlew} assembleRelease -x lintVitalAnalyzeRelease -x lint`;

  if (isOld) {
    console.log('Using old compression mode (Legacy Packaging)...');
    command += ' -Pexpo.useLegacyPackaging=true';
  }

  execSync(command, {
    cwd: androidDir,
    stdio: 'inherit'
  });

  console.log('\nAPK is ready at: android/app/build/outputs/apk/release/app-release.apk');
} catch (error) {
  console.error('\nBuild failed.');
  process.exit(1);
}
