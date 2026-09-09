const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");

const errorMiddleware = require("./middleware/error.middleware");
const { correlationMiddleware } = require("./middleware/correlation.middleware");
const { NotFoundError } = require("./utils/AppError");

const healthRoutes = require("./routes/health.routes");

const app = express();
app.set("trust proxy", 1);
app.use(correlationMiddleware);
const adminMonitoringRoutes = require("./routes/admin/adminMonitoring.routes");
const adminBackupRoutes = require("./routes/admin/adminBackup.routes");
const adminRbacRoutes = require("./routes/admin/adminRbac.routes");
const adminAiRoutes = require("./routes/admin/adminAi.routes");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const driverRoutes = require("./routes/driver.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const rideRoutes = require("./routes/ride.routes");
const rideReviewRoutes = require("./routes/rideReview.routes");
const paymentRoutes = require("./routes/payment.routes");
const couponRoutes = require("./routes/coupon.routes");
const fareRoutes = require("./routes/fare.routes");
const fareAuditRoutes = require("./routes/fareAudit.routes");
const mapsRoutes = require("./routes/maps.routes");
const notificationRoutes = require("./routes/notification.routes");
const adminAuthRoutes = require("./routes/admin/adminAuth.routes");
const adminDashboardRoutes = require("./routes/admin/adminDashboard.routes.js");
const adminUserRoutes = require("./routes/admin/adminUser.routes");
const adminDriverRoutes = require("./routes/admin/adminDriver.routes");
const adminVehicleRoutes = require("./routes/admin/adminVehicle.routes");
const adminRideRoutes = require("./routes/admin/adminRide.routes");
const adminPaymentRoutes = require("./routes/admin/adminPayment.routes");
const adminCouponRoutes = require("./routes/admin/adminCoupon.routes");
const adminPricingRoutes = require("./routes/admin/adminPricing.routes");
const adminMapsRoutes = require("./routes/admin/adminMaps.routes");
const adminReportsRoutes = require("./routes/admin/adminReports.routes");
const adminAnalyticsRoutes = require("./routes/admin/adminAnalytics.routes");
const adminNotificationRoutes = require("./routes/admin/adminNotification.routes");
const adminSettingsRoutes = require("./routes/admin/adminSettings.routes");
const adminAuditRoutes = require("./routes/admin/adminAudit.routes");
const adminSupportRoutes = require("./routes/admin/adminSupport.routes");
const adminFileRoutes = require("./routes/admin/adminFile.routes");

const { apiLimiter } = require("./middleware/rateLimit.middleware");

/* ===========================
   Security & Middleware
=========================== */

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: process.env.NODE_ENV === "production",
    noSniff: true,
    referrerPolicy: { policy: "no-referrer" },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(compression());

app.use(cookieParser());

app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("application/json")) {
    return next();
  }

  express.json({ limit: "1mb" })(req, res, (err) => {
    if (err && err.type === "entity.parse.failed") {
      return res.status(400).json({
        success: false,
        message: "Malformed JSON request body.",
      });
    }

    next(err);
  });
});

app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
      skip: (req) => req.path === "/" || req.path.startsWith("/health"),
    })
  );
}

/* ===========================
   Swagger Docs
=========================== */

if (process.env.NODE_ENV !== "production" || process.env.SWAGGER_ENABLED === "true") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

/* ===========================
   Rate Limiter
=========================== */

app.use("/api", apiLimiter);

/* ===========================
   Routes
=========================== */

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/driver", driverRoutes);

app.use("/api/driver/vehicle", vehicleRoutes);

app.use("/api/rides", rideRoutes);

app.use("/api/ride-reviews", rideReviewRoutes);

app.use("/api/payments", paymentRoutes);

app.use("/api/coupons", couponRoutes);

app.use("/api/fare", fareRoutes);

app.use("/api/fare-audit", fareAuditRoutes);

app.use("/api/maps", mapsRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/admin/auth", adminAuthRoutes);

app.use("/api/admin/dashboard", adminDashboardRoutes);

app.use("/api/admin/users", adminUserRoutes);

app.use("/api/admin/drivers", adminDriverRoutes);

app.use("/api/admin/vehicles", adminVehicleRoutes);

app.use("/api/admin/rides", adminRideRoutes);

app.use("/api/admin/payments", adminPaymentRoutes);

app.use("/api/admin/coupons", adminCouponRoutes);

app.use("/api/admin/pricing", adminPricingRoutes);

app.use("/api/admin/maps", adminMapsRoutes);

app.use("/api/admin/reports", adminReportsRoutes);

app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);

app.use("/api/admin/settings", adminSettingsRoutes);

app.use("/api/admin/audit-logs", adminAuditRoutes);

app.use("/api/admin/support", adminSupportRoutes);

app.use("/api/admin/files", adminFileRoutes);
app.use("/api/admin/monitoring", adminMonitoringRoutes);
app.use("/api/admin/backups", adminBackupRoutes);
app.use("/api/admin/rbac", adminRbacRoutes);
app.use("/api/admin/ai", adminAiRoutes);

/* ===========================
   Health Check
=========================== */

app.use("/health", healthRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: GoRide API service status
 *     description: Returns runtime service health and API version metadata.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is operational.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "🚖 GoRide Backend API Running"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚖 GoRide Backend API Running",
    version: "1.0.0",
    status: "OK",
    timestamp: new Date(),
  });
});

/* ===========================
   404 Handler
=========================== */

app.use((req, res, next) => {
  next(new NotFoundError("API Route Not Found"));
});

/* ===========================
   Global Error Handler
=========================== */

app.use(errorMiddleware);

module.exports = app;
