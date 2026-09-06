const crypto = require("crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;

const normalizeBase32 = (value) => String(value || "").replace(/=+$/g, "").toUpperCase();

const base32Encode = (buffer) => {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let result = "";
  for (let index = 0; index < bits.length; index += 5) {
    result += BASE32_ALPHABET[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return result;
};

const base32Decode = (value) => {
  let bits = "";
  for (const character of normalizeBase32(value)) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) {
      throw new Error("Invalid TOTP secret.");
    }
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
};

const generateSecret = () => base32Encode(crypto.randomBytes(20));

const getTotpStep = (timestamp = Date.now()) =>
  Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS);

const generateTotp = (secret, step) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = crypto
    .createHmac("sha1", base32Decode(secret))
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(code).padStart(6, "0");
};

const verifyTotp = (secret, code, currentStep = getTotpStep()) => {
  const normalizedCode = String(code || "").trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return null;
  }

  for (const step of [currentStep - 1, currentStep, currentStep + 1]) {
    if (
      crypto.timingSafeEqual(
        Buffer.from(generateTotp(secret, step)),
        Buffer.from(normalizedCode),
      )
    ) {
      return step;
    }
  }
  return null;
};

const encryptionKey = () =>
  crypto
    .createHash("sha256")
    .update(String(process.env.ADMIN_2FA_ENCRYPTION_KEY || process.env.JWT_SECRET || ""))
    .digest();

const encryptSecret = (secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher
    .getAuthTag()
    .toString("base64url")}.${encrypted.toString("base64url")}`;
};

const decryptSecret = (value) => {
  const [ivValue, tagValue, encryptedValue] = String(value || "").split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted TOTP secret.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

module.exports = {
  generateSecret,
  getTotpStep,
  generateTotp,
  verifyTotp,
  encryptSecret,
  decryptSecret,
};
