const assert = require("node:assert/strict");
const test = require("node:test");
const { createWindowOptions, isAllowedExternalUrl } = require("../window-options");

test("desktop window isolates renderer content", () => {
  const options = createWindowOptions("/tmp/preload.js");
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.preload, "/tmp/preload.js");
  assert.equal(options.minWidth, 1024);
  assert.equal(options.minHeight, 700);
});

test("external navigation allows only HTTP and HTTPS", () => {
  assert.equal(isAllowedExternalUrl("https://optrizo.com"), true);
  assert.equal(isAllowedExternalUrl("http://127.0.0.1:3000"), true);
  assert.equal(isAllowedExternalUrl("file:///etc/passwd"), false);
  assert.equal(isAllowedExternalUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedExternalUrl("not a url"), false);
});
