const prisma = require("../../config/prisma");
const AppError = require("../../utils/AppError");

const {
  findTickets,
  findTicketById,
  findTicketByNumber,
  createTicket,
  createTicketReply,
  createTicketHistory,
  updateTicket,
  getTicketStats,
} = require("../../repositories/admin/adminSupport.repository");

const TICKET_TYPES = [
  "GENERAL",
  "COMPLAINT",
  "USER_REPORT",
  "DRIVER_REPORT",
];

const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

const HISTORY_ACTIONS = {
  CREATED: "CREATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  REPLIED: "REPLIED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
};

const normalizePagination = (page = 1, limit = 50) => {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(
    Math.max(Number(limit) || 50, 1),
    100
  );

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit,
  };
};

const ensureValidTicketType = (type) => {
  if (type && !TICKET_TYPES.includes(type)) {
    throw new AppError("Invalid ticket type", 400);
  }
};

const ensureValidTicketStatus = (status) => {
  if (status && !TICKET_STATUSES.includes(status)) {
    throw new AppError("Invalid ticket status", 400);
  }
};

const getTicketOrThrow = async (id) => {
  const ticket = await findTicketById(id);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  return ticket;
};

const generateTicketNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000);

    const ticketNumber = `GR-${timestamp}-${random}`;

    const existing = await findTicketByNumber(ticketNumber);

    if (!existing) {
      return ticketNumber;
    }
  }

  throw new AppError(
    "Unable to generate unique ticket number",
    500
  );
};

const validateTicketReferences = async ({
  userId,
  driverId,
  rideId,
}) => {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }
  }

  if (driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }
  }

  if (rideId) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: {
        id: true,
        userId: true,
        driverId: true,
      },
    });

    if (!ride) {
      throw new AppError("Ride not found", 404);
    }

    if (userId && ride.userId !== userId) {
      throw new AppError(
        "Ride does not belong to the specified user",
        400
      );
    }

    if (driverId && ride.driverId && ride.driverId !== driverId) {
      throw new AppError(
        "Ride does not belong to the specified driver",
        400
      );
    }
  }
};

const createSupportTicket = async ({
  userId,
  driverId,
  rideId,
  type = "GENERAL",
  subject,
  description,
  adminId,
}) => {
  ensureValidTicketType(type);

  if (!subject || !subject.trim()) {
    throw new AppError("Ticket subject is required", 400);
  }

  if (!description || !description.trim()) {
    throw new AppError("Ticket description is required", 400);
  }

  await validateTicketReferences({
    userId,
    driverId,
    rideId,
  });

  const ticketNumber = await generateTicketNumber();

  return prisma.$transaction(async (tx) => {
    const ticket = await createTicket(
      {
        ticketNumber,
        userId: userId || null,
        driverId: driverId || null,
        rideId: rideId || null,
        type,
        subject: subject.trim(),
        description: description.trim(),
        status: "OPEN",
      },
      tx
    );

    await createTicketHistory(
      {
        ticketId: ticket.id,
        adminId: adminId || null,
        action: HISTORY_ACTIONS.CREATED,
        newStatus: "OPEN",
        message: "Ticket created",
      },
      tx
    );

    return ticket;
  });
};

const getSupportTickets = async ({
  search,
  type,
  status,
  userId,
  driverId,
  rideId,
  page = 1,
  limit = 50,
  sortOrder = "desc",
} = {}) => {
  ensureValidTicketType(type);
  ensureValidTicketStatus(status);

  const pagination = normalizePagination(page, limit);

  const result = await findTickets({
    search: search?.trim(),
    type,
    status,
    userId,
    driverId,
    rideId,
    skip: pagination.skip,
    take: pagination.take,
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  });

  return {
    tickets: result.tickets,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / pagination.limit),
    },
  };
};

const getSupportTicketById = async (id) => {
  return getTicketOrThrow(id);
};

const getSupportTicketByNumber = async (ticketNumber) => {
  const ticket = await findTicketByNumber(ticketNumber);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  return ticket;
};

const updateTicketStatus = async ({
  id,
  status,
  adminId,
  message,
}) => {
  ensureValidTicketStatus(status);

  const ticket = await getTicketOrThrow(id);

  if (ticket.status === status) {
    throw new AppError(
      `Ticket is already ${status}`,
      400
    );
  }

  const allowedTransitions = {
    OPEN: ["IN_PROGRESS", "CLOSED"],
    IN_PROGRESS: ["RESOLVED", "CLOSED", "OPEN"],
    RESOLVED: ["CLOSED", "OPEN"],
    CLOSED: ["OPEN"],
  };

  if (!allowedTransitions[ticket.status]?.includes(status)) {
    throw new AppError(
      `Invalid ticket status transition: ${ticket.status} -> ${status}`,
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedTicket = await updateTicket(
      id,
      {
        status,
      },
      tx
    );

    let action = HISTORY_ACTIONS.STATUS_CHANGED;

    if (status === "RESOLVED") {
      action = HISTORY_ACTIONS.RESOLVED;
    } else if (status === "CLOSED") {
      action = HISTORY_ACTIONS.CLOSED;
    }

    await createTicketHistory(
      {
        ticketId: id,
        adminId: adminId || null,
        action,
        oldStatus: ticket.status,
        newStatus: status,
        message: message?.trim() || null,
      },
      tx
    );

    return updatedTicket;
  });
};

const replyToTicket = async ({
  ticketId,
  adminId,
  message,
}) => {
  if (!adminId) {
    throw new AppError("Admin ID is required", 400);
  }

  if (!message || !message.trim()) {
    throw new AppError("Reply message is required", 400);
  }

  const ticket = await getTicketOrThrow(ticketId);

  if (ticket.status === "CLOSED") {
    throw new AppError(
      "Closed tickets cannot receive replies",
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    const reply = await createTicketReply(
      {
        ticketId,
        adminId,
        message: message.trim(),
      },
      tx
    );

    await createTicketHistory(
      {
        ticketId,
        adminId,
        action: HISTORY_ACTIONS.REPLIED,
        message: "Ticket reply added",
      },
      tx
    );

    return reply;
  });
};

const getTicketReplies = async (ticketId) => {
  await getTicketOrThrow(ticketId);

  const ticket = await findTicketById(ticketId);

  return ticket.replies || [];
};

const getTicketHistory = async (ticketId) => {
  await getTicketOrThrow(ticketId);

  const ticket = await findTicketById(ticketId);

  return ticket.history || [];
};

const getSupportStats = async () => {
  return getTicketStats();
};

module.exports = {
  TICKET_TYPES,
  TICKET_STATUSES,
  HISTORY_ACTIONS,
  normalizePagination,
  createSupportTicket,
  getSupportTickets,
  getSupportTicketById,
  getSupportTicketByNumber,
  updateTicketStatus,
  replyToTicket,
  getTicketReplies,
  getTicketHistory,
  getSupportStats,
};