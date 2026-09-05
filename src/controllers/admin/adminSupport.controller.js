const supportService = require("../../services/admin/adminSupport.service");

const createTicket = async (req, res, next) => {
  try {
    const ticket = await supportService.createSupportTicket({
      ...req.body,
      adminId: req.admin?.id,
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

const getTickets = async (req, res, next) => {
  try {
    const result = await supportService.getSupportTickets(req.query);

    return res.status(200).json({
      success: true,
      message: "Support tickets fetched successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const ticket = await supportService.getSupportTicketById(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Support ticket fetched successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

const getTicketByNumber = async (req, res, next) => {
  try {
    const ticket =
      await supportService.getSupportTicketByNumber(
        req.params.ticketNumber
      );

    return res.status(200).json({
      success: true,
      message: "Support ticket fetched successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const ticket =
      await supportService.updateTicketStatus({
        id: req.params.id,
        status: req.body.status,
        message: req.body.message,
        adminId: req.admin?.id,
      });

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

const replyToTicket = async (req, res, next) => {
  try {
    const reply =
      await supportService.replyToTicket({
        ticketId: req.params.id,
        adminId: req.admin?.id,
        message: req.body.message,
      });

    return res.status(201).json({
      success: true,
      message: "Ticket reply added successfully",
      data: reply,
    });
  } catch (error) {
    next(error);
  }
};

const getTicketReplies = async (req, res, next) => {
  try {
    const replies =
      await supportService.getTicketReplies(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      message: "Ticket replies fetched successfully",
      data: replies,
    });
  } catch (error) {
    next(error);
  }
};

const getTicketHistory = async (req, res, next) => {
  try {
    const history =
      await supportService.getTicketHistory(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      message: "Ticket history fetched successfully",
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats =
      await supportService.getSupportStats();

    return res.status(200).json({
      success: true,
      message: "Support statistics fetched successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  getTicketByNumber,
  updateStatus,
  replyToTicket,
  getTicketReplies,
  getTicketHistory,
  getStats,
};