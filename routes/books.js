import { Router } from "express";
import { books, borrows } from "../lib/db.js";
import { optionalJWT, verifyJWT } from "../middleware/auth.js";
import { CATEGORIES, parseId, validateBook } from "../lib/validate.js";

const router = Router();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  title: { title: 1 },
};

// GET /books  (public)  ?limit=6&sort=newest&category=Fiction&search=gatsby&mine=true
router.get("/", optionalJWT, async (req, res) => {
  const { category, search, mine, sort } = req.query;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 0, 0), 100);
  const filter = {};

  if (CATEGORIES.includes(category)) filter.category = category;
  if (typeof search === "string" && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ title: rx }, { author: rx }];
  }
  if (mine === "true") {
    if (!req.user) return res.status(401).json({ message: "Log in to see your books." });
    filter.userEmail = req.user.email;
  }

  let cursor = (await books()).find(filter).sort(SORTS[sort] ?? SORTS.newest);
  if (limit) cursor = cursor.limit(limit);
  res.json(await cursor.toArray());
});

// GET /books/:id  (JWT)
router.get("/:id", verifyJWT, async (req, res) => {
  const _id = parseId(req.params.id);
  if (!_id) return res.status(400).json({ message: "That book id isn't valid." });
  const book = await (await books()).findOne({ _id });
  if (!book) return res.status(404).json({ message: "We couldn't find that book." });
  res.json(book);
});

// POST /books  (JWT)
router.post("/", verifyJWT, async (req, res) => {
  const { data, error } = validateBook(req.body);
  if (error) return res.status(400).json({ message: error });

  const now = new Date();
  const doc = {
    ...data,
    availableCopies: data.totalCopies,
    userName: req.user.name,
    userEmail: req.user.email,
    userPhoto: req.user.photo,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await (await books()).insertOne(doc);
  res.status(201).json({ ...doc, _id: insertedId });
});

// PATCH /books/:id  (JWT, owner only)
router.patch("/:id", verifyJWT, async (req, res) => {
  const _id = parseId(req.params.id);
  if (!_id) return res.status(400).json({ message: "That book id isn't valid." });

  const col = await books();
  const book = await col.findOne({ _id });
  if (!book) return res.status(404).json({ message: "We couldn't find that book." });
  if (book.userEmail !== req.user.email)
    return res.status(403).json({ message: "You can only edit books you added." });

  const { data, error } = validateBook(req.body, true);
  if (error) return res.status(400).json({ message: error });

  const update = { ...data, updatedAt: new Date() };
  if (data.totalCopies !== undefined) {
    // keep availableCopies honest: total minus the copies that are currently out
    const lent = await (await borrows()).countDocuments({ bookId: String(_id) });
    if (data.totalCopies < lent)
      return res.status(400).json({
        message: `${lent} ${lent === 1 ? "copy is" : "copies are"} currently borrowed, so total copies can't go below ${lent}.`,
      });
    update.availableCopies = data.totalCopies - lent;
  }

  res.json(await col.findOneAndUpdate({ _id }, { $set: update }, { returnDocument: "after" }));
});

// DELETE /books/:id  (JWT, owner only)
router.delete("/:id", verifyJWT, async (req, res) => {
  const _id = parseId(req.params.id);
  if (!_id) return res.status(400).json({ message: "That book id isn't valid." });

  const col = await books();
  const book = await col.findOne({ _id });
  if (!book) return res.status(404).json({ message: "We couldn't find that book." });
  if (book.userEmail !== req.user.email)
    return res.status(403).json({ message: "You can only delete books you added." });

  await col.deleteOne({ _id });
  res.json({ deleted: true, _id: String(_id) });
});

export default router;
