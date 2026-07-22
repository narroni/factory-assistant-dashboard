import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import path from "path";
import { prisma } from "../../lib/prisma";
import { getCurrentUser } from "../../lib/auth-helpers";

const execFileAsync = promisify(execFile);

// pg_dump output is captured through stdout; the default 1 MB buffer would
// truncate any non-trivial dump.
const MAX_DUMP_BUFFER = 256 * 1024 * 1024;

const BACKUP_DIR = path.join(process.cwd(), "backups");
const PG_DUMP = "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump";

function parseDatabaseUrl(url: string) {
  const match = url.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
  );
  if (!match) throw new Error("Invalid DATABASE_URL format");
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
  };
}

// GET /api/backup — list all backups
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const backups = await prisma.databaseBackup.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(backups);
  } catch (error) {
    console.error("Backup list error:", error);
    return NextResponse.json({ error: "Failed to list backups" }, { status: 500 });
  }
}

// POST /api/backup — create a new backup
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const note: string = body.note || "";

    const db = parseDatabaseUrl(process.env.DATABASE_URL!);
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    // argv array: no shell, so credentials and identifiers can never be parsed
    // as shell syntax. The password goes through the environment, never argv
    // (argv is world-readable via ps).
    const { stdout } = await execFileAsync(
      PG_DUMP,
      [
        "-h", db.host,
        "-p", db.port,
        "-U", db.user,
        "-F", "p",
        "--no-owner",
        "--no-acl",
        db.database,
      ],
      {
        env: { ...process.env, PGPASSWORD: db.password },
        maxBuffer: MAX_DUMP_BUFFER,
      },
    );

    const { writeFile, mkdir } = await import("fs/promises");
    await mkdir(BACKUP_DIR, { recursive: true });
    await writeFile(filepath, stdout, "utf-8");

    const stats = await stat(filepath);

    const record = await prisma.databaseBackup.create({
      data: {
        filename,
        sizeBytes: stats.size,
        createdBy: user.name || user.email,
        note: note || null,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    // Log in full server-side; never return the message to the client — pg_dump
    // failures echo the invocation, which previously leaked DB credentials.
    console.error("[backup] pg_dump failed:", error);
    return NextResponse.json({ error: "Backup failed. Check server logs." }, { status: 500 });
  }
}
