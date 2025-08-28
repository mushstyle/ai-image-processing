'use client';

import { useState, FormEvent } from 'react';

interface OutputImage {
  data: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [urls, setUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OutputImage[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);

    const formData = new FormData();
    formData.append('prompt', prompt);

    // Add files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }

    // Add URLs
    urls.forEach(url => {
      if (url.trim()) {
        formData.append('urls', url.trim());
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

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
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

            {/* File Upload */}
            <div>
              <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-2">
                Upload Images
              </label>
              <input
                id="files"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFiles(e.target.files)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* URL Inputs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Image URLs
              </label>
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                  {urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrl(index)}
                      className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addUrlField}
                className="mt-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                + Add another URL
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!files?.length && !urls.some(u => u.trim()))}
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