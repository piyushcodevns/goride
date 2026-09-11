const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const SMTPProvider = require("../src/providers/email/smtp.provider");
const { EmailProviderError } = require("../src/utils/AppError");

describe("SMTPProvider (Brevo / Nodemailer)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("1. Missing SMTP credentials throws EmailProviderError", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const provider = new SMTPProvider();

    await assert.rejects(
      async () => {
        await provider.send({
          to: "customer@example.com",
          subject: "Test Subject",
          text: "Test content",
        });
      },
      (err) => {
        assert.ok(err instanceof EmailProviderError);
        assert.match(err.message, /SMTP credentials are not configured/i);
        return true;
      }
    );
  });

  test("2. Missing recipient email address throws EmailProviderError", async () => {
    const provider = new SMTPProvider({
      transporter: {
        sendMail: async () => ({ messageId: "<msg-1@test>" }),
      },
    });

    await assert.rejects(
      async () => {
        await provider.send({
          to: "",
          subject: "Test Subject",
        });
      },
      (err) => {
        assert.ok(err instanceof EmailProviderError);
        assert.match(err.message, /recipient email address is required/i);
        return true;
      }
    );
  });

  test("3. Missing subject throws EmailProviderError", async () => {
    const provider = new SMTPProvider({
      transporter: {
        sendMail: async () => ({ messageId: "<msg-1@test>" }),
      },
    });

    await assert.rejects(
      async () => {
        await provider.send({
          to: "user@example.com",
          subject: "",
        });
      },
      (err) => {
        assert.ok(err instanceof EmailProviderError);
        assert.match(err.message, /subject is required/i);
        return true;
      }
    );
  });

  test("4. Successful sendMail returns normalized response object", async () => {
    let capturedMailOptions = null;
    const mockTransporter = {
      sendMail: async (options) => {
        capturedMailOptions = options;
        return {
          messageId: "<test-msg-123@smtp-relay.brevo.com>",
          response: "250 Message accepted",
          accepted: ["customer@gmail.com"],
          rejected: [],
        };
      },
    };

    const provider = new SMTPProvider({
      transporter: mockTransporter,
      from: "GoRide <noreply@goride.com>",
    });

    const result = await provider.send({
      to: "customer@gmail.com",
      subject: "Verify your email",
      html: "<p>Your OTP is 123456</p>",
      text: "Your OTP is 123456",
    });

    assert.equal(result.messageId, "<test-msg-123@smtp-relay.brevo.com>");
    assert.equal(result.id, "<test-msg-123@smtp-relay.brevo.com>");
    assert.equal(result.response, "250 Message accepted");
    assert.deepEqual(result.accepted, ["customer@gmail.com"]);
    assert.equal(capturedMailOptions.from, "GoRide <noreply@goride.com>");
    assert.equal(capturedMailOptions.to, "customer@gmail.com");
    assert.equal(capturedMailOptions.subject, "Verify your email");
    assert.equal(capturedMailOptions.html, "<p>Your OTP is 123456</p>");
    assert.equal(capturedMailOptions.text, "Your OTP is 123456");
  });

  test("5. Array recipient list is formatted properly", async () => {
    let capturedTo = null;
    const mockTransporter = {
      sendMail: async (options) => {
        capturedTo = options.to;
        return { messageId: "<msg-array@test>" };
      },
    };

    const provider = new SMTPProvider({
      transporter: mockTransporter,
    });

    await provider.send({
      to: ["user1@gmail.com", "user2@gmail.com"],
      subject: "Bulk Notification",
      text: "Hello all",
    });

    assert.equal(capturedTo, "user1@gmail.com, user2@gmail.com");
  });

  test("6. Upstream SMTP failure is caught and wrapped into EmailProviderError without leaking credentials", async () => {
    const mockTransporter = {
      sendMail: async () => {
        const smtpErr = new Error("Invalid login: 535 Authentication failed");
        smtpErr.code = "EAUTH";
        smtpErr.responseCode = 535;
        throw smtpErr;
      },
    };

    const provider = new SMTPProvider({
      transporter: mockTransporter,
    });

    await assert.rejects(
      async () => {
        await provider.send({
          to: "victim@example.com",
          subject: "Test",
          text: "Body",
        });
      },
      (err) => {
        assert.ok(err instanceof EmailProviderError);
        assert.equal(err.statusCode, 502);
        assert.match(err.message, /SMTP delivery failed \[EAUTH\]/);
        return true;
      }
    );
  });

  test("7. Transporter caching creates one instance per configuration", () => {
    process.env.SMTP_HOST = "smtp-relay.brevo.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "brevo-user";
    process.env.SMTP_PASS = "brevo-pass";

    const provider = new SMTPProvider();
    const t1 = provider.getTransporter();
    const t2 = provider.getTransporter();

    assert.strictEqual(t1, t2, "Transporter instance must be cached for identical config");

    // Change config
    process.env.SMTP_USER = "different-user";
    const t3 = provider.getTransporter();
    assert.notStrictEqual(t1, t3, "Transporter must be refreshed when credentials change");
  });

  test("8. verifyConnection calls transporter.verify()", async () => {
    let verified = false;
    const mockTransporter = {
      verify: async () => {
        verified = true;
        return true;
      },
    };

    const provider = new SMTPProvider({
      transporter: mockTransporter,
    });

    const result = await provider.verifyConnection();
    assert.equal(result, true);
    assert.equal(verified, true);
  });
});
