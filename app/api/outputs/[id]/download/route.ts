import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";
import { prisma } from "../../../../lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;

  const executed = await prisma.executedAction.findUnique({
    where: { id },
    include: {
      request: { select: { createdByUserId: true } },
      executor: { select: { name: true } },
    },
  });

  if (!executed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // RBAC: User can download their own outputs or admins can download any
  if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && executed.request.createdByUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!executed.outputContent && !executed.outputFile) {
    return NextResponse.json({ error: "No output available" }, { status: 404 });
  }

  // Return file as downloadable content
  const headers = new Headers();
  const filename = executed.outputFile || `output_${id}`;

  if (executed.outputType === "xlsx") {
    headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const buffer = Buffer.from(executed.outputContent || "", "base64");
    headers.set("Content-Length", buffer.length.toString());
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    return new NextResponse(buffer, { status: 200, headers });
  } else {
    // For text-based outputs
    headers.set("Content-Type", "text/plain; charset=utf-8");
    headers.set("Content-Length", (executed.outputContent || "").length.toString());
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    return new NextResponse(executed.outputContent || "", { status: 200, headers });
  }
}
