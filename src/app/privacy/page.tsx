import { CONTACT_EMAIL, LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy | Orbit" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Orbit helps you keep track of your professional relationships. This policy explains what we collect, how we
        use it, and the choices you have. In short: your data is used only to run Orbit for you. We don&apos;t sell it,
        we don&apos;t use it for advertising, and you can export or delete it at any time.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account information:</b> your name, email address and password (stored hashed by our authentication provider).</li>
        <li><b>Profile information you provide:</b> school, graduation year, target roles and companies, background and goals.</li>
        <li><b>LinkedIn data you upload:</b> from the export file you download from LinkedIn and choose to upload: your connections (names, companies, titles, profile URLs, connection dates) and your LinkedIn messages.</li>
        <li><b>Google Calendar data (if you connect it):</b> events in your primary calendar from about the last 180 days and next 30 days, including titles, times, descriptions, locations and attendee names and emails.</li>
        <li><b>Gmail data (only for invited beta testers who connect it):</b> emails exchanged with people in your Orbit network: sender, recipients, subject, date and message text. Promotional, newsletter and automated emails are skipped.</li>
        <li><b>Content you create:</b> notes, call logs, reminders and settings.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To show your contacts, timelines, reminders and meeting information.</li>
        <li>To generate AI features for you, such as relationship summaries, open loops, suggested messages, meeting briefs and answers to your questions. To do this, relevant data is sent to our AI provider, Anthropic, which processes it to return a result and does not use it to train its models.</li>
        <li>To keep Orbit secure, prevent abuse and fix problems.</li>
      </ul>
      <p>We never send messages, emails or invitations on your behalf. Suggested messages are drafts you copy and send yourself.</p>

      <h2>Google user data</h2>
      <p>
        Orbit&apos;s use and transfer of information received from Google APIs adheres to the{" "}
        <a className="text-accent" href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
        including the Limited Use requirements. Specifically, we request read-only access, use Google data only to
        provide the features described above, do not transfer it to others except as needed to provide those features
        (such as our AI and hosting providers), comply with applicable law, or as part of a merger or acquisition with
        notice to you; do not use it for advertising; do not sell it; and do not allow humans to read it except with
        your permission, for security purposes, or to comply with law. Google data is never used to train generalized
        AI models.
      </p>

      <h2>Information about other people</h2>
      <p>
        Your contacts&apos; information comes from data you already have access to (your LinkedIn export, calendar and
        email). It is visible only to you, and used only to help you manage your own relationships.
      </p>

      <h2>Who we share it with</h2>
      <p>Only service providers that run Orbit, under contracts that limit their use of your data:</p>
      <ul>
        <li>Supabase (database and authentication) and Vercel (hosting). Data is stored in the United States.</li>
        <li>Anthropic (AI processing).</li>
        <li>Google (only to read the data you authorized).</li>
      </ul>
      <p>We may disclose information if required by law. We do not sell or rent personal information.</p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, access is isolated per account at the database level, and Google access tokens
        are encrypted at rest. No system is perfectly secure, but we work to protect your information.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li><b>Export:</b> Me → Download my data.</li>
        <li><b>Delete:</b> Me → Delete account permanently deletes your account and all associated data within 30 days, including backups.</li>
        <li><b>Disconnect Google:</b> remove Orbit at <a className="text-accent" href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>; synced data stays until you delete it or your account.</li>
      </ul>

      <h2>Age</h2>
      <p>Orbit is intended for people 16 and older and is not directed at children under 13.</p>

      <h2>Changes and contact</h2>
      <p>
        We&apos;ll post updates here and notify you of material changes. Questions or requests:{" "}
        <a className="text-accent" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
