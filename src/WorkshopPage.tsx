import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { convertToJpeg } from "./lib/convertToJpeg";
import type { ApiFetch, OutputImage, SavedPrompt } from "./types";

type InputKind = "empty" | "file" | "url";

type ImageInput = {
  id: string;
  kind: InputKind;
  file?: File;
  fileName?: string;
  preview?: string;
  url?: string;
  wasConverted?: boolean;
};

type Toast = {
  message: string;
  type: "success" | "error";
};

function createEmptyInput(): ImageInput {
  return { id: crypto.randomUUID(), kind: "empty" };
}

function revokePreview(input?: ImageInput): void {
  if (input?.kind === "file" && input.preview?.startsWith("blob:")) {
    URL.revokeObjectURL(input.preview);
  }
}

function fileExtensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

function imageDataUrl(image: OutputImage): string {
  return `data:${image.mimeType};base64,${image.data}`;
}

export default function WorkshopPage({
  apiFetch,
}: {
  apiFetch: ApiFetch;
}) {
  const [prompt, setPrompt] = useState("");
  const [imageInputs, setImageInputs] = useState<ImageInput[]>([createEmptyInput()]);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [results, setResults] = useState<OutputImage[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pasteTargetId, setPasteTargetId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadPrompts = useCallback(async (): Promise<void> => {
    try {
      const response = await apiFetch("/api/prompts");
      const data = (await response.json()) as { prompts?: SavedPrompt[] };

      if (response.ok) {
        setSavedPrompts(data.prompts ?? []);
      }
    } catch (loadError) {
      console.error("Failed to load prompts:", loadError);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!showPromptDropdown) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".prompt-dropdown-container")) {
        setShowPromptDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPromptDropdown]);

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      if (!pasteTargetId) {
        return;
      }

      const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith("image/"),
      );

      if (!imageItem) {
        return;
      }

      event.preventDefault();
      const blob = imageItem.getAsFile();
      if (!blob) {
        return;
      }

      setLoading(true);

      try {
        const extension = blob.type.split("/")[1] || "png";
        const file = new File([blob], `pasted-image-${Date.now()}.${extension}`, {
          type: blob.type,
        });
        const converted = await convertToJpeg(file, apiFetch);

        replaceInput(pasteTargetId, {
          kind: "file",
          file: converted.file,
          fileName: converted.file.name,
          preview: converted.preview,
          wasConverted: converted.wasConverted,
          url: undefined,
        });

        setPasteTargetId(null);
        setToast({ message: "Image pasted successfully", type: "success" });
      } catch (pasteError) {
        console.error("Error pasting image:", pasteError);
        setToast({ message: "Failed to paste image", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [apiFetch, pasteTargetId]);

  function replaceInput(id: string, nextState: Omit<ImageInput, "id">): void {
    setImageInputs((current) =>
      current.map((input) => {
        if (input.id !== id) {
          return input;
        }

        revokePreview(input);
        return { id, ...nextState };
      }),
    );
  }

  function addImageInput(): void {
    setImageInputs((current) => [...current, createEmptyInput()]);
  }

  function removeImageInput(id: string): void {
    setImageInputs((current) => {
      const input = current.find((candidate) => candidate.id === id);
      revokePreview(input);

      const nextInputs = current.filter((candidate) => candidate.id !== id);
      return nextInputs.length > 0 ? nextInputs : [createEmptyInput()];
    });
  }

  async function handleFileSelect(
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) {
      return;
    }

    setLoading(true);

    try {
      const convertedFiles = await Promise.all(
        Array.from(selectedFiles).map((file) => convertToJpeg(file, apiFetch)),
      );

      setImageInputs((current) => {
        const currentIndex = current.findIndex((input) => input.id === id);
        if (currentIndex === -1) {
          return current;
        }

        const nextInputs = [...current];
        revokePreview(nextInputs[currentIndex]);

        nextInputs[currentIndex] = {
          id,
          kind: "file",
          file: convertedFiles[0].file,
          fileName: convertedFiles[0].file.name,
          preview: convertedFiles[0].preview,
          wasConverted: convertedFiles[0].wasConverted,
        };

        const additionalInputs = convertedFiles.slice(1).map((converted) => ({
          id: crypto.randomUUID(),
          kind: "file" as const,
          file: converted.file,
          fileName: converted.file.name,
          preview: converted.preview,
          wasConverted: converted.wasConverted,
        }));

        nextInputs.splice(currentIndex + 1, 0, ...additionalInputs);
        return nextInputs;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleUrlInput(id: string, url: string): void {
    replaceInput(
      id,
      url
        ? {
            kind: "url",
            url,
            preview: url,
            file: undefined,
            fileName: undefined,
            wasConverted: undefined,
          }
        : {
            kind: "empty",
            url: undefined,
            preview: undefined,
            file: undefined,
            fileName: undefined,
            wasConverted: undefined,
          },
    );
  }

  function resetInput(id: string): void {
    replaceInput(id, {
      kind: "empty",
      file: undefined,
      fileName: undefined,
      preview: undefined,
      url: undefined,
      wasConverted: undefined,
    });

    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id]!.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);
    setNotes([]);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);

      for (const input of imageInputs) {
        if (input.kind === "file" && input.file) {
          formData.append("files", input.file);
        }

        if (input.kind === "url" && input.url) {
          formData.append("urls", input.url);
        }
      }

      const response = await apiFetch("/api/gemini", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        images?: OutputImage[];
        notes?: string[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to process images");
      }

      setResults(data.images ?? []);
      setNotes(data.notes ?? []);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrompt(): Promise<void> {
    if (!prompt.trim()) {
      return;
    }

    try {
      const response = await apiFetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to save prompt");
      }

      await loadPrompts();
      setToast({ message: "Prompt saved", type: "success" });
    } catch (saveError) {
      console.error("Failed to save prompt:", saveError);
      setToast({ message: "Failed to save prompt", type: "error" });
    }
  }

  async function handleDeletePrompt(
    id: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!window.confirm("Delete this saved prompt?")) {
      return;
    }

    try {
      const response = await apiFetch(`/api/prompts?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete prompt");
      }

      await loadPrompts();
    } catch (deleteError) {
      console.error("Failed to delete prompt:", deleteError);
      setToast({ message: "Failed to delete prompt", type: "error" });
    }
  }

  function downloadImage(image: OutputImage, index: number): void {
    const extension = fileExtensionForMimeType(image.mimeType);
    const link = document.createElement("a");
    link.href = imageDataUrl(image);
    link.download = `nano_banana_output_${index + 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadAll(): void {
    results.forEach((image, index) => downloadImage(image, index));
  }

  async function handleUseGeneratedImage(
    image: OutputImage,
    index: number,
  ): Promise<void> {
    try {
      const response = await fetch(imageDataUrl(image));
      const blob = await response.blob();
      const extension = fileExtensionForMimeType(image.mimeType);
      const preview = URL.createObjectURL(blob);
      const generatedInput: ImageInput = {
        id: crypto.randomUUID(),
        kind: "file",
        file: new File([blob], `generated_${index + 1}.${extension}`, {
          type: image.mimeType,
        }),
        fileName: `generated_${index + 1}.${extension}`,
        preview,
        wasConverted: false,
      };

      setImageInputs((current) => {
        const emptyIndex = current.findIndex((input) => input.kind === "empty");
        if (emptyIndex === -1) {
          return [...current, generatedInput];
        }

        const nextInputs = [...current];
        nextInputs[emptyIndex] = generatedInput;
        return nextInputs;
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (useImageError) {
      console.error("Failed to reuse generated image:", useImageError);
      setToast({ message: "Failed to reuse generated image", type: "error" });
    }
  }

  const hasValidInputs = prompt.trim().length > 0;

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      {toast && (
        <div className="animate-fade-in fixed right-4 top-4 z-50">
          <div
            className={`rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-700">
            Private Workshop
          </p>
          <h2 className="mt-3 text-4xl font-semibold text-gray-950">
            Nano Banana Playground
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-base text-gray-600">
            Prompt-only and image-conditioned generation, built for quick internal
            experiments.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-[26rem] xl:w-[30rem]">
            <div className="panel-surface sticky top-6 rounded-3xl p-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="prompt"
                      className="text-sm font-medium uppercase tracking-wide text-gray-600"
                    >
                      Prompt
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrompt("")}
                        title="Clear prompt"
                        className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSavePrompt()}
                        disabled={!prompt.trim()}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:bg-gray-400"
                      >
                        Save
                      </button>
                      <div className="prompt-dropdown-container relative">
                        <button
                          type="button"
                          onClick={() => setShowPromptDropdown((current) => !current)}
                          className="rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          Saved
                        </button>
                        {showPromptDropdown && savedPrompts.length > 0 && (
                          <div className="absolute right-0 z-10 mt-2 w-96 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
                            <div className="max-h-72 overflow-y-auto">
                              {savedPrompts.map((savedPrompt) => (
                                <div
                                  key={savedPrompt.id}
                                  onClick={() => {
                                    setPrompt(savedPrompt.text);
                                    setShowPromptDropdown(false);
                                  }}
                                  className="group flex cursor-pointer items-start justify-between gap-3 border-b border-black/5 px-4 py-3 text-left transition hover:bg-amber-50"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-sm font-medium text-gray-900">
                                      {savedPrompt.text}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {new Date(savedPrompt.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) =>
                                      void handleDeletePrompt(savedPrompt.id, event)
                                    }
                                    className="rounded-full px-2 py-1 text-sm text-red-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-50"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={5}
                    className="min-h-[10rem] w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-base text-gray-900 outline-none transition focus:border-amber-500"
                    placeholder="Describe the image you want, or how the input images should be transformed."
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium uppercase tracking-wide text-gray-600">
                      Input Images
                    </label>
                    <button
                      type="button"
                      onClick={addImageInput}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-white"
                    >
                      Add image
                    </button>
                  </div>

                  <div className="space-y-3">
                    {imageInputs.map((input) => (
                      <div
                        key={input.id}
                        className="rounded-2xl border border-black/10 bg-white/80 p-3"
                      >
                        <div className="flex gap-3">
                          {input.preview && (
                            <img
                              src={input.preview}
                              alt="Selected input preview"
                              className="h-20 w-20 rounded-xl border border-black/10 bg-gray-100 object-contain"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          )}

                          <div className="flex-1">
                            {(input.kind === "empty" || input.kind === "url") && (
                              <div className="space-y-2">
                                <div
                                  className={`rounded-xl border ${
                                    pasteTargetId === input.id
                                      ? "border-blue-500 ring-2 ring-blue-200"
                                      : "border-black/10"
                                  }`}
                                >
                                  <input
                                    type="url"
                                    value={input.url || ""}
                                    onChange={(event) =>
                                      handleUrlInput(input.id, event.target.value)
                                    }
                                    onFocus={() => setPasteTargetId(input.id)}
                                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                                    placeholder="Paste an image URL or focus here and press Ctrl/Cmd+V"
                                  />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPasteTargetId(input.id);
                                      void navigator.clipboard
                                        .readText()
                                        .then((text) => {
                                          if (text.startsWith("http")) {
                                            handleUrlInput(input.id, text);
                                          }
                                        })
                                        .catch(() => {
                                          setToast({
                                            message:
                                              "Clipboard text is unavailable here. Paste manually or use Ctrl/Cmd+V.",
                                            type: "success",
                                          });
                                        });
                                    }}
                                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                                  >
                                    Paste
                                  </button>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      className="rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                    >
                                      Browse files
                                    </button>
                                    <input
                                      ref={(element) => {
                                        fileInputRefs.current[input.id] = element;
                                      }}
                                      type="file"
                                      multiple
                                      accept="image/*,.heic,.heif"
                                      onChange={(event) =>
                                        void handleFileSelect(input.id, event)
                                      }
                                      className="absolute inset-0 cursor-pointer opacity-0"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {input.kind === "file" && (
                              <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-gray-50 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-gray-800">
                                    {input.fileName}
                                  </p>
                                  {input.wasConverted && (
                                    <p className="text-xs text-blue-600">
                                      Converted from HEIC/HEIF
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => resetInput(input.id)}
                                  className="rounded-full px-2 py-1 text-sm text-gray-500 transition hover:bg-white hover:text-gray-800"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>

                          {imageInputs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeImageInput(input.id)}
                              className="self-start rounded-full px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {pasteTargetId === input.id && (
                          <p className="mt-2 text-xs text-blue-700">
                            Ready to paste an image with Ctrl/Cmd+V
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Paste images, drop in URLs, or select multiple files at once. HEIC
                    uploads are converted automatically.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !hasValidInputs}
                  className="w-full rounded-full bg-amber-500 px-5 py-3 text-base font-semibold text-gray-950 transition hover:bg-amber-400 disabled:bg-gray-300 disabled:text-gray-600"
                >
                  {loading ? "Generating…" : "Generate images"}
                </button>
              </form>

              {error && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:hidden">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {error && (
              <div className="mb-4 hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:block">
                {error}
              </div>
            )}

            <div className="panel-surface rounded-3xl p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Results
                  </p>
                  <h3 className="text-2xl font-semibold text-gray-950">
                    Generated Images {results.length > 0 ? `(${results.length})` : ""}
                  </h3>
                </div>
                {results.length > 1 && (
                  <button
                    type="button"
                    onClick={downloadAll}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    Download all
                  </button>
                )}
              </div>

              {notes.length > 0 && (
                <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-sm font-medium text-blue-900">Model notes</p>
                  <div className="mt-2 space-y-2 text-sm text-blue-800">
                    {notes.map((note, index) => (
                      <p key={`${note}-${index}`}>{note}</p>
                    ))}
                  </div>
                </div>
              )}

              {results.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {results.map((image, index) => (
                    <div
                      key={`${image.mimeType}-${index}`}
                      className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                    >
                      <img
                        src={imageDataUrl(image)}
                        alt={`Generated image ${index + 1}`}
                        className="w-full bg-gray-100"
                      />
                      <div className="flex items-center justify-between gap-2 border-t border-black/5 px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">
                          Image {index + 1}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleUseGeneratedImage(image, index)}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                          >
                            Use image
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadImage(image, index)}
                            className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-black/10 bg-white/70 px-6 py-16 text-center">
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Nothing generated yet
                  </p>
                  <p className="mt-2 text-lg text-gray-700">
                    Generated images will appear here after you submit a prompt.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
