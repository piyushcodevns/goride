const { execFile } = require("child_process");

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
          const commandError = new Error(
            stderr?.trim() || error.message || "PostgreSQL command failed.",
          );

          commandError.code = error.code;
          commandError.killed = error.killed;

          return reject(commandError);
        }

        resolve({
          stdout,
          stderr,
        });
      },
    );
  });

module.exports = {
  runPostgresCommand,
};
