'use client';

import { useState, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { convertToJpeg } from '../lib/convertToJpeg';

interface OutputImage {
  data: string;
}

type ImageInput = {
  id: string;
  type: 'file' | 'url' | 'empty';
  file?: File;
  url?: string;
  fileName?: string;
  preview?: string;
  wasConverted?: boolean;
};

interface SavedPrompt {
  id: string;
  text: string;
  createdAt: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [imageInputs, setImageInputs] = useState<ImageInput[]>([
    { id: crypto.randomUUID(), type: 'empty' }
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OutputImage[]>([]);
  const [error, setError] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pasteTargetId, setPasteTargetId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const pasteAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);

    const formData = new FormData();
    formData.append('prompt', prompt);

    // Add files and URLs from unified inputs
    imageInputs.forEach(input => {
      if (input.type === 'file' && input.file) {
        formData.append('files', input.file);
      } else if (input.type === 'url' && input.url) {
        formData.append('urls', input.url);
      }
    });

    try {
      const response = await fetch(`/api/gemini?t=${Date.now()}`, {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process images');
      }

      setResults(data.images);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addImageInput = () => {
    setImageInputs([...imageInputs, { id: crypto.randomUUID(), type: 'empty' }]);
  };

  const removeImageInput = (id: string) => {
    // Revoke object URL if it's a file to prevent memory leaks
    const input = imageInputs.find(i => i.id === id);
    if (input?.type === 'file' && input.preview) {
      URL.revokeObjectURL(input.preview);
    }
    setImageInputs(imageInputs.filter(input => input.id !== id));
  };


  const handleFileSelect = async (id: string, e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Show loading state while converting
      setLoading(true);
      
      try {
        // If multiple files selected, update current slot and add new slots for additional files
        const updatedInputs = [...imageInputs];
        const currentIndex = updatedInputs.findIndex(input => input.id === id);
        
        if (currentIndex !== -1) {
          // Convert and create preview for first file
          const { file: convertedFile, preview, wasConverted } = await convertToJpeg(files[0]);
          
          // Update the current slot with the first file
          updatedInputs[currentIndex] = {
            ...updatedInputs[currentIndex],
            type: 'file',
            file: convertedFile,
            fileName: convertedFile.name,
            preview: preview,
            wasConverted: wasConverted
          };
          
          // Add new slots for additional files
          const newInputs: ImageInput[] = [];
          for (let i = 1; i < files.length; i++) {
            const { file: convertedFile, preview, wasConverted } = await convertToJpeg(files[i]);
            newInputs.push({
              id: crypto.randomUUID(),
              type: 'file',
              file: convertedFile,
              fileName: convertedFile.name,
              preview: preview,
              wasConverted: wasConverted
            });
          }
          
          // Insert new inputs after the current one
          updatedInputs.splice(currentIndex + 1, 0, ...newInputs);
        }
        
        setImageInputs(updatedInputs);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUrlInput = (id: string, url: string) => {
    setImageInputs(imageInputs.map(input => 
      input.id === id 
        ? { ...input, type: url ? 'url' : 'empty', url, preview: url || undefined }
        : input
    ));
  };

  const resetInput = (id: string) => {
    // Revoke object URL if it's a file to prevent memory leaks
    const input = imageInputs.find(i => i.id === id);
    if (input?.type === 'file' && input.preview) {
      URL.revokeObjectURL(input.preview);
    }
    
    setImageInputs(imageInputs.map(input => 
      input.id === id 
        ? { 
            id: input.id, 
            type: 'empty',
            file: undefined,
            url: undefined,
            fileName: undefined,
            preview: undefined,
            wasConverted: undefined
          }
        : input
    ));
    // Reset the file input
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id]!.value = '';
    }
  };

  // Load saved prompts on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.prompt-dropdown-container')) {
        setShowPromptDropdown(false);
      }
    };

    if (showPromptDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPromptDropdown]);

  // Handle paste events
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Check if we have a target ID or if the paste area is focused
      if (!pasteTargetId) return;

      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(item => item.type.startsWith('image/'));
      
      if (imageItem) {
        e.preventDefault();
        const blob = imageItem.getAsFile();
        if (blob) {
          setLoading(true);
          try {
            // Convert blob to File object with proper name
            const fileName = `pasted-image-${Date.now()}.${blob.type.split('/')[1]}`;
            const file = new File([blob], fileName, { type: blob.type });
            
            // Convert HEIC if needed and create preview
            const { file: convertedFile, preview, wasConverted } = await convertToJpeg(file);
            
            // Update the target input
            setImageInputs(prev => prev.map(input => 
              input.id === pasteTargetId
                ? {
                    ...input,
                    type: 'file',
                    file: convertedFile,
                    fileName: convertedFile.name,
                    preview: preview,
                    wasConverted: wasConverted
                  }
                : input
            ));
            
            // Clear paste target
            setPasteTargetId(null);
            
            // Show success toast
            setToast({ message: 'Image pasted successfully', type: 'success' });
          } catch (error) {
            console.error('Error pasting image:', error);
            setToast({ message: 'Failed to paste image', type: 'error' });
          } finally {
            setLoading(false);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [pasteTargetId]);

  const loadPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      if (response.ok && data.prompts) {
        setSavedPrompts(data.prompts);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  const savePrompt = async () => {
    if (!prompt.trim()) return;
    
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt })
      });
      
      if (response.ok) {
        await loadPrompts(); // Reload the list
        setToast({ message: 'Prompt saved!', type: 'success' });
      } else {
        setToast({ message: 'Failed to save prompt', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      setToast({ message: 'Failed to save prompt', type: 'error' });
    }
  };

  const loadPrompt = (savedPrompt: SavedPrompt) => {
    setPrompt(savedPrompt.text);
    setShowPromptDropdown(false);
  };

  const deletePrompt = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent dropdown item click
    
    if (!confirm('Delete this saved prompt?')) return;
    
    try {
      const response = await fetch(`/api/prompts?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadPrompts();
      }
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };

  const downloadImage = (image: OutputImage, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${image.data}`;
    link.download = `nano_banana_output_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    results.forEach((image, index) => downloadImage(image, index));
  };

  const handleUseGeneratedImage = async (image: OutputImage, index: number) => {
    try {
      // Convert base64 to blob
      const response = await fetch(`data:image/png;base64,${image.data}`);
      const blob = await response.blob();
      
      // Create a File object
      const file = new File([blob], `generated_${index + 1}.png`, { type: 'image/png' });
      
      // Create preview URL
      const preview = URL.createObjectURL(blob);
      
      // Add to image inputs
      const newInput: ImageInput = {
        id: crypto.randomUUID(),
        type: 'file',
        file: file,
        fileName: `generated_${index + 1}.png`,
        preview: preview,
        wasConverted: false
      };
      
      // Find first empty slot or add at the end
      const emptyIndex = imageInputs.findIndex(input => input.type === 'empty');
      
      if (emptyIndex !== -1) {
        // Replace empty slot
        const updatedInputs = [...imageInputs];
        updatedInputs[emptyIndex] = newInput;
        setImageInputs(updatedInputs);
      } else {
        // Add new slot
        setImageInputs([...imageInputs, newInput]);
      }
      
      // Scroll to input section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to use generated image:', error);
    }
  };

  // Allow processing with just a prompt (no images required)
  const hasValidInputs = prompt.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`px-4 py-2 rounded-lg shadow-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-4xl font-bold text-gray-900 mb-2">
            Nano Banana Workshop
          </h3>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left side - Input Form */}
          <div className="lg:w-1/2 xl:w-2/5">
            <div className="bg-white shadow-xl rounded-2xl p-6 sticky top-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Prompt Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                  Prompt
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    title="Clear prompt"
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                      <line x1="8" y1="8" x2="16" y2="16" strokeWidth="2"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={savePrompt}
                    disabled={!prompt.trim()}
                    title="Save prompt"
                    className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3M19 19H5V5H16.17L19 7.83V19M12 12C10.34 12 9 13.34 9 15S10.34 18 12 18 15 16.66 15 15 13.66 12 12 12M6 6H15V10H6V6Z"/>
                    </svg>
                  </button>
                  <div className="relative prompt-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setShowPromptDropdown(!showPromptDropdown)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Load Saved ▼
                    </button>
                    {showPromptDropdown && savedPrompts.length > 0 && (
                      <div className="absolute right-0 mt-1 w-96 max-h-64 overflow-y-auto bg-gray-100 border border-gray-300 rounded-lg shadow-xl z-10">
                        {savedPrompts.map(savedPrompt => (
                          <div
                            key={savedPrompt.id}
                            onClick={() => loadPrompt(savedPrompt)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 group transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 mr-2">
                                <p className="text-sm text-gray-800 line-clamp-2 font-medium">{savedPrompt.text}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(savedPrompt.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => deletePrompt(savedPrompt.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-sm transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="e.g., Extract all objects separately, Remove background and add studio lighting..."
              />
            </div>

            {/* Unified Image Inputs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Images
              </label>
              <div className="space-y-3">
                {imageInputs.map((input) => (
                  <div key={input.id} className="flex gap-2">
                    {/* Thumbnail Preview */}
                    {input.preview && (
                      <div className="flex-shrink-0">
                        <img
                          src={input.preview}
                          alt="Preview"
                          className="h-16 max-w-24 object-contain rounded-lg border border-gray-300 bg-gray-50"
                          onError={(e) => {
                            // Hide image if it fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      {input.type === 'empty' || input.type === 'url' ? (
                        <div className="flex gap-2">
                          <div 
                            className={`flex-1 relative ${pasteTargetId === input.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                            onClick={() => setPasteTargetId(input.id)}
                            onFocus={() => setPasteTargetId(input.id)}
                            tabIndex={0}
                          >
                            <input
                              type="url"
                              value={input.url || ''}
                              onChange={(e) => handleUrlInput(input.id, e.target.value)}
                              onFocus={() => setPasteTargetId(input.id)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Paste image URL or use Ctrl/Cmd+V to paste image..."
                            />
                            {pasteTargetId === input.id && (
                              <div className="absolute -top-8 left-0 px-2 py-1 bg-blue-600 text-white text-xs rounded animate-pulse">
                                Ready to paste! Press Ctrl/Cmd+V
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPasteTargetId(input.id);
                              navigator.clipboard.readText().then(text => {
                                if (text.startsWith('http')) {
                                  handleUrlInput(input.id, text);
                                }
                              }).catch(() => {
                                // Mobile fallback - show paste instruction
                                setToast({ message: 'Tap and hold to paste, or press Ctrl/Cmd+V', type: 'success' });
                              });
                            }}
                            className="px-3 py-3 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg transition-colors text-sm font-medium"
                            title="Paste from clipboard"
                          >
                            📋
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors text-sm font-medium"
                            >
                              Browse Files
                            </button>
                            <input
                              ref={(el) => { fileInputRefs.current[input.id] = el; }}
                              type="file"
                              multiple
                              accept="image/*,.heic,.heif"
                              onChange={(e) => handleFileSelect(input.id, e)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              title="Click to select files"
                            />
                          </div>
                        </div>
                      ) : input.type === 'file' ? (
                        <div className="flex items-center px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                          <span className="flex-1 text-sm text-gray-700">
                            📁 {input.fileName}
                            {input.wasConverted && (
                              <span className="ml-2 text-xs text-blue-600">(converted from HEIC)</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => resetInput(input.id)}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                            title="Clear"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {imageInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageInput(input.id)}
                        className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addImageInput}
                className="mt-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                + Add another image
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Tips: Paste images with Ctrl/Cmd+V • Select multiple files at once • HEIC/HEIF files are converted automatically
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !hasValidInputs}
              className="w-full py-3 px-6 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Process Images'
              )}
            </button>
          </form>

              {/* Error Display - Inside left column on mobile */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg lg:hidden">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <p className="text-red-800 font-medium">Error</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Results */}
          <div className="lg:w-1/2 xl:w-3/5">
            {/* Error Display - In right column on desktop */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg mb-4 hidden lg:block">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm mt-1 break-words">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Display */}
            {results.length > 0 ? (
              <div className="bg-white shadow-xl rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Generated Images ({results.length})
                  </h2>
                  {results.length > 1 && (
                    <button
                      onClick={downloadAll}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download All
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {results.map((image, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={`data:image/png;base64,${image.data}`}
                        alt={`Generated image ${index + 1}`}
                        className="w-full h-auto"
                      />
                      <div className="p-3 bg-gray-50 flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">
                          Image {index + 1}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUseGeneratedImage(image, index)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            Use Image
                          </button>
                          <button
                            onClick={() => downloadImage(image, index)}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !loading && (
                <div className="bg-white shadow-xl rounded-2xl p-12 text-center">
                  <p className="text-gray-500">Generated images will appear here</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
