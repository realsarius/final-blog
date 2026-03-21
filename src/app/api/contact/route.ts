import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { parsePositiveInt } from "@/lib/parsing";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { getResolvedSiteSettings } from "@/lib/siteSettings";

export const runtime = "nodejs";

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(190),
  topic: z.enum(["isbirligi", "danismanlik", "mentorluk", "diger"]),
  message: z.string().trim().min(10).max(4000),
  website: z.string().optional().default(""),
});

const topicLabels: Record<string, string> = {
  isbirligi: "İş Birliği",
  danismanlik: "Danışmanlık",
  mentorluk: "Mentorluk",
  diger: "Diğer",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function resolveRecipientEmail() {
  const configured = (process.env.CONTACT_TO_EMAIL ?? "").trim().toLowerCase();
  if (configured) {
    return configured;
  }
  const settings = await getResolvedSiteSettings();
  return settings.adminEmail;
}

function resolveFromEmail() {
  return (process.env.CONTACT_FROM_EMAIL ?? "").trim();
}

function buildEmailSubject(topic: string, firstName: string, lastName: string) {
  const topicLabel = topicLabels[topic] ?? topic;
  return `Yeni iletişim talebi • ${topicLabel} • ${firstName} ${lastName}`;
}

function buildPlainTextEmail(input: z.infer<typeof contactSchema>) {
  const topicLabel = topicLabels[input.topic] ?? input.topic;
  return [
    "Siteden yeni bir iletişim mesajı geldi.",
    "",
    `Ad Soyad: ${input.firstName} ${input.lastName}`,
    `E-posta: ${input.email}`,
    `Konu: ${topicLabel}`,
    "",
    "Mesaj:",
    input.message,
  ].join("\n");
}

function buildHtmlEmail(input: z.infer<typeof contactSchema>) {
  const topicLabel = topicLabels[input.topic] ?? input.topic;
  return `
    <div style="margin:0;padding:24px;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#1f1b16;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #ddd0bb;">
        <tr>
          <td style="padding:24px 28px;border-bottom:1px solid #eee3d1;">
            <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8f7f67;">Finalblog İletişim</p>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">Yeni mesajınız var</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#8f7f67;width:140px;">Ad Soyad</td>
                <td style="padding:8px 0;font-size:15px;">${escapeHtml(input.firstName)} ${escapeHtml(input.lastName)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#8f7f67;">E-posta</td>
                <td style="padding:8px 0;font-size:15px;">
                  <a href="mailto:${escapeHtml(input.email)}" style="color:#7a4422;text-decoration:none;">${escapeHtml(input.email)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#8f7f67;">Konu</td>
                <td style="padding:8px 0;font-size:15px;">${escapeHtml(topicLabel)}</td>
              </tr>
            </table>
            <div style="margin-top:18px;padding:14px 16px;background:#fbf8f2;border:1px solid #e9dcc7;">
              <p style="margin:0 0 10px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8f7f67;">Mesaj</p>
              <p style="margin:0;white-space:pre-wrap;font-size:15px;line-height:1.7;">${escapeHtml(input.message)}</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function POST(request: Request) {
  const rateLimitMax = parsePositiveInt(process.env.CONTACT_RATE_LIMIT_MAX, 6);
  const rateLimitWindow = parsePositiveInt(process.env.CONTACT_RATE_LIMIT_WINDOW_SEC, 60);
  const ip = getClientIp({ headers: request.headers });
  const limiter = await rateLimit(`contact:${ip}`, {
    namespace: "contact-form",
    maxAttempts: rateLimitMax,
    windowSeconds: rateLimitWindow,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { ok: false, error: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }

  const validation = contactSchema.safeParse(payload);
  if (!validation.success) {
    return NextResponse.json({ ok: false, error: "Lütfen formu eksiksiz doldurun." }, { status: 400 });
  }

  const data = validation.data;

  // Honeypot: botların doldurduğu gizli alan.
  if (data.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  const from = resolveFromEmail();
  if (!apiKey || !from) {
    return NextResponse.json(
      { ok: false, error: "E-posta servisi yapılandırması eksik." },
      { status: 500 },
    );
  }

  const to = await resolveRecipientEmail();
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      subject: buildEmailSubject(data.topic, data.firstName, data.lastName),
      text: buildPlainTextEmail(data),
      html: buildHtmlEmail(data),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Mesaj gönderilemedi. Lütfen tekrar deneyin." }, { status: 502 });
  }
}
