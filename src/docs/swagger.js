const swaggerJsdoc = require("swagger-jsdoc");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "GoRide Backend API",
      version: "1.0.0",
      description:
        "Production-ready Ride Booking API built with Node.js, Express.js, Prisma ORM and PostgreSQL.",
      contact: {
        name: "GoRide Backend",
      },
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token as: Bearer <your_token>",
        },
      },

      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Operation completed successfully.",
            },
            data: {
              nullable: true,
            },
          },
        },

        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Validation failed.",
            },
          },
        },

        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "clxxxxxxxxxxxxx",
            },
            fullName: {
              type: "string",
              example: "Piyush Maurya",
            },
            email: {
              type: "string",
              example: "piyush@example.com",
            },
            phone: {
              type: "string",
              example: "9876543210",
            },
            role: {
              type: "string",
              example: "CUSTOMER",
            },
            isVerified: {
              type: "boolean",
              example: true,
            },
          },
        },

        Driver: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            licenseNumber: {
              type: "string",
            },
            experience: {
              type: "integer",
              example: 5,
            },
            availability: {
              type: "string",
              enum: ["OFFLINE", "AVAILABLE", "BUSY"],
            },
          },
        },

        Vehicle: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            vehicleNumber: {
              type: "string",
            },
            vehicleType: {
              type: "string",
              enum: ["BIKE", "AUTO", "CAR"],
            },
            brand: {
              type: "string",
            },
            model: {
              type: "string",
            },
            color: {
              type: "string",
            },
            seats: {
              type: "integer",
            },
          },
        },

        Ride: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            pickup: {
              type: "string",
            },
            destination: {
              type: "string",
            },
            pickupLatitude: {
              type: "number",
              example: 25.3176,
            },
            pickupLongitude: {
              type: "number",
              example: 82.9739,
            },
            destinationLatitude: {
              type: "number",
              example: 25.2677,
            },
            destinationLongitude: {
              type: "number",
              example: 82.9913,
            },
            estimatedArrival: {
              type: "integer",
              example: 15,
            },
            distance: {
              type: "number",
              example: 12.5,
            },
            duration: {
              type: "number",
              example: 28,
            },
            fare: {
              type: "number",
              example: 185,
            },
            vehicleType: {
              type: "string",
              enum: ["BIKE", "AUTO", "CAR"],
            },
            status: {
              type: "string",
              enum: [
                "REQUESTED",
                "ACCEPTED",
                "ARRIVED",
                "STARTED",
                "COMPLETED",
                "CANCELLED",
              ],
            },
          },
        },

        RegisterRequest: {
          type: "object",
          required: ["fullName", "email", "phone", "password"],
          properties: {
            fullName: {
              type: "string",
              example: "Piyush Maurya",
            },
            email: {
              type: "string",
              format: "email",
              example: "piyush@example.com",
            },
            phone: {
              type: "string",
              example: "9876543210",
            },
            password: {
              type: "string",
              example: "Password@123",
            },
          },
        },

        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "piyush@example.com",
            },
            password: {
              type: "string",
              example: "Password@123",
            },
          },
        },

        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "piyush@example.com",
            },
          },
        },

        ResetPasswordRequest: {
          type: "object",
          required: ["token", "password", "confirmPassword"],
          properties: {
            token: {
              type: "string",
              example: "reset_token_here",
            },
            password: {
              type: "string",
              example: "Password@123",
            },
            confirmPassword: {
              type: "string",
              example: "Password@123",
            },
          },
        },

        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword", "confirmPassword"],
          properties: {
            currentPassword: {
              type: "string",
              example: "OldPassword@123",
            },
            newPassword: {
              type: "string",
              example: "NewPassword@123",
            },
            confirmPassword: {
              type: "string",
              example: "NewPassword@123",
            },
          },
        },

        VerifyEmailRequest: {
          type: "object",
          required: ["token"],
          properties: {
            token: {
              type: "string",
              example: "verification_token_here",
            },
          },
        },
        DriverRegisterRequest: {
          type: "object",
          required: ["licenseNumber", "aadharNumber", "experience"],
          properties: {
            licenseNumber: {
              type: "string",
              example: "UP65DL1234567890",
            },
            aadharNumber: {
              type: "string",
              example: "123412341234",
            },
            experience: {
              type: "integer",
              example: 5,
            },
          },
        },

        UpdateDriverRequest: {
          type: "object",
          properties: {
            licenseNumber: {
              type: "string",
              example: "UP65DL1234567890",
            },
            aadharNumber: {
              type: "string",
              example: "123412341234",
            },
            experience: {
              type: "integer",
              example: 6,
            },
            availability: {
              type: "string",
              enum: ["OFFLINE", "AVAILABLE", "BUSY"],
              example: "AVAILABLE",
            },
          },
        },

        CreateVehicleRequest: {
          type: "object",
          required: [
            "vehicleNumber",
            "vehicleType",
            "brand",
            "model",
            "color",
            "seats",
          ],
          properties: {
            vehicleNumber: {
              type: "string",
              example: "UP65AB1234",
            },
            vehicleType: {
              type: "string",
              enum: ["BIKE", "AUTO", "CAR"],
              example: "CAR",
            },
            brand: {
              type: "string",
              example: "Maruti",
            },
            model: {
              type: "string",
              example: "Swift",
            },
            color: {
              type: "string",
              example: "White",
            },
            seats: {
              type: "integer",
              example: 4,
            },
          },
        },

        UpdateVehicleRequest: {
          type: "object",
          properties: {
            vehicleType: {
              type: "string",
              enum: ["BIKE", "AUTO", "CAR"],
              example: "CAR",
            },
            brand: {
              type: "string",
              example: "Hyundai",
            },
            model: {
              type: "string",
              example: "i20",
            },
            color: {
              type: "string",
              example: "Black",
            },
            seats: {
              type: "integer",
              example: 5,
            },
          },
        },

        CreateRideRequest: {
          type: "object",
          required: ["pickup", "destination", "vehicleType"],
          properties: {
            pickup: {
              type: "string",
              example: "Varanasi Cantt",
            },
            destination: {
              type: "string",
              example: "BHU Gate",
            },
            pickupLatitude: {
              type: "number",
              example: 25.3176,
            },
            pickupLongitude: {
              type: "number",
              example: 82.9739,
            },
            destinationLatitude: {
              type: "number",
              example: 25.2677,
            },
            destinationLongitude: {
              type: "number",
              example: 82.9913,
            },
            vehicleType: {
              type: "string",
              enum: ["BIKE", "AUTO", "CAR"],
              example: "CAR",
            },
          },
        },

        UpdateRideStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED"],
              example: "STARTED",
            },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "cmsa5u7dw0003wvlsdfu9tpn3",
            },
            rideId: {
              type: "string",
            },
            userId: {
              type: "string",
            },
            amount: {
              type: "number",
              example: 114.45,
            },
            paymentMethod: {
              type: "string",
              enum: ["CASH", "UPI", "CARD", "WALLET"],
              example: "UPI",
            },
            status: {
              type: "string",
              enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"],
              example: "PENDING",
            },
            gateway: {
              type: "string",
              example: "RAZORPAY",
            },
            transactionId: {
              type: "string",
              nullable: true,
              example: "pay_xxxxxxxxx",
            },
            paidAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },

        CreatePaymentRequest: {
          type: "object",
          required: ["rideId", "paymentMethod"],
          properties: {
            rideId: {
              type: "string",
              example: "cms9yytcd0001wvlsu42lgydr",
            },
            paymentMethod: {
              type: "string",
              enum: ["CASH", "UPI", "CARD", "WALLET"],
              example: "UPI",
            },
            gateway: {
              type: "string",
              example: "RAZORPAY",
            },
          },
        },

        UpdatePaymentStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["PROCESSING", "SUCCESS", "FAILED", "REFUNDED"],
              example: "SUCCESS",
            },
            transactionId: {
              type: "string",
              example: "pay_xxxxxxxxx",
            },
          },
        },
        Coupon: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "cmsal95ab0001wva8f7ds87xx",
            },
            code: {
              type: "string",
              example: "SAVE200",
            },
            description: {
              type: "string",
              example: "Flat ₹200 off",
              nullable: true,
            },
            type: {
              type: "string",
              enum: ["FLAT", "PERCENTAGE"],
              example: "FLAT",
            },
            discountValue: {
              type: "number",
              example: 200,
            },
            minimumRideFare: {
              type: "number",
              example: 500,
            },
            maximumDiscount: {
              type: "number",
              nullable: true,
              example: null,
            },
            usageLimit: {
              type: "integer",
              example: 1000,
            },
            perUserUsageLimit: {
              type: "integer",
              example: 1,
            },
            usedCount: {
              type: "integer",
              example: 0,
            },
            validFrom: {
              type: "string",
              format: "date-time",
            },
            validUntil: {
              type: "string",
              format: "date-time",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
          },
        },

        CreateCouponRequest: {
          type: "object",
          required: [
            "code",
            "type",
            "discountValue",
            "validFrom",
            "validUntil",
          ],
          properties: {
            code: {
              type: "string",
              example: "SAVE200",
            },
            description: {
              type: "string",
              example: "Flat ₹200 off",
            },
            type: {
              type: "string",
              enum: ["FLAT", "PERCENTAGE"],
              example: "FLAT",
            },
            discountValue: {
              type: "number",
              example: 200,
            },
            minimumRideFare: {
              type: "number",
              example: 500,
            },
            maximumDiscount: {
              type: "number",
              nullable: true,
              example: null,
            },
            usageLimit: {
              type: "integer",
              example: 1000,
            },
            perUserUsageLimit: {
              type: "integer",
              example: 1,
            },
            validFrom: {
              type: "string",
              format: "date-time",
              example: "2026-08-01T00:00:00.000Z",
            },
            validUntil: {
              type: "string",
              format: "date-time",
              example: "2026-12-31T23:59:59.000Z",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
          },
        },

        UpdateCouponRequest: {
          type: "object",
          properties: {
            code: {
              type: "string",
              example: "NEW200",
            },
            description: {
              type: "string",
              example: "Updated coupon",
            },
            discountValue: {
              type: "number",
              example: 250,
            },
            minimumRideFare: {
              type: "number",
              example: 600,
            },
            maximumDiscount: {
              type: "number",
              nullable: true,
              example: null,
            },
            usageLimit: {
              type: "integer",
              example: 2000,
            },
            perUserUsageLimit: {
              type: "integer",
              example: 2,
            },
            isActive: {
              type: "boolean",
              example: true,
            },
          },
        },

        ValidateCouponRequest: {
          type: "object",
          required: ["code", "rideFare"],
          properties: {
            code: {
              type: "string",
              example: "SAVE200",
            },
            rideFare: {
              type: "number",
              example: 800,
            },
          },
        },

        ApplyCouponRequest: {
          type: "object",
          required: ["code", "rideId"],
          properties: {
            code: {
              type: "string",
              example: "SAVE200",
            },
            rideId: {
              type: "string",
              example: "cms9yytcd0001wvlsu42lgydr",
            },
          },
        },
      },
    },
  },

  apis: ["./src/routes/**/*.js"],
};

module.exports = swaggerJsdoc(swaggerOptions);
