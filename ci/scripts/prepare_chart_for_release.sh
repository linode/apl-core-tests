#!/bin/bash
set -euo pipefail

CHART_PATH="${CHART_PATH:-chart/apl}"

# Retrieve the app version from the RELEASE_TAG env var (e.g. v6.0.0-rc.9 → 6.0.0-rc.9)
app_version="${RELEASE_TAG#v}"

# Update Chart.yaml and values.yaml with the new app version
sed -i "s/0.0.0-chart-version/$app_version/g" "$CHART_PATH/Chart.yaml"
sed -i "s/APP_VERSION_PLACEHOLDER/v$app_version/g" "$CHART_PATH/Chart.yaml"

echo "Chart and values files updated successfully with version $app_version"

# Generate schema
npx js-yaml values-schema.yaml > "$CHART_PATH/values.schema.json"
