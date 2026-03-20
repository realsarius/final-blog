const baseUrl = (process.env.SECURITY_TEST_BASE_URL ?? "http://localhost:3007").replace(/\/+$/g, "");
const adminEmail = process.env.SECURITY_TEST_ADMIN_EMAIL ?? "";
const adminPassword = process.env.SECURITY_TEST_ADMIN_PASSWORD ?? "";
const enableDbMutationChecks = ["1", "true", "yes", "on"].includes(
  (process.env.SECURITY_TEST_DB_MUTATION ?? "").trim().toLowerCase(),
);
const defaultUploadLimitBytes = 6 * 1024 * 1024;

function resolveUploadLimitBytes() {
  const parsedMb = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? "6");
  if (!Number.isFinite(parsedMb) || parsedMb <= 0) {
    return defaultUploadLimitBytes;
  }
  const clampedMb = Math.min(40, Math.max(1, parsedMb));
  return Math.floor(clampedMb * 1024 * 1024);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function checkRootHeaders() {
  const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
  const csp = response.headers.get("content-security-policy");
  const xfo = response.headers.get("x-frame-options");
  const nosniff = response.headers.get("x-content-type-options");
  const referrer = response.headers.get("referrer-policy");
  const permissions = response.headers.get("permissions-policy");

  assert(Boolean(csp), "content-security-policy header missing");
  assert(xfo === "DENY", "x-frame-options should be DENY");
  assert(nosniff === "nosniff", "x-content-type-options should be nosniff");
  assert(Boolean(referrer), "referrer-policy header missing");
  assert(Boolean(permissions), "permissions-policy header missing");
}

async function checkAdminRedirect() {
  const response = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
  assert([302, 307, 308].includes(response.status), "admin route should redirect without session");
  const location = response.headers.get("location") ?? "";
  assert(location.includes("/login"), "admin redirect should target login");
}

async function checkUploadAuth() {
  const response = await fetch(`${baseUrl}/api/uploads?limit=1`, { redirect: "manual" });
  assert([401, 403].includes(response.status), "uploads endpoint should require auth");
}

async function checkInvalidSessionRedirect() {
  const response = await fetch(`${baseUrl}/admin`, {
    redirect: "manual",
    headers: {
      cookie: "next-auth.session-token=invalid; __Secure-next-auth.session-token=invalid",
    },
  });
  assert([302, 307, 308].includes(response.status), "invalid session should redirect");
  const location = response.headers.get("location") ?? "";
  assert(location.includes("/login"), "invalid session should redirect to login");
}

function extractCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie().map((item) => item.split(";")[0]).join("; ");
  }
  const raw = response.headers.get("set-cookie");
  return raw ? raw.split(",").map((item) => item.split(";")[0]).join("; ") : "";
}

async function loginAsAdmin() {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, { redirect: "manual" });
  assert(csrfResponse.ok, "csrf endpoint failed");
  const csrfData = await csrfResponse.json();
  const csrfToken = typeof csrfData?.csrfToken === "string" ? csrfData.csrfToken : "";
  assert(Boolean(csrfToken), "csrf token missing");
  const csrfCookies = extractCookies(csrfResponse);

  const form = new URLSearchParams();
  form.set("csrfToken", csrfToken);
  form.set("email", adminEmail);
  form.set("password", adminPassword);
  form.set("callbackUrl", `${baseUrl}/admin`);
  form.set("json", "true");

  const callbackResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: csrfCookies,
    },
    body: form.toString(),
  });

  assert(
    [200, 302, 303, 307].includes(callbackResponse.status),
    `admin login failed with status ${callbackResponse.status}`,
  );
  const authCookies = extractCookies(callbackResponse);
  assert(Boolean(authCookies), "admin auth cookies missing");
  return authCookies;
}

async function checkUploadValidationAsAdmin(cookieHeader) {
  const invalidFile = new File([Buffer.from("not-an-image")], "fake.jpg", {
    type: "image/jpeg",
  });
  const invalidForm = new FormData();
  invalidForm.set("file", invalidFile);
  invalidForm.set("folder", "uploads");

  const invalidResponse = await fetch(`${baseUrl}/api/uploads`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: cookieHeader,
    },
    body: invalidForm,
  });
  assert(invalidResponse.status === 400, "invalid image payload should be rejected");

  const oversizeBuffer = Buffer.alloc(resolveUploadLimitBytes() + 1, 0);
  const oversizeFile = new File([oversizeBuffer], "oversize.jpg", { type: "image/jpeg" });
  const oversizeForm = new FormData();
  oversizeForm.set("file", oversizeFile);
  oversizeForm.set("folder", "uploads");

  const oversizeResponse = await fetch(`${baseUrl}/api/uploads`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: cookieHeader,
    },
    body: oversizeForm,
  });
  assert(oversizeResponse.status === 400, "oversize image payload should be rejected");
}

async function checkTokenVersionInvalidation(cookieHeader) {
  if (!enableDbMutationChecks || !adminEmail) {
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
      select: { id: true, tokenVersion: true },
    });
    assert(Boolean(user), "admin user not found for tokenVersion test");

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    const invalidated = await fetch(`${baseUrl}/admin`, {
      redirect: "manual",
      headers: { cookie: cookieHeader },
    });
    assert([302, 307, 308].includes(invalidated.status), "tokenVersion mismatch should invalidate session");
    const location = invalidated.headers.get("location") ?? "";
    assert(location.includes("/login"), "invalidated session should redirect to login");

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: user.tokenVersion },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkRootHeaders();
  await checkAdminRedirect();
  await checkUploadAuth();
  await checkInvalidSessionRedirect();

  if (adminEmail && adminPassword) {
    const cookieHeader = await loginAsAdmin();
    await checkUploadValidationAsAdmin(cookieHeader);
    await checkTokenVersionInvalidation(cookieHeader);
  }

  console.log("security smoke checks passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
