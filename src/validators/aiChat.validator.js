const { z } = require("zod");

const chatHistoryItemSchema = z.object({
  role: z.enum(["user", "model", "assistant"], {
    message: "History role must be 'user', 'model', or 'assistant'.",
  }),
  content: z
    .string({
      message: "History content is required.",
    })
    .trim()
    .min(1, "History content cannot be empty.")
    .max(2000, "History content cannot exceed 2000 characters."),
});

const aiChatSchema = z.object({
  message: z
    .string({
      message: "Message is required.",
    })
    .trim()
    .min(1, "Message cannot be empty.")
    .max(1000, "Message cannot exceed 1000 characters."),
  history: z
    .array(chatHistoryItemSchema, {
      message: "History must be an array of message objects.",
    })
    .max(10, "Conversation history cannot exceed 10 previous messages.")
    .optional()
    .default([]),
});

module.exports = {
  aiChatSchema,
};
