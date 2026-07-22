import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth-helpers";

const execFileAsync = promisify(execFile);

const BACKUP_DIR = path.join(process.cwd(), "backups");
const PSQL = "/Applications/Postgres.app/Contents/Versions/latest/bin/psql";

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

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/backup/[id] — download a backup file
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const record = await prisma.databaseBackup.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    const filepath = path.join(BACKUP_DIR, record.filename);
    const content = await readFile(filepath);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${record.filename}"`,
        "Content-Length": String(content.length),
      },
    });
  } catch (error) {
    console.error("Backup download error:", error);
    return NextResponse.json({ error: "Failed to download backup" }, { status: 500 });
  }
}

// POST /api/backup/[id] — restore a backup
export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const record = await prisma.databaseBackup.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    const filepath = path.join(BACKUP_DIR, record.filename);

    // Verify file exists before attempting restore
    await stat(filepath);

    const db = parseDatabaseUrl(process.env.DATABASE_URL!);

    // argv arrays, no shell: the SQL string and filepath are passed as single
    // arguments and can never be reinterpreted as shell syntax. The password
    // goes through the environment, never argv.
    const psqlEnv = { ...process.env, PGPASSWORD: db.password };
    const psqlConn = [
      "-h", db.host,
      "-p", db.port,
      "-U", db.user,
      "-d", db.database,
    ];

    // Drop all tables (using psql to execute schema reset)
    await execFileAsync(
      PSQL,
      [...psqlConn, "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"],
      { env: psqlEnv },
    );

    // Restore the dump
    await execFileAsync(PSQL, [...psqlConn, "-f", filepath], { env: psqlEnv });

    return NextResponse.json({ success: true, restored: record.filename });
  } catch (error) {
    // Log in full server-side; never return the message to the client — psql
    // failures echo the invocation, which previously leaked DB credentials.
    console.error("[backup] psql restore failed:", error);
    return NextResponse.json({ error: "Restore failed. Check server logs." }, { status: 500 });
  }
}

// DELETE /api/backup/[id] — delete a backup record and file
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const record = await prisma.databaseBackup.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    // Delete the file (ignore if missing)
    const filepath = path.join(BACKUP_DIR, record.filename);
    const { unlink } = await import("fs/promises");
    await unlink(filepath).catch(() => {});

    await prisma.databaseBackup.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Backup delete error:", error);
    return NextResponse.json({ error: "Failed to delete backup" }, { status: 500 });
  }
}
