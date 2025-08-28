import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db', 'state.json');

interface SavedPrompt {
  id: string;
  text: string;
  createdAt: string;
}

interface StateDB {
  prompts: SavedPrompt[];
}

async function ensureDB(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    // Create db directory and file if they don't exist
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify({ prompts: [] }, null, 2));
  }
}

async function readDB(): Promise<StateDB> {
  await ensureDB();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

async function writeDB(data: StateDB): Promise<void> {
  await ensureDB();
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// GET: Load all prompts
export async function GET() {
  try {
    const db = await readDB();
    // Sort by date, newest first
    const sortedPrompts = db.prompts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ prompts: sortedPrompts });
  } catch (error) {
    console.error('Error loading prompts:', error);
    return NextResponse.json(
      { error: 'Failed to load prompts' },
      { status: 500 }
    );
  }
}

// POST: Save a new prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt text' },
        { status: 400 }
      );
    }
    
    const db = await readDB();
    
    const newPrompt: SavedPrompt = {
      id: crypto.randomUUID(),
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    
    // Add new prompt to beginning of array
    db.prompts.unshift(newPrompt);
    
    // Keep only last 100 prompts
    if (db.prompts.length > 100) {
      db.prompts = db.prompts.slice(0, 100);
    }
    
    await writeDB(db);
    
    return NextResponse.json({ success: true, prompt: newPrompt });
  } catch (error) {
    console.error('Error saving prompt:', error);
    return NextResponse.json(
      { error: 'Failed to save prompt' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific prompt
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID required' },
        { status: 400 }
      );
    }
    
    const db = await readDB();
    db.prompts = db.prompts.filter(p => p.id !== id);
    await writeDB(db);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}