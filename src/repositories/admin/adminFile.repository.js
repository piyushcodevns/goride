const prisma = require("../../config/prisma");

const createUserDocument = async (data) => {
  return prisma.userDocument.create({
    data,
  });
};

const findUserDocumentById = async (id) => {
  return prisma.userDocument.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });
};

const findUserDocumentByType = async (userId, documentType) => {
  return prisma.userDocument.findUnique({
    where: {
      userId_documentType: {
        userId,
        documentType,
      },
    },
  });
};

const findUserDocuments = async ({
  page = 1,
  limit = 20,
  search,
  documentType,
  userId,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const validSortFields = ["createdAt", "updatedAt", "originalName", "fileSize"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const sortDirection = sortOrder === "asc" ? "asc" : "desc";

  const where = {
    ...(userId && { userId }),
    ...(documentType && { documentType }),
    ...(search && {
      OR: [
        {
          originalName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          documentNumber: {
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
      ],
    }),
  };

  const [documents, total] = await prisma.$transaction([
    prisma.userDocument.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        [sortField]: sortDirection,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    }),
    prisma.userDocument.count({ where }),
  ]);

  return {
    documents,
    total,
  };
};

const updateUserDocument = async (id, data) => {
  return prisma.userDocument.update({
    where: { id },
    data,
  });
};

const deleteUserDocument = async (id) => {
  return prisma.userDocument.delete({
    where: { id },
  });
};

module.exports = {
  createUserDocument,
  findUserDocumentById,
  findUserDocumentByType,
  findUserDocuments,
  updateUserDocument,
  deleteUserDocument,
};
