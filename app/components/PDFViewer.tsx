'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  file: string;
  currentPage: number;
  onLoadStart: () => void;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
  onLoadError: (error: Error) => void;
  width?: number;
  highlightWord?: string;
}

export default function PDFViewer({
  file,
  currentPage,
  onLoadStart,
  onLoadSuccess,
  onLoadError,
  width = 600,
  highlightWord
}: PDFViewerProps) {
  const [isSearching, setIsSearching] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  // Function to search and highlight text in the PDF text layer
  useEffect(() => {
    if (!highlightWord || !pageRef.current) return;

    const searchInTextLayer = () => {
      // Clear previous highlights
      const existingHighlights = pageRef.current?.querySelectorAll('.word-highlight');
      existingHighlights?.forEach(el => el.remove());

      // Find text layer elements
      const textLayer = pageRef.current?.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) return;

      setIsSearching(true);
      
      // Search for the word in text spans
      const textSpans = textLayer.querySelectorAll('span');
      let found = false;

      textSpans.forEach((span) => {
        const textContent = span.textContent?.toLowerCase() || '';
        const searchWord = highlightWord.toLowerCase();
        
        if (textContent.includes(searchWord)) {
          // Create highlight overlay
          const rect = span.getBoundingClientRect();
          const containerRect = pageRef.current?.getBoundingClientRect();
          
          if (containerRect) {
            const highlight = document.createElement('div');
            highlight.className = 'word-highlight absolute bg-yellow-300 opacity-60 pointer-events-none z-20';
            highlight.style.left = `${rect.left - containerRect.left}px`;
            highlight.style.top = `${rect.top - containerRect.top}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;
            highlight.style.borderRadius = '2px';
            
            pageRef.current?.appendChild(highlight);
            found = true;
          }
        }
      });

      setIsSearching(false);
      return found;
    };

    // Delay search to ensure text layer is rendered
    const timeoutId = setTimeout(searchInTextLayer, 500);
    return () => clearTimeout(timeoutId);
  }, [highlightWord, currentPage]);

  return (
    <div className="relative" ref={pageRef}>
      <Document
        file={file}
        onLoadStart={onLoadStart}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        className="flex justify-center"
      >
        <Page 
          pageNumber={currentPage} 
          className="border border-gray-300 shadow-sm"
          width={width}
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </Document>
      
      {/* Word tracking indicator */}
      {highlightWord && (
        <div className="absolute top-2 right-2 pointer-events-none z-30">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full shadow-lg text-xs font-medium flex items-center gap-2">
            {isSearching ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                Highlighting: "{highlightWord}"
              </>
            )}
          </div>
        </div>
      )}

      {/* Instruction overlay */}
      {highlightWord && (
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none z-30">
          <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded text-xs text-center">
            💡 Word "{highlightWord}" is highlighted in yellow on this page
          </div>
        </div>
      )}
    </div>
  );
} 