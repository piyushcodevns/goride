const {
  getAvailabilityReport,
  formatAvailabilityReport,
} = require("../ai/ml/availabilityReport");

getAvailabilityReport()
  .then((report) => {
    const output = process.argv.includes("--human")
      ? formatAvailabilityReport(report)
      : JSON.stringify(report, null, 2);
    process.stdout.write(`${output}\n`);
  })
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
