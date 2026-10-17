#!/usr/bin/env bash
set -euo pipefail

image=${1:?Usage: bash test/smoke-image.sh IMAGE}
root=$(cd "$(dirname "$0")/.." && pwd)
output="$root/test/output"
mkdir -p "$output"

# Use the normal image entrypoint and non-root user, without relying on host UID mappings.
container=$(docker create \
  --mount "type=bind,source=$root/test/fixtures/image.html,target=/slides/input.html,readonly" \
  "$image" generic --max-slides 2 --pause 100 \
  file:///slides/input.html image-smoke.pdf)
trap 'docker rm -f "$container" >/dev/null' EXIT
docker start --attach "$container"
test "$(docker inspect --format '{{.State.ExitCode}}' "$container")" = 0
docker cp "$container:/slides/image-smoke.pdf" "$output/image-smoke.pdf"

# Validate the generated PDF using the production pdf-lib dependency in the image.
docker run --rm -i --entrypoint node --workdir /decktape \
  --mount "type=bind,source=$output/image-smoke.pdf,target=/slides/image-smoke.pdf,readonly" \
  "$image" --input-type=module <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

const pdf = await PDFDocument.load(await fs.readFile('/slides/image-smoke.pdf'));
assert.equal(pdf.getPageCount(), 2);
for (const page of pdf.getPages()) {
  assert.ok(Math.abs(page.getWidth() - 960) < 1);
  assert.ok(Math.abs(page.getHeight() - 540) < 1);
}
console.log('Image smoke test passed: exported two 1280×720 slides.');
JS

# Export again with the host UID, as the image must support writing into a bind mounted
# directory it does not own, e.g. with runtimes that do not remap the volume ownership.
volume="$output/volume"
rm -rf "$volume"
mkdir -p "$volume"
docker run --rm --user "$(id -u):$(id -g)" \
  --mount "type=bind,source=$root/test/fixtures,target=/fixtures,readonly" \
  --mount "type=bind,source=$volume,target=/slides" \
  "$image" generic --max-slides 2 --pause 100 \
  file:///fixtures/image.html image-smoke.pdf

test -s "$volume/image-smoke.pdf"

# The home directory must stay within the container, so that Chrome does not
# write its caches into the mounted directory.
stray=$(ls -A "$volume" | grep -v '^image-smoke.pdf$' || true)
test -z "$stray" || {
  echo "Unexpected files written to the mounted volume: $(echo "$stray" | tr '\n' ' ')" >&2
  exit 1
}

echo "Volume smoke test passed: exported into a bind mount as UID $(id -u)."
