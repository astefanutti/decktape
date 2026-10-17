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

# Ensure the arbitrary-UID case cannot fall back to an existing user's home directory.
if docker run --rm --entrypoint getent "$image" passwd 12345; then
  echo "UID 12345 must not have a passwd entry for the arbitrary-UID smoke test." >&2
  exit 1
fi

# Check both ownership of a host bind mount and a UID with no passwd entry.
# The latter must run even when the host UID is the image's default UID 1000.
for case_name in host arbitrary; do
  volume="$output/volume-$case_name"
  rm -rf "$volume"
  mkdir -p "$volume"
  if [ "$case_name" = host ]; then
    run_as="$(id -u):$(id -g)"
  else
    run_as=12345:12345
    # Allow this test UID to write without changing ownership of files on the host.
    chmod 1777 "$volume"
  fi

  docker run --rm --user "$run_as" \
    --mount "type=bind,source=$root/test/fixtures,target=/fixtures,readonly" \
    --mount "type=bind,source=$volume,target=/slides" \
    "$image" generic --max-slides 2 --pause 100 \
    file:///fixtures/image.html image-smoke.pdf

  test -s "$volume/image-smoke.pdf"

  # Chrome's caches must stay in the container rather than the mounted output.
  stray=$(ls -A "$volume" | grep -Fxv 'image-smoke.pdf' || true)
  test -z "$stray" || {
    echo "Unexpected files written to the mounted volume: $(echo "$stray" | tr '\n' ' ')" >&2
    exit 1
  }

  echo "Volume smoke test passed: exported into a bind mount as $run_as ($case_name)."
done
