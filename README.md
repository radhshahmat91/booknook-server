# BookNook Server

REST API for [BookNook](../booknook-client), built with Express and MongoDB. Protected routes verify a JWT issued by the Next.js client.

- **Live API:**https://booknook-client-murex.vercel.app*
- **Client repository:**https://github.com/radhshahmat91/booknook-client

## API

| Method | Route | Access | What it does |
| --- | --- | --- | --- |
| GET | `/books` | public | All books. Query: `limit`, `sort` (`newest`, `oldest`, `title`), `category`, `search`, `mine=true` (needs a token) |
| GET | `/books/:id` | JWT | One book |
| POST | `/books` | JWT | Add a book. `userName`, `userEmail` and `createdAt` come from the token and the server |
| PATCH | `/books/:id` | JWT, owner only | Update a book. Changing `totalCopies` keeps `availableCopies` correct |
| DELETE | `/books/:id` | JWT, owner only | Delete a book |
| POST | `/borrows` | JWT | Borrow a book: `{ bookId, loanDays }` (1 to 14 days) |
| GET | `/borrows` | JWT | The logged-in user's borrows |
| DELETE | `/borrows/:id` | JWT, owner only | Return a book |

Errors come back as `{ "message": "..." }` with a sensible status (400, 401, 403, 404, 409).

### How borrowing stays correct

- The copy is taken with `findOneAndUpdate({ availableCopies: { $gt: 0 } }, { $inc: { availableCopies: -1 } })`, so two readers can't grab the last copy.
- A unique index on `borrows { bookId, userEmail }` makes a double borrow impossible, even with simultaneous requests. It answers `409` and the client shows an error toast.
- Returning deletes the borrow and `$inc`s the copy back, never above `totalCopies`.

## Run it locally

```bash
npm install
cp .env.example .env     # fill in the values
npm run dev              # http://localhost:5000
npm run seed             # optional: adds 13 demo books (npm run seed -- --force resets them)
```

| Variable | What it is |
| --- | --- |
| `MONGODB_URI`, `MONGODB_DB` | Connection string and database (the client uses the same database for its auth tables) |
| `JWT_SECRET` | **Must match `JWT_SECRET` in the client** |
| `CLIENT_URL` | Allowed browser origins for CORS. Comma-separate several, e.g. `http://localhost:3000,https://booknook.vercel.app` |
| `PORT` | Defaults to 5000 |

## Deploy

**Vercel:** import this folder as a project. `vercel.json` is included. Add the four variables above. **Render:** create a Web Service, build command `npm install`, start command `npm start`, and add the same variables.

In MongoDB Atlas, allow network access from anywhere (`0.0.0.0/0`) so a hosted server can connect.
