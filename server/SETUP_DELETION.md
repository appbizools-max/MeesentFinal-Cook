# 🗑️ 90-Day Account Deletion Setup Guide

## How it works

When a user deletes their account in the Meesent app:
1. Their **Firebase Auth** account is deleted immediately
2. Their **Firestore `users` document** is marked with:
   - `accountDeleted: true`
   - `deletedAt: <timestamp>`
   - `scheduledPermanentDeleteAt: <deletedAt + 90 days>`
3. The **server runs a cron job every day at 2:00 AM IST**
4. It finds all users where `accountDeleted = true` AND `scheduledPermanentDeleteAt <= today`
5. It **permanently deletes ALL their data** from Firestore and Firebase Auth

---

## Step 1 — Download the Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → `meesent-543b7`
3. Click ⚙️ **Project Settings** → **Service Accounts** tab
4. Click **"Generate new private key"**
5. Save the downloaded file as:
   ```
   server/serviceAccountKey.json
   ```

> ⚠️ **IMPORTANT**: Never commit `serviceAccountKey.json` to Git.
> It's already in `.gitignore`.

---

## Step 2 — Create Firestore Composite Index (REQUIRED)

The cleanup query uses two fields together (`accountDeleted` + `scheduledPermanentDeleteAt`).
Firestore requires a **composite index** for this — without it the cleanup will crash with a permission/index error.

1. Go to [Firebase Console](https://console.firebase.google.com/) → `meesent-543b7`
2. Click **Firestore Database** → **Indexes** tab
3. Click **"Add index"** under **Composite** tab
4. Fill in:
   - **Collection**: `users`
   - **Field 1**: `accountDeleted` → Ascending
   - **Field 2**: `scheduledPermanentDeleteAt` → Ascending
   - **Query scope**: Collection
5. Click **Create**
6. Wait a few minutes for the index to build (status changes from "Building" to "Enabled")

> Alternatively, Firebase will print a direct link in the server error log — just click it to auto-create the index.

---

## Step 3 — Add Storage Bucket to Admin Init

```bash
cd server
npm install
```

This installs `firebase-admin` and `node-cron`.

---

## Step 3 — Start the server

```bash
npm start
```

You should see:
```
[Firebase Admin] Initialized with service account key.
[Cron] Account deletion cleanup scheduled — runs daily at 2:00 AM IST.
Server running on http://0.0.0.0:3000
```

---

## Manual Test (optional)

To manually trigger the cleanup without waiting for 2 AM:

```bash
curl -X POST http://localhost:3000/api/admin/run-cleanup \
  -H "x-admin-secret: meesent-admin-cleanup-2024"
```

---

## Collections that get deleted

| Collection        | Field used    |
|-------------------|---------------|
| `job_applications`| `userId`      |
| `saved_jobs`      | `userId`      |
| `favorite_jobs`   | `userId`      |
| `resumes`         | `userId`      |
| `pincode_ads`     | `userId`      |
| `vendors`         | `userId`      |
| `payments`        | `userId`      |
| `notifications`   | `userId`      |
| `reviews`         | `userId`      |
| `leads`           | `userId`      |
| `jobs`            | `postedBy`    |
| `users`           | (doc itself)  |
| Firebase Auth     | (account)     |
