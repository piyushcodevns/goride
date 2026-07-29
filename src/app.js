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

app.use(express.json());

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
