import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import { MongoClient, ServerApiVersion } from "mongodb";

let clientPromise;
let indexesReady = false;

/** Lazily connects once and re-uses the connection (works locally and on serverless hosts). */
export async function getDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

  clientPromise ??= new MongoClient(process.env.MONGODB_URI, {
    serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
    serverSelectionTimeoutMS: 8000,
  })
    .connect()
    .catch((err) => {
      clientPromise = undefined;
      throw err;
    });

  const db = (await clientPromise).db(process.env.MONGODB_DB || "booknook");

  if (!indexesReady) {
    await Promise.all([
      db.collection("books").createIndex({ createdAt: -1 }),
      db.collection("books").createIndex({ userEmail: 1 }),
      // one active borrow per user per book, enforced by the database itself
      db.collection("borrows").createIndex({ bookId: 1, userEmail: 1 }, { unique: true }),
      db.collection("borrows").createIndex({ userEmail: 1 }),
    ]);
    indexesReady = true;
  }
  return db;
}

export const books = async () => (await getDb()).collection("books");
export const borrows = async () => (await getDb()).collection("borrows");
