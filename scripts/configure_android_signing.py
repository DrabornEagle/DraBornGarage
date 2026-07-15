from pathlib import Path

path = Path('android/app/build.gradle')
text = path.read_text(encoding='utf-8')
marker = '// DRABORNGARAGE_PRODUCTION_SIGNING'
if marker not in text:
    text += '''

// DRABORNGARAGE_PRODUCTION_SIGNING
android {
    signingConfigs {
        draborngarageRelease {
            storeFile file(System.getenv('DRABORNGARAGE_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.draborngarageRelease
        }
    }
}
'''
path.write_text(text, encoding='utf-8')
