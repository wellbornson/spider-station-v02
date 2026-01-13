'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const GalleryPage = () => {
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sample gallery images (would typically come from an API or local storage)
  useEffect(() => {
    // Simulate loading images
    setTimeout(() => {
      const sampleImages = [
        '/api/placeholder/800/600?text=Gallery+Image+1',
        '/api/placeholder/800/600?text=Gallery+Image+2',
        '/api/placeholder/800/600?text=Gallery+Image+3',
        '/api/placeholder/800/600?text=Gallery+Image+4',
        '/api/placeholder/800/600?text=Gallery+Image+5',
        '/api/placeholder/800/600?text=Gallery+Image+6',
        '/api/placeholder/800/600?text=Gallery+Image+7',
        '/api/placeholder/800/600?text=Gallery+Image+8',
      ];
      setImages(sampleImages);
      setIsLoading(false);
    }, 500);
  }, []);

  const openImage = (image: string) => {
    setSelectedImage(image);
  };

  const closeImage = () => {
    setSelectedImage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-white/10 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center transition-colors border border-white/30 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to POS
            </Link>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] tracking-tighter">CRYSTAL GLASS GALLERY 🎨</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative group cursor-pointer overflow-hidden rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/30 aspect-square shadow-[0_0_20px_rgba(224,224,224,0.4)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]"
                onClick={() => openImage(image)}
              >
                <img
                  src={image}
                  alt={`Gallery item ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Crystal glass effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <h3 className="text-white font-bold text-lg">Image {index + 1}</h3>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4"
            onClick={closeImage}
          >
            <div className="relative max-w-6xl max-h-[90vh]">
              <button
                className="absolute -top-16 right-0 text-white bg-white/20 hover:bg-white/30 rounded-full w-12 h-12 flex items-center justify-center text-2xl z-10 backdrop-blur-sm border border-white/30 shadow-lg"
                onClick={closeImage}
              >
                ✕
              </button>
              <img 
                src={selectedImage} 
                alt="Enlarged view" 
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryPage;