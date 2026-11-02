import "dotenv/config";
import express from "express";
import cors from "cors";
import booksRouter from "./routes/books.js";
import borrowsRouter from "./routes/borrows.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();
const origins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: origins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => res.json({ name: "BookNook API", status: "ok" }));
app.use("/books", booksRouter);
app.use("/borrows", borrowsRouter);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
if (!process.env.VERCEL) app.listen(port, () => console.log(`BookNook API running on port ${port}`));

export default app; // Vercel uses this export
