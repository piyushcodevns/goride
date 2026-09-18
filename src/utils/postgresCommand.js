const { execFile } = require("child_process");
const { sanitizeString } = require("./redact");

const runPostgresCommand = ({
  executable,
  args,
  timeout = 10 * 60 * 1000,
  env = process.env,
}) =>
  new Promise((resolve, reject) => {
    if (!executable || !Array.isArray(args)) {
      return reject(new Error("Invalid PostgreSQL command configuration."));
    }

    const child = execFile(
      executable,
      args,
      {
        windowsHide: true,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env,
      },
      (error, stdout, stderr) => {
        if (error) {
          const rawMessage =
            stderr?.trim() || error.message || "PostgreSQL command failed.";
          const safeMessage = sanitizeString(rawMessage);

          const commandError = new Error(safeMessage);
          commandError.code = error.code;
          commandError.killed = error.killed;

          return reject(commandError);
        }

        resolve({
          stdout,
          stderr: sanitizeString(stderr || ""),
        });
      },
    );
  });

module.exports = {
  runPostgresCommand,
};
