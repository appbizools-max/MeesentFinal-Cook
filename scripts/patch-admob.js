const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-google-mobile-ads',
  'android',
  'src',
  'main',
  'java',
  'io',
  'invertase',
  'googlemobileads',
  'ReactNativeGoogleMobileAdsModule.kt'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  let changed = false;

  if (content.includes('currentActivity ?: reactApplicationContext')) {
    content = content.replace(
      'currentActivity ?: reactApplicationContext',
      'reactApplicationContext.currentActivity ?: reactApplicationContext'
    );
    changed = true;
  }
  if (content.includes('val activity = currentActivity')) {
    content = content.replace(
      'val activity = currentActivity',
      'val activity = reactApplicationContext.currentActivity'
    );
    changed = true;
  }
  if (content.includes('currentActivity?.runOnUiThread')) {
    content = content.replace(
      'currentActivity?.runOnUiThread',
      'reactApplicationContext.currentActivity?.runOnUiThread'
    );
    changed = true;
  }
  if (content.includes('MobileAds.openDebugMenu(currentActivity!!')) {
    content = content.replace(
      'MobileAds.openDebugMenu(currentActivity!!',
      'MobileAds.openDebugMenu(reactApplicationContext.currentActivity!!'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Patched react-native-google-mobile-ads for React Native 0.81 Kotlin compatibility');
  }
}
