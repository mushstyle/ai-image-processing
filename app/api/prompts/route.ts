import { NextRequest, NextResponse } from "next/server";
import { deletePrompt, listSavedPrompts, savePrompt } from "@/lib/prompt-store";

export async function GET() {
  try {
    const prompts = await listSavedPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Error loading prompts:", error);
    return NextResponse.json(
      { error: "Failed to load prompts" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text?: string };
    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json(
        { error: "Invalid prompt text" },
        { status: 400 },
      );
    }

    const prompt = await savePrompt(body.text);
    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    console.error("Error saving prompt:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save prompt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Prompt ID required" },
        { status: 400 },
      );
    }

    await deletePrompt(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 },
    );
  }
}
