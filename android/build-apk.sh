#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
ANDROID_JAR="${ANDROID_JAR:-$SDK/platforms/android-35/android.jar}"
BUILD_TOOLS="${BUILD_TOOLS:-$SDK/build-tools/35.0.1}"
JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"
for tool in aapt2 d8 zipalign apksigner; do test -x "$BUILD_TOOLS/$tool" || { echo "Missing $BUILD_TOOLS/$tool"; exit 1; }; done
test -f "$ANDROID_JAR" || { echo 'Android 35 platform android.jar is required'; exit 1; }
mkdir -p signing releases
KEYSTORE="${APK_KEYSTORE:-signing/ball-fight.jks}"
if [[ -z "${APK_STORE_PASSWORD:-}" ]]; then
  if [[ -f signing/password.txt ]]; then export APK_STORE_PASSWORD="$(cat signing/password.txt)";
  elif [[ -f "$KEYSTORE" ]]; then echo 'Set APK_STORE_PASSWORD for the existing signing key'; exit 1;
  else umask 077; export APK_STORE_PASSWORD="$(python3 -c 'import secrets;print(secrets.token_urlsafe(30))')"; printf '%s' "$APK_STORE_PASSWORD" > signing/password.txt; fi
fi
if [[ ! -f "$KEYSTORE" ]]; then
  keytool -genkeypair -keystore "$KEYSTORE" -storetype JKS -alias ballfight \
    -keyalg RSA -keysize 2048 -sigalg SHA256withRSA -validity 10000 \
    -storepass:env APK_STORE_PASSWORD -keypass:env APK_STORE_PASSWORD \
    -dname 'CN=Ball Fight Local Build, O=Ball Fight, C=ID'
fi
rm -rf .work
mkdir -p .work/generated .work/classes .work/dex
"$BUILD_TOOLS/aapt2" compile --dir res -o .work/resources.zip
"$BUILD_TOOLS/aapt2" link -o .work/base.apk -I "$ANDROID_JAR" \
  --manifest AndroidManifest.xml --java .work/generated -A assets \
  --min-sdk-version 23 --target-sdk-version 35 -0 mp3 .work/resources.zip
find src .work/generated -name '*.java' -print > .work/sources.txt
javac -encoding UTF-8 --release 8 -classpath "$ANDROID_JAR" -d .work/classes @.work/sources.txt
find .work/classes -name '*.class' -print > .work/classes.txt
"$BUILD_TOOLS/d8" --release --min-api 23 --lib "$ANDROID_JAR" --output .work/dex @.work/classes.txt
cp .work/base.apk .work/unsigned.apk
(cd .work/dex && zip -q ../unsigned.apk classes*.dex)
"$BUILD_TOOLS/zipalign" -f -p 4 .work/unsigned.apk .work/aligned.apk
"$BUILD_TOOLS/apksigner" sign --ks "$KEYSTORE" --ks-key-alias ballfight \
  --ks-pass env:APK_STORE_PASSWORD --key-pass env:APK_STORE_PASSWORD \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out releases/Ball-Fight-Online12-2.7.0.apk .work/aligned.apk
"$BUILD_TOOLS/apksigner" verify --verbose --print-certs releases/Ball-Fight-Online12-2.7.0.apk
"$BUILD_TOOLS/zipalign" -c -p 4 releases/Ball-Fight-Online12-2.7.0.apk
sha256sum releases/Ball-Fight-Online12-2.7.0.apk
