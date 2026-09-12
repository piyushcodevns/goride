const prisma = require("../../config/prisma");

const buildTicketWhere = ({
  search,
  type,
  status,
  userId,
  driverId,
  rideId,
} = {}) => {
  const where = {};

  if (type) where.type = type;
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (driverId) where.driverId = driverId;
  if (rideId) where.rideId = rideId;

  if (search) {
    where.OR = [
      {
        ticketNumber: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        subject: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        user: {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
};

const ticketListInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  driver: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  ride: {
    select: {
      id: true,
      status: true,
      pickup: true,
      destination: true,
      finalFare: true,
      createdAt: true,
    },
  },
};

const ticketDetailInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  driver: {
    select: {
      id: true,
      status: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  ride: {
    select: {
      id: true,
      status: true,
      pickup: true,
      destination: true,
      finalFare: true,
      createdAt: true,
    },
  },
  replies: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
  history: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  },
};

const findTickets = async ({
  search,
  type,
  status,
  userId,
  driverId,
  rideId,
  skip = 0,
  take = 50,
  sortOrder = "desc",
} = {}) => {
  const where = buildTicketWhere({
    search,
    type,
    status,
    userId,
    driverId,
    rideId,
  });

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      include: ticketListInclude,
      orderBy: {
        createdAt: sortOrder,
      },
      skip,
      take,
    }),
    prisma.ticket.count({
      where,
    }),
  ]);

  return {
    tickets,
    total,
  };
};

const findTicketById = async (id) => {
  return prisma.ticket.findUnique({
    where: { id },
    include: ticketDetailInclude,
  });
};

const findTicketByNumber = async (ticketNumber) => {
  return prisma.ticket.findUnique({
    where: { ticketNumber },
  });
};

const createTicket = async (data, tx = prisma) => {
  return tx.ticket.create({
    data,
    include: ticketDetailInclude,
  });
};

const createTicketReply = async (data, tx = prisma) => {
  return tx.ticketReply.create({
    data,
    include: {
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
};

const createTicketHistory = async (data, tx = prisma) => {
  return tx.ticketHistory.create({
    data,
    include: {
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
};

const updateTicket = async (id, data, tx = prisma) => {
  return tx.ticket.update({
    where: { id },
    data,
    include: ticketDetailInclude,
  });
};

const findTicketReplies = async (ticketId) => {
  return prisma.ticketReply.findMany({
    where: { ticketId },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
};

const findTicketHistory = async (ticketId) => {
  return prisma.ticketHistory.findMany({
    where: { ticketId },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
};

const getTicketStats = async () => {
  const [total, open, inProgress, resolved, closed] =
    await prisma.$transaction([
      prisma.ticket.count(),

      prisma.ticket.count({
        where: {
          status: "OPEN",
        },
      }),

      prisma.ticket.count({
        where: {
          status: "IN_PROGRESS",
        },
      }),

      prisma.ticket.count({
        where: {
          status: "RESOLVED",
        },
      }),

      prisma.ticket.count({
        where: {
          status: "CLOSED",
        },
      }),
    ]);

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
  };
};

module.exports = {
  buildTicketWhere,
  findTickets,
  findTicketById,
  findTicketByNumber,
  createTicket,
  createTicketReply,
  createTicketHistory,
  updateTicket,
  findTicketReplies,
  findTicketHistory,
  getTicketStats,
};
