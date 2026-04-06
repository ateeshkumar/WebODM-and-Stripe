import { NextRequest, NextResponse } from "next/server";
import { fetchWebOdmPublicTaskData } from "@/lib/webodm";

export async function GET(request: NextRequest) {
  const requestedUrl = request.nextUrl.searchParams.get("url");

  if (!requestedUrl) {
    return NextResponse.json(
      {
        message: "Add a public WebODM task URL to load the viewer.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 400,
      },
    );
  }

  try {
    const task = await fetchWebOdmPublicTaskData(requestedUrl);

    return NextResponse.json(task, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "The WebODM task could not be loaded.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 400,
      },
    );
  }
}
