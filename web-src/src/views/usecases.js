import { icons } from '../ui/icons.js';

const CASES = [
  {
    title: 'Share credentials with a teammate',
    body: 'Send database passwords, API keys, or SSH private keys to a colleague without leaving them in Slack history, email, or a password manager export. One link, one read, gone.',
  },
  {
    title: 'Send a recovery code',
    body: '2FA backup codes, vault recovery phrases, or account reset tokens. The recipient reads it once, then the link is dead — even if their email is later compromised.',
  },
  {
    title: 'Hand over a client secret',
    body: 'Onboarding a new freelancer or contractor? Deliver their initial password or token through a link that cannot be replayed, forwarded, or archived.',
  },
  {
    title: 'Transmit sensitive personal data',
    body: 'Send your ID number, a bank PIN, or a health document reference to someone you trust, with the guarantee that it will not linger on any server or in any inbox.',
  },
  {
    title: 'Whistleblowing or confidential tips',
    body: 'Journalists and security researchers can receive information through a channel that leaves no trace. Optional password protection adds a second factor the recipient must already know.',
  },
  {
    title: 'Break the chain of screenshots',
    body: 'Any message sent through chat apps sits in history forever, on every device it syncs to. A Secure Note link replaces the message body with a single-use door — once opened, there is nothing left to screenshot later.',
  },
  {
    title: 'Expire with certainty',
    body: 'Need to share something that must be gone by a specific time? Set an expiry from 5 minutes to 30 days. The note destroys itself on read, or on expiry — whichever comes first.',
  },
];

export function renderUseCases(root) {
  root.innerHTML = `
    <section class="page">
      <h1 tabindex="-1">Use cases</h1>
      <p class="lede">Secure Note is useful anywhere a message should exist exactly once and leave no copy behind.</p>

      <div class="usecase-grid">
        ${CASES.map(c => `
          <article class="usecase">
            <h3>${c.title}</h3>
            <p>${c.body}</p>
          </article>
        `).join('')}
      </div>

      <div class="cta">
        <a href="/" class="btn-primary" data-link>
          <span>Create a note</span>
          ${icons.arrowRight()}
        </a>
      </div>
    </section>
  `;
}
