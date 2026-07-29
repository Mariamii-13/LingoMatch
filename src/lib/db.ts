import mongoose from 'mongoose'
import dns from 'dns'

declare global {
  var mongoose: {
    conn: mongoose.Connection | null
    promise: Promise<mongoose.Connection> | null
  }
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

/**
 * Bounds on how long a request will wait for the database.
 *
 * With no timeouts configured, a stalled connection waits indefinitely: one
 * register request was observed taking 13.2 minutes in application code after
 * the network dropped and recovered. On Vercel that consumes the whole function
 * budget and returns nothing useful. Failing in seconds instead lets the error
 * boundaries show a real message and lets the caller retry.
 */
const SERVER_SELECTION_TIMEOUT_MS = 10_000
const CONNECT_TIMEOUT_MS = 10_000
const SOCKET_TIMEOUT_MS = 45_000

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not defined in environment variables')
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    dns.setServers(['8.8.8.8', '8.8.4.4'])
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
        connectTimeoutMS: CONNECT_TIMEOUT_MS,
        socketTimeoutMS: SOCKET_TIMEOUT_MS,
      })
      .then((m) => m.connection)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    // Clearing the cached promise matters: without it every later request would
    // await the same rejected connection attempt and fail instantly forever.
    cached.promise = null
    throw e
  }

  return cached.conn
}
