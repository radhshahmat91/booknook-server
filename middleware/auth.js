import jwt from "jsonwebtoken";

// The Next.js client signs these tokens at /api/token after BetterAuth confirms the session.
const ISSUER = "booknook-web";
const AUDIENCE = "booknook-api";

function readUser(req) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return { error: "Missing token. Please log in." };
  if (!process.env.JWT_SECRET) return { error: "Server is missing JWT_SECRET.", status: 500 };
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return { user: { id: p.sub, email: p.email, name: p.name, photo: p.picture ?? null } };
  } catch (err) {
    return {
      error:
        err.name === "TokenExpiredError"
          ? "Your session expired. Please log in again."
          : "Invalid token. Please log in again.",
    };
  }
}

/** Blocks the request unless a valid JWT is attached. */
export function verifyJWT(req, res, next) {
  const { user, error, status } = readUser(req);
  if (!user) return res.status(status || 401).json({ message: error });
  req.user = user;
  next();
}

/** Attaches req.user when a valid token is present, but never blocks. */
export function optionalJWT(req, _res, next) {
  req.user = readUser(req).user ?? null;
  next();
}
