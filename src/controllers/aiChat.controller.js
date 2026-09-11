const GeminiService = require("../services/gemini.service");
const { aiChatSchema } = require("../validators/aiChat.validator");

const chat = async (req, res, next) => {
  try {
    const validatedData = aiChatSchema.parse(req.body);

    const userContext = req.user
      ? {
          fullName: req.user.fullName,
          role: req.user.role,
        }
      : null;

    const result = await GeminiService.generateChatResponse({
      message: validatedData.message,
      history: validatedData.history,
      userContext,
    });

    return res.status(200).json({
      success: true,
      data: {
        reply: result.reply,
        role: "model",
        model: result.model,
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      const firstIssue = error.issues?.[0] || error.errors?.[0];
      return res.status(400).json({
        success: false,
        message: firstIssue?.message || "Invalid chat request format.",
      });
    }

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "An error occurred while communicating with the AI Assistant.",
    });
  }
};

module.exports = {
  chat,
};
