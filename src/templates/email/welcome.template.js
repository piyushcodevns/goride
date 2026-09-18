const welcomeTemplate = ({ fullName }) => {
  return `
    <h2>Welcome to GoRide 🚖</h2>

    <p>Hi <strong>${fullName}</strong>,</p>

    <p>Your GoRide account has been created successfully.</p>

    <p>We're excited to have you on board.</p>

    <br>

    <p>Thanks,<br>GoRide Team</p>
  `;
};

module.exports = {
  welcomeTemplate,
};