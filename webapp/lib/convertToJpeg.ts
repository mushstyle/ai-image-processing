/**
 * Client-side utility to convert images to JPEG
 * Uses server-side conversion for HEIC files
 */
export async function convertToJpeg(file: File): Promise<{ file: File; preview: string; wasConverted: boolean }> {
  // Check if it's already JPEG
  if (file.type === 'image/jpeg') {
    const preview = URL.createObjectURL(file);
    return { file, preview, wasConverted: false };
  }

  // Check if it's a HEIC file
  const fileName = file.name.toLowerCase();
  const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || 
                 file.type === 'image/heic' || file.type === 'image/heif';

  if (!isHeic) {
    // Not HEIC, return original file
    const preview = URL.createObjectURL(file);
    return { file, preview, wasConverted: false };
  }

  try {
    // Server-side conversion for HEIC
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/convert-heic', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HEIC conversion failed: ${response.status} ${response.statusText} ${text}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
    
    // Create a new File object with the converted data
    const convertedFile = new File(
      [blob],
      file.name.replace(/\.hei[cf]$/i, '.jpg'),
      { type: 'image/jpeg' }
    );

    const preview = URL.createObjectURL(blob);
    return { file: convertedFile, preview, wasConverted: true };
  } catch (error) {
    console.error('HEIC conversion error:', error);
    // Fallback: return original file if conversion fails
    const preview = URL.createObjectURL(file);
    return { file, preview, wasConverted: false };
  }
}