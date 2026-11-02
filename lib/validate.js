import { ObjectId } from "mongodb";

export const CATEGORIES = ["Fiction", "Science", "History", "Kids", "Others"];

/** Returns an ObjectId for a valid 24-char hex id, otherwise null. */
export const parseId = (id) =>
  typeof id === "string" && /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;

const clean = (v) => (typeof v === "string" ? v.trim() : "");

const rules = {
  title: (v) => (v.length >= 2 && v.length <= 120) || "Title must be 2 to 120 characters.",
  author: (v) => (v.length >= 2 && v.length <= 80) || "Author must be 2 to 80 characters.",
  description: (v) =>
    (v.length >= 10 && v.length <= 1000) || "Description must be 10 to 1000 characters.",
  image: (v) => /^https?:\/\/\S+$/i.test(v) || "Image must be a valid http(s) URL.",
  category: (v) => CATEGORIES.includes(v) || `Category must be one of: ${CATEGORIES.join(", ")}.`,
};

/** partial=true lets PATCH send only the fields that changed. */
export function validateBook(body = {}, partial = false) {
  const data = {};
  for (const [key, check] of Object.entries(rules)) {
    if (partial && body[key] === undefined) continue;
    const value = clean(body[key]);
    const result = check(value);
    if (result !== true) return { error: result };
    data[key] = value;
  }
  if (!partial || body.totalCopies !== undefined) {
    const n = Number(body.totalCopies);
    if (!Number.isInteger(n) || n < 1 || n > 99)
      return { error: "Total copies must be a whole number from 1 to 99." };
    data.totalCopies = n;
  }
  return { data };
}
