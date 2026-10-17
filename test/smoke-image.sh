#!/usr/bin/env bash
set -euo pipefail

image=${1:?Usage: bash test/smoke-image.sh IMAGE}
root=$(cd "$(dirname "$0")/.." && pwd)
output="$root/test/output"
mkdir -p "$output"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Use the normal image entrypoint and non-root user, without relying on host UID mappings.
container=$(docker create \
  --mount "type=bind,source=$root/test/fixtures/image.html,target=/slides/input.html,readonly" \
  "$image" generic --max-slides 2 --pause 100 \
  file:///slides/input.html image-smoke.pdf)
trap 'docker rm -f "$container" >/dev/null; rm -rf "$tmp"' EXIT
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

arbitrary_uid=12345

# The home directory must be writable by any UID, as the arbitrary-UID case below runs
# with a UID that has no passwd entry to provide one.
docker run --rm --user "$arbitrary_uid:$arbitrary_uid" --entrypoint sh "$image" -c '[ -w "$HOME" ]' || {
  echo "The home directory is not writable by UID $arbitrary_uid." >&2
  exit 1
}

# Copy the fixture, as the checkout may not be readable by the arbitrary UID,
# depending on the umask it has been created with.
fixtures="$tmp/fixtures"
mkdir -p "$fixtures"
cp "$root/test/fixtures/image.html" "$fixtures/"
chmod -R a+rX "$fixtures"

# Check both ownership of a host bind mount and a UID that owns nothing on the host.
# The latter must run even when the host UID is the image's default UID 1000.
for case_name in host arbitrary; do
  volume="$tmp/volume-$case_name"
  mkdir -p "$volume"
  if [ "$case_name" = host ]; then
    run_as="$(id -u):$(id -g)"
  else
    run_as="$arbitrary_uid:$arbitrary_uid"
    # Allow this test UID to write without changing ownership of files on the host.
    chmod 1777 "$volume"
  fi

  docker run --rm --user "$run_as" \
    --mount "type=bind,source=$fixtures,target=/fixtures,readonly" \
    --mount "type=bind,source=$volume,target=/slides" \
    "$image" generic --max-slides 2 --pause 100 \
    file:///fixtures/image.html image-smoke.pdf

  test -s "$volume/image-smoke.pdf" || {
    echo "No PDF exported into the mounted volume ($case_name)." >&2
    exit 1
  }

  # Chrome's caches must stay in the container rather than the mounted output.
  stray=$(ls -A "$volume" | grep -Fxv 'image-smoke.pdf' || true)
  test -z "$stray" || {
    echo "Unexpected files written to the mounted volume ($case_name): $(echo "$stray" | tr '\n' ' ')" >&2
    exit 1
  }

  echo "Volume smoke test passed: exported into a bind mount as $run_as ($case_name)."
done
