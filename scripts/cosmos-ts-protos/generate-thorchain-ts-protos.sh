#!/bin/zsh
set -o errexit -o nounset -o pipefail
command -v shellcheck >/dev/null && shellcheck "$0"

PROTO_DIR="./scripts/cosmos-ts-protos/proto"

# Replace the following variables to create typescript files for other Cosmos-cbased chains

PLUGIN="thorchain" # pluginId
REPO_URL="https://gitlab.com/thorchain/thornode/-/archive/mainnet/thornode-mainnet.zip" # git repository
COSMOS_SDK_REF="mainnet" # branch
COSMOS_DIR="$PROTO_DIR/$PLUGIN"
COSMOS_SDK_DIR="$COSMOS_DIR/thornode" # additional path to proto files

# Get proto

ZIP_FILE="$COSMOS_DIR/tmp.zip"
SUFFIX=${COSMOS_SDK_REF}

[[ $SUFFIX =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-.+)?$ ]] && SUFFIX=${SUFFIX#v}

rm -rf $COSMOS_DIR
mkdir -p "$COSMOS_DIR"

wget -qO "$ZIP_FILE" "$REPO_URL"
unzip "$ZIP_FILE" "*.proto" -d "$COSMOS_DIR"
mv "$COSMOS_SDK_DIR-$SUFFIX" "$COSMOS_SDK_DIR"
rm "$ZIP_FILE"

# Define proto

COSMOS_PROTO_DIR="$COSMOS_SDK_DIR/proto"
THIRD_PARTY_PROTO_DIR="$COSMOS_SDK_DIR/third_party/proto"
OUT_DIR="./src/cosmos/info/$PLUGIN/proto"
rm -rf $OUT_DIR
mkdir -p "$OUT_DIR"

PROTO_FILES=( $COSMOS_DIR/**/*.proto )

for FILE in $PROTO_FILES; do
  echo "Creating typescript file from" $FILE
  protoc \
    --plugin="$(yarn bin protoc-gen-ts_proto 2> >(grep -v warning 1>&2))" \
    --ts_proto_out="$OUT_DIR" \
    --proto_path="$COSMOS_PROTO_DIR" \
    --proto_path="$THIRD_PARTY_PROTO_DIR" \
    --ts_proto_opt="esModuleInterop=true,forceLong=long,useOptionals=true" \
    $FILE
done
