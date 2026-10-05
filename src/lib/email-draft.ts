// Email "drafts" open in the student's own mail app (or Gmail) prefilled; they review and press send there.
// No Google permission needed, and it works with Gmail, Outlook and school email.

export function mailtoHref(to: string, subject: string | null, body: string) {
  const q = new URLSearchParams();
  if (subject) q.set("subject", subject);
  q.set("body", body);
  // URLSearchParams encodes spaces as "+", which mail apps show literally; mailto wants %20.
  return `mailto:${encodeURI(to)}?${q.toString().replace(/\+/g, "%20")}`;
}

export function gmailComposeHref(to: string, subject: string | null, body: string) {
  const q = new URLSearchParams({ view: "cm", fs: "1", to, body });
  if (subject) q.set("su", subject);
  return `https://mail.google.com/mail/?${q.toString()}`;
}
