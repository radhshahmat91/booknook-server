export const notFound = (req, res) =>
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found.` });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ message: "Request body must be valid JSON." });
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server. Please try again." });
};
