import type { ApiFetch } from "../types";

/**
 * Client-side utility to convert images to JPEG.
 * HEIC/HEIF inputs are converted on the backend.
 */
export async function convertToJpeg(
  file: File,
  apiFetch: ApiFetch,
): Promise<{ file: File; preview: string; wasConverted: boolean }> {
  if (file.type === "image/jpeg") {
    const preview = URL.createObjectURL(file);
    return { file, preview, wasConverted: false };
  }

  const fileName = file.name.toLowerCase();
  const isHeic =
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif";

  if (!isHeic) {
    const preview = URL.createObjectURL(file);
    return { file, preview, wasConverted: false };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiFetch("/api/convert-heic", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `HEIC conversion failed: ${response.status} ${response.statusText} ${text}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
    const convertedFile = new File(
      [blob],
      file.name.replace(/\.hei[cf]$/i, ".jpg"),
      { type: "image/jpeg" },
    );

    const preview = URL.createObjectURL(blob);
    return { file: convertedFile, preview, wasConverted: true };
  } catch (error) {
    console.error("HEIC conversion error:", error);
    const preview = URL.createObjectURL(file);
    return { file, preview, wasConverted: false };
  }
}
