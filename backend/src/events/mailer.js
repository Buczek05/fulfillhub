const nodemailer = require("nodemailer");

// W dev i na demo SMTP to Mailpit – maile nie wychodzą na świat, widać je na http://localhost:8025.
function createMailer({ config, logger = console }) {
  const transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    // Mailpit nie wymaga logowania ani TLS-a.
    tls: { rejectUnauthorized: false },
  });

  async function send({ to, subject, text }) {
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (recipients.length === 0) return;

    await transport.sendMail({ from: config.mail.from, to: recipients.join(", "), subject, text });
    logger.log(`[mail] "${subject}" -> ${recipients.join(", ")}`);
  }

  return { send };
}

module.exports = { createMailer };
