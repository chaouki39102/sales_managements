// resources/js/components/ui/ImageUploader.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { productService } from '@/services/productService';

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUrls = [...value];
    for (const file of acceptedFiles) {
      try {
        const { url } = await productService.uploadImage(file);
        newUrls.push(url);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    onChange(newUrls);
  }, [value, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const removeImage = (index: number) => {
    const newUrls = [...value];
    newUrls.splice(index, 1);
    onChange(newUrls);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>أفلت الصور هنا...</p>
        ) : (
          <p>اسحب وأفلت الصور هنا، أو انقر للاختيار</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {value.map((url, idx) => (
          <div key={idx} className="relative w-20 h-20">
            <img src={url} alt={`upload-${idx}`} className="w-full h-full object-cover rounded" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
