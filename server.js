// server.js
import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Convert __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local imports (make sure all your files use .js extensions)
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import uploadRoute from "./routes/upload.js";
import walletRoutes from "./routes/walletRoutes.js";
import logger from "./utils/logger.js";
import { createInitialWallet } from "./utils/walletGenerator.js";
import {
  createAddressForOwner,
  generateNextAddress,
} from "./utils/addressCreator.js";

dotenv.config();

const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Access log stream
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, "access.log"),
  { flags: "a" }
);

// Morgan logging
app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("dev")); // console logging

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1", authRoutes);
app.use("/api/v1", uploadRoute);
app.use("/api/v1/wallet", walletRoutes);

// Swagger
const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Connect DB and start server
connectDB().then(async () => {
  const userId = "admin";
  // await createInitialWallet(userId);
  await createAddressForOwner(userId, 0);
  // await generateNextAddress(userId);

  app.listen(process.env.PORT, () =>
    logger.info(`🚀 Server running on http://localhost:${process.env.PORT}`)
  );
});
