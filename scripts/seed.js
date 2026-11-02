import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import "dotenv/config";
import { books, getDb } from "../lib/db.js";

// Demo shelf so the home page isn't empty. Run: npm run seed   (add --force to reset it)
const OWNER = { userName: "BookNook Library", userEmail: "library@booknook.app", userPhoto: null };
const cover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

const SEED = [
  ["The Great Gatsby", "F. Scott Fitzgerald", "Fiction", "9780743273565", 3, "A summer of parties, longing and money on Long Island, told by a quiet neighbour who sees too much."],
  ["Pride and Prejudice", "Jane Austen", "Fiction", "9780141439518", 2, "Elizabeth Bennet and Mr Darcy trade sharp words and slowly change their minds about each other."],
  ["To Kill a Mockingbird", "Harper Lee", "Fiction", "9780061120084", 4, "Scout Finch grows up in a small Alabama town and learns what courage and fairness really cost."],
  ["A Brief History of Time", "Stephen Hawking", "Science", "9780553380163", 2, "A friendly tour of black holes, the Big Bang and the nature of time, written for curious non-physicists."],
  ["Cosmos", "Carl Sagan", "Science", "9780345539434", 3, "A sweeping walk through the universe, from the first astronomers to the stars we are made of."],
  ["The Selfish Gene", "Richard Dawkins", "Science", "9780198788607", 2, "Why genes behave the way they do, and how that one idea reshaped the way we think about evolution."],
  ["Sapiens", "Yuval Noah Harari", "History", "9780062316097", 3, "A fast, opinionated history of humankind, from the first stone tools to the age of algorithms."],
  ["Guns, Germs, and Steel", "Jared Diamond", "History", "9780393317558", 2, "Why some societies grew powerful while others did not, explained through geography, crops and disease."],
  ["The Diary of a Young Girl", "Anne Frank", "History", "9780553296983", 1, "A teenager's honest diary from two years in hiding, and one of the most widely read voices of its century."],
  ["Charlotte's Web", "E. B. White", "Kids", "9780064400558", 4, "Wilbur the pig is saved by a clever spider with a real talent for words."],
  ["Matilda", "Roald Dahl", "Kids", "9780142410370", 3, "A small girl with a big brain and a love of books outsmarts the grown-ups who underestimate her."],
  ["The Little Prince", "Antoine de Saint-Exupéry", "Others", "9780156012195", 2, "A pilot stranded in the desert meets a small prince who has travelled all the way from a tiny planet."],
  ["Atomic Habits", "James Clear", "Others", "9780735211292", 5, "Small, repeatable changes that add up. A practical guide to building habits that actually stick."],
];

const col = await books();
const force = process.argv.includes("--force");

if (force) await col.deleteMany({ userEmail: OWNER.userEmail });
else if (await col.countDocuments({ userEmail: OWNER.userEmail })) {
  console.log("Demo books already exist. Use `npm run seed -- --force` to reset them.");
  process.exit(0);
}

const base = Date.now();
await col.insertMany(
  SEED.map(([title, author, category, isbn, totalCopies, description], i) => {
    const at = new Date(base - (SEED.length - i) * 60_000); // keeps a stable newest-first order
    return { title, author, category, image: cover(isbn), description, totalCopies, availableCopies: totalCopies, ...OWNER, createdAt: at, updatedAt: at };
  }),
);

console.log(`Seeded ${SEED.length} books into "${(await getDb()).databaseName}".`);
process.exit(0);
