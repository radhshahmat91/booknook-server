import { Router } from "express";
import { books, borrows } from "../lib/db.js";
import { verifyJWT } from "../middleware/auth.js";
import { parseId } from "../lib/validate.js";

const router = Router();
const DAY = 86_400_000;
const ALREADY = "You've already borrowed this book. Return it before borrowing it again.";

router.use(verifyJWT); // every borrow route needs a valid token

// POST /borrows  { bookId, loanDays? }
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  const bookId = parseId(body.bookId);
  if (!bookId) return res.status(400).json({ message: "A valid bookId is required." });

  const days = body.loanDays === undefined ? 7 : Number(body.loanDays);
  if (!Number.isInteger(days) || days < 1 || days > 14)
    return res.status(400).json({ message: "You can borrow a book for 1 to 14 days." });

  const [bookCol, borrowCol] = [await books(), await borrows()];
  const book = await bookCol.findOne({ _id: bookId });
  if (!book) return res.status(404).json({ message: "We couldn't find that book." });

  const { email, name } = req.user;
  if (await borrowCol.findOne({ bookId: String(bookId), userEmail: email }))
    return res.status(409).json({ message: ALREADY });

  // $inc only when a copy is left, so two people can't take the last copy together
  const taken = await bookCol.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { returnDocument: "after" },
  );
  if (!taken) return res.status(409).json({ message: "No copies of this book are available right now." });

  const now = new Date();
  const doc = {
    bookId: String(bookId),
    bookTitle: book.title,
    bookImage: book.image,
    userEmail: email,
    userName: name,
    borrowDate: now,
    returnDate: new Date(now.getTime() + days * DAY),
  };

  try {
    const { insertedId } = await borrowCol.insertOne(doc);
    res.status(201).json({ borrow: { ...doc, _id: insertedId }, availableCopies: taken.availableCopies });
  } catch (err) {
    await bookCol.updateOne({ _id: bookId }, { $inc: { availableCopies: 1 } }); // give the copy back
    if (err.code === 11000) return res.status(409).json({ message: ALREADY });
    throw err;
  }
});

// GET /borrows  (the logged-in user's borrows)
router.get("/", async (req, res) => {
  const list = await (await borrows())
    .find({ userEmail: req.user.email })
    .sort({ borrowDate: -1 })
    .toArray();
  res.json(list);
});

// DELETE /borrows/:id  (return a book)
router.delete("/:id", async (req, res) => {
  const _id = parseId(req.params.id);
  if (!_id) return res.status(400).json({ message: "That borrow id isn't valid." });

  const borrow = await (await borrows()).findOneAndDelete({ _id, userEmail: req.user.email });
  if (!borrow) return res.status(404).json({ message: "We couldn't find that borrow." });

  const bookId = parseId(borrow.bookId);
  if (bookId)
    await (await books()).updateOne(
      { _id: bookId, $expr: { $lt: ["$availableCopies", "$totalCopies"] } }, // never exceed total
      { $inc: { availableCopies: 1 } },
    );

  res.json({ returned: true, _id: String(_id), bookId: borrow.bookId });
});

export default router;
