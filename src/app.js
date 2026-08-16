const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");

const errorMiddleware = require("./middleware/error.middleware");
const { NotFoundError } = require("./utils/AppError");

const app = express();

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

const { apiLimiter } = require("./middleware/rateLimit.middleware");

/* ===========================
   Security & Middleware
=========================== */

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(compression());

app.use(cookieParser());

app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("application/json")) {
    return next();
  }

  express.json()(req, res, (err) => {
    if (err && err.type === "entity.parse.failed") {
      req.body = {};
      return next();
    }

    next(err);
  });
});

app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

/* ===========================
   Swagger Docs
=========================== */

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

/* ===========================
   Health Check
=========================== */

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
