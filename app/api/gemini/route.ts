import { NextRequest, NextResponse } from "next/server";
import { generateWorkshopImages } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = String(formData.get("prompt") || "");

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const files = formData.getAll("files").filter(
      (value): value is File => value instanceof File,
    );
    const urls = formData.getAll("urls").map((value) => String(value));

    const result = await generateWorkshopImages({
      prompt,
      files,
      urls,
    });

    return NextResponse.json({
      success: true,
      images: result.images,
      notes: result.notes,
      message: `Generated ${result.images.length} image(s)`,
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process images";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
