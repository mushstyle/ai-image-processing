import fs from "fs/promises";
import path from "path";

export interface SavedPrompt {
  id: string;
  text: string;
  createdAt: string;
}

interface PromptStore {
  prompts: SavedPrompt[];
}

const PROMPTS_PATH = path.join(process.cwd(), "data", "prompts.json");
const EMPTY_STORE: PromptStore = { prompts: [] };

async function ensurePromptStore(): Promise<void> {
  try {
    await fs.access(PROMPTS_PATH);
  } catch {
    await fs.mkdir(path.dirname(PROMPTS_PATH), { recursive: true });
    await fs.writeFile(PROMPTS_PATH, JSON.stringify(EMPTY_STORE, null, 2));
  }
}

async function readPromptStore(): Promise<PromptStore> {
  await ensurePromptStore();
  const raw = await fs.readFile(PROMPTS_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw) as PromptStore;
    return {
      prompts: Array.isArray(parsed.prompts) ? parsed.prompts : [],
    };
  } catch {
    return EMPTY_STORE;
  }
}

async function writePromptStore(store: PromptStore): Promise<void> {
  await ensurePromptStore();
  await fs.writeFile(PROMPTS_PATH, JSON.stringify(store, null, 2));
}

export async function listSavedPrompts(): Promise<SavedPrompt[]> {
  const store = await readPromptStore();

  return store.prompts.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function savePrompt(text: string): Promise<SavedPrompt> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Prompt text is required");
  }

  const store = await readPromptStore();
  const prompt: SavedPrompt = {
    id: crypto.randomUUID(),
    text: trimmedText,
    createdAt: new Date().toISOString(),
  };

  store.prompts.unshift(prompt);
  store.prompts = store.prompts.slice(0, 100);
  await writePromptStore(store);

  return prompt;
}

export async function deletePrompt(id: string): Promise<void> {
  const store = await readPromptStore();
  store.prompts = store.prompts.filter((prompt) => prompt.id !== id);
  await writePromptStore(store);
}
