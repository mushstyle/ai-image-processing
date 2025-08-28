'use client';

import { useState, FormEvent, ChangeEvent, useRef } from 'react';

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
};

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [imageInputs, setImageInputs] = useState<ImageInput[]>([
    { id: crypto.randomUUID(), type: 'empty' }
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OutputImage[]>([]);
  const [error, setError] = useState('');
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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
      const response = await fetch('/api/gemini', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process images');
      }

      setResults(data.images);
    } catch (err: any) {
      setError(err.message);
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
      // If multiple files selected, update current slot and add new slots for additional files
      const updatedInputs = [...imageInputs];
      const currentIndex = updatedInputs.findIndex(input => input.id === id);
      
      if (currentIndex !== -1) {
        // Create preview for first file
        const firstFilePreview = URL.createObjectURL(files[0]);
        
        // Update the current slot with the first file
        updatedInputs[currentIndex] = {
          ...updatedInputs[currentIndex],
          type: 'file',
          file: files[0],
          fileName: files[0].name,
          preview: firstFilePreview
        };
        
        // Add new slots for additional files
        const newInputs: ImageInput[] = [];
        for (let i = 1; i < files.length; i++) {
          const preview = URL.createObjectURL(files[i]);
          newInputs.push({
            id: crypto.randomUUID(),
            type: 'file',
            file: files[i],
            fileName: files[i].name,
            preview: preview
          });
        }
        
        // Insert new inputs after the current one
        updatedInputs.splice(currentIndex + 1, 0, ...newInputs);
      }
      
      setImageInputs(updatedInputs);
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
        ? { id: input.id, type: 'empty' }
        : input
    ));
    // Reset the file input
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id]!.value = '';
    }
  };

  const downloadImage = (image: OutputImage, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${image.data}`;
    link.download = `gemini_output_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    results.forEach((image, index) => downloadImage(image, index));
  };

  const hasValidInputs = imageInputs.some(input => 
    (input.type === 'file' && input.file) || (input.type === 'url' && input.url)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gemini Image Processor
          </h1>
          <p className="text-lg text-gray-600">
            Process images with Google&apos;s Gemini AI
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Prompt Input */}
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="e.g., Extract all objects separately, Remove background and add studio lighting..."
                required
              />
            </div>

            {/* Unified Image Inputs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Images
              </label>
              <div className="space-y-3">
                {imageInputs.map((input, index) => (
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
                          <input
                            type="url"
                            value={input.url || ''}
                            onChange={(e) => handleUrlInput(input.id, e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Paste image URL here..."
                          />
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
                Tip: You can select multiple files at once when browsing • HEIC/HEIF files are automatically converted
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

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {results.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Generated Images ({results.length})
                </h2>
                {results.length > 1 && (
                  <button
                    onClick={downloadAll}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Download All
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((image, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={`data:image/png;base64,${image.data}`}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-auto"
                    />
                    <div className="p-4 bg-gray-50 flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-medium">
                        Image {index + 1}
                      </span>
                      <button
                        onClick={() => downloadImage(image, index)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}