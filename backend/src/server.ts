import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import { noSqlSanitizer } from "./middleware/security";

// Configurations and Routes
import { connectDB } from "./config/db";
import "./config/firebase";
import userRoutes from "./routes/userRoutes";
import phoneRoutes from "./routes/phoneRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import discussionRoutes from "./routes/discussionRoutes";
import scraperRoutes from "./routes/scraperRoutes";
import chatbotRoutes from "./routes/chatbotRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import { initializeEmailService } from "./services/emailService";
import { startDailyDigestScheduler } from "./services/notificationService";
import trendsRoutes from "./routes/trendsRoutes";
import inAppNotificationRoutes from "./routes/inAppNotificationRoutes";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5001;

// ------------------------------------------------------------
// | NETWORK AND PROXY SETTINGS
// -----------------------------------------------------------
app.set("trust proxy", 1); // Gets client's real IP from x-forwarded-for header rather than IP of load balancer/server

// ------------------------------------------------------------
// | TRANSPORT AND HEADER SECURITY
// -----------------------------------------------------------
// HTML header information minimization
app.use(helmet());

// CORS setup
app.use(
  cors({
    // Allows request from the following server URLs
    origin: "http://localhost:3000", // Frontend URL (CHANGE URL HERE ON PRODUCTION)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ------------------------------------------------------------
// | TRAFFIC AND DOS PROTECTION
// -----------------------------------------------------------
// Rate limiter
// Standard API Limiter (100 to 500 requests per 15 minutes)
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { message: "Too many requests to core services. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// High-Frequency API Limiter (for real time searches, tickers, and chatbot streaming)
const highFrequencyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // Shorter 5-minute window
  max: 300,
  message: { message: "High volume interaction detected. Please slow down your requests." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ------------------------------------------------------------
// | DATA PARSING AND SANITIZATION
// -----------------------------------------------------------
// JSON parser
app.use(express.json({ limit: "10kb" })); // Guard against large payload DoS

// Data sanitization
app.use(noSqlSanitizer); // NoSQL query sanitization against injection attacks
app.use(hpp()); // HTTP sanitization against input manipulation attacks

// ------------------------------------------------------------
// | DATABASE AND API ROUTES
// -----------------------------------------------------------
connectDB();
initializeEmailService();

// -- More Forgiving Limiter --
app.use("/api/chatbot", highFrequencyLimiter, chatbotRoutes);
app.use("/api/trends", highFrequencyLimiter, trendsRoutes);

// -- Standard Limiters --
app.use("/api/users", standardLimiter, userRoutes);
app.use("/api/phones", standardLimiter, phoneRoutes);
app.use("/api/phones", standardLimiter, reviewRoutes); // Review routes nested under phones
app.use("/api/discussions", standardLimiter, discussionRoutes); // Discussion thread routes
app.use("/api/scraper", standardLimiter, scraperRoutes);
app.use("/api/analytics", standardLimiter, analyticsRoutes);
app.use("/api/notifications", standardLimiter, inAppNotificationRoutes);

// ------------------------------------------------------------
// | HEALTH CHECK AND ERROR HANDLING
// -----------------------------------------------------------
app.get("/", (req: Request, res: Response) => {
  res.send("API is running.");
});

// Starting server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startDailyDigestScheduler();
});
