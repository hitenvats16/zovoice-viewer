'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  ChevronDown, 
  ChevronRight, 
  Upload, 
  Copy, 
  Save,
  BookOpen,
  User,
  Hash,
  Eye,
  Info
} from 'lucide-react';

// Import types and hooks
import { 
  BookData, 
  Chapter, 
  OutputData, 
  OutputChapter,
  CurrentWord, 
  SectionMap
} from './types';
import { useNotifications } from './hooks/useNotifications';
import { useCommands } from './hooks/useCommands';
import { CommandDropdown } from './components/CommandDropdown';
import { NotificationToast } from './components/NotificationToast';

// Dynamically import PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import('./components/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-sm text-gray-800">Loading PDF...</p>
      </div>
    </div>
  )
});

export default function Home() {
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [chapterContents, setChapterContents] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [focusedChapterId, setFocusedChapterId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Record<string, number>>({});
  const [sectionMaps, setSectionMaps] = useState<Record<string, SectionMap[]>>({});
  const [currentWord, setCurrentWord] = useState<CurrentWord | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pdfWidth, setPdfWidth] = useState(600);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement>>({});

  // Custom hooks
  const { notification, showNotification, hideNotification } = useNotifications();
  const {
    commandMode,
    filteredCommands,
    selectedIndex,
    checkForCommand,
    executeCommand,
    setCommandMode
  } = useCommands({
    bookData,
    chapterContents,
    setBookData,
    setChapterContents,
    setExpandedChapters,
    setEditingTitle,
    showNotification,
    textareaRefs
  });

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const validateJsonData = (data: any): data is BookData => {
    if (!data || typeof data !== 'object') return false;
    if (!data.data || !data.data.chapters || !Array.isArray(data.data.chapters)) return false;
    if (!data.data.book_id || !data.data.title || !data.data.author) return false;
    
    return data.data.chapters.every((chapter: any) => 
      chapter.chapter_id && 
      chapter.title && 
      Array.isArray(chapter.sections) &&
      chapter.sections.every((section: any) => 
        section.section_id && 
        section.content !== undefined &&
        typeof section.page_number === 'number'
      )
    );
  };

  const handleJsonSubmit = () => {
    setJsonError(null);
    
    if (!jsonInput.trim()) {
      setJsonError('Please paste your JSON data');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      
      if (!validateJsonData(parsed)) {
        setJsonError('Invalid JSON structure. Please check that all required fields are present.');
        return;
      }

      setBookData(parsed as BookData);
      
      // Initialize chapter contents by joining section contents
      const initialContents: Record<string, string> = {};
      const initialSectionMaps: Record<string, SectionMap[]> = {};
      
      parsed.data.chapters.forEach((chapter: Chapter) => {
        const sections = chapter.sections;
        const sectionMap: SectionMap[] = [];
        let currentPosition = 0;
        
        const contentParts = sections.map((section) => {
          const content = section.content;
          const start = currentPosition;
          const end = currentPosition + content.length;
          
          sectionMap.push({
            start,
            end,
            pageNumber: section.page_number,
            sectionId: section.section_id
          });
          
          currentPosition = end + 2;
          return content;
        });
        
        initialContents[chapter.chapter_id] = contentParts.join('\n\n');
        initialSectionMaps[chapter.chapter_id] = sectionMap;
      });
      
      setChapterContents(initialContents);
      setSectionMaps(initialSectionMaps);
      
      const allChapterIds = new Set(parsed.data.chapters.map((ch: Chapter) => ch.chapter_id));
      setExpandedChapters(allChapterIds);
      
      setShowInput(false);
      setJsonInput('');
      setJsonError(null);
    } catch (error) {
      setJsonError('Invalid JSON format. Please check your input for syntax errors.');
    }
  };

  const rebuildSectionMap = (chapterId: string, newContent: string) => {
    if (!bookData) return;
    
    const chapter = bookData.data.chapters.find(ch => ch.chapter_id === chapterId);
    if (!chapter) return;

    const contentParts = newContent.split('\n\n');
    const sectionMap: SectionMap[] = [];
    let currentPosition = 0;

    contentParts.forEach((part, index) => {
      if (index < chapter.sections.length) {
        const section = chapter.sections[index];
        const start = currentPosition;
        const end = currentPosition + part.length;
        
        sectionMap.push({
          start,
          end,
          pageNumber: section.page_number,
          sectionId: section.section_id
        });
        
        currentPosition = end + 2;
      }
    });

    setSectionMaps(prev => ({
      ...prev,
      [chapterId]: sectionMap
    }));
  };

  const handleContentChange = (chapterId: string, newContent: string, cursorPos?: number) => {
    setChapterContents(prev => ({
      ...prev,
      [chapterId]: newContent
    }));
    
    rebuildSectionMap(chapterId, newContent);

    if (cursorPos !== undefined) {
      checkForCommand(chapterId, newContent, cursorPos);
    }
  };

  const extractWordAtCursor = (text: string, cursorPos: number) => {
    if (!text || cursorPos < 0 || cursorPos > text.length) return null;

    const wordRegex = /[a-zA-Z0-9À-ÿ''-]/;
    
    let adjustedPos = cursorPos;
    if (!wordRegex.test(text[cursorPos])) {
      let leftPos = cursorPos - 1;
      while (leftPos >= 0 && !wordRegex.test(text[leftPos])) leftPos--;
      
      let rightPos = cursorPos;
      while (rightPos < text.length && !wordRegex.test(text[rightPos])) rightPos++;
      
      if (leftPos >= 0 && rightPos < text.length) {
        adjustedPos = (cursorPos - leftPos <= rightPos - cursorPos) ? leftPos : rightPos;
      } else if (leftPos >= 0) {
        adjustedPos = leftPos;
      } else if (rightPos < text.length) {
        adjustedPos = rightPos;
      } else {
        return null;
      }
    }
    
    let start = adjustedPos;
    while (start > 0 && wordRegex.test(text[start - 1])) {
      start--;
    }
    
    let end = adjustedPos;
    while (end < text.length && wordRegex.test(text[end])) {
      end++;
    }
    
    const word = text.substring(start, end).trim();
    return word.length > 1 ? { word, start, end } : null;
  };

  const findSectionAtCursor = (chapterId: string, cursorPos: number) => {
    if (!bookData) return null;
    
    const chapter = bookData.data.chapters.find(ch => ch.chapter_id === chapterId);
    const currentContent = chapterContents[chapterId];
    
    if (!chapter || !currentContent) return null;
    
    const contextLength = 100;
    const beforeCursor = currentContent.substring(Math.max(0, cursorPos - contextLength), cursorPos);
    const afterCursor = currentContent.substring(cursorPos, Math.min(currentContent.length, cursorPos + contextLength));
    const contextText = beforeCursor + afterCursor;
    
    if (contextText.trim().length < 10) {
      return findSectionByPosition(chapterId, cursorPos);
    }
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const section of chapter.sections) {
      const sectionContent = section.content;
      if (!sectionContent) continue;
      
      let score = 0;
      
      const beforeWords = beforeCursor.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const afterWords = afterCursor.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const sectionWords = sectionContent.toLowerCase().split(/\s+/);
      
      const beforeMatches = beforeWords.filter(word => sectionWords.includes(word)).length;
      const afterMatches = afterWords.filter(word => sectionWords.includes(word)).length;
      
      score += (beforeMatches + afterMatches) * 10;
      
      const contextPhrases = contextText.toLowerCase().match(/\w+(?:\s+\w+){2,4}/g) || [];
      for (const phrase of contextPhrases) {
        if (sectionContent.toLowerCase().includes(phrase)) {
          score += 50;
        }
      }
      
      const sectionMap = sectionMaps[chapterId];
      if (sectionMap) {
        const sectionInfo = sectionMap.find(s => s.sectionId === section.section_id);
        if (sectionInfo && cursorPos >= sectionInfo.start && cursorPos <= sectionInfo.end) {
          score += 20;
        }
      }
      
      if (score > 0 && sectionContent.length > 50) {
        score += Math.min(sectionContent.length / 100, 10);
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          start: 0,
          end: sectionContent.length,
          pageNumber: section.page_number,
          sectionId: section.section_id,
          score: score
        };
      }
    }
    
    if (!bestMatch || bestScore < 15) {
      return findSectionByPosition(chapterId, cursorPos);
    }
    
    return bestMatch;
  };

  const findSectionByPosition = (chapterId: string, cursorPos: number) => {
    const sectionMap = sectionMaps[chapterId];
    if (!sectionMap || sectionMap.length === 0) return null;
    
    for (const section of sectionMap) {
      if (cursorPos >= section.start && cursorPos <= section.end) {
        return { ...section, score: 10 };
      }
    }
    
    for (let i = 0; i < sectionMap.length - 1; i++) {
      const currentSection = sectionMap[i];
      const nextSection = sectionMap[i + 1];
      
      if (cursorPos > currentSection.end && cursorPos < nextSection.start) {
        const distToCurrent = cursorPos - currentSection.end;
        const distToNext = nextSection.start - cursorPos;
        const selectedSection = distToCurrent <= distToNext ? currentSection : nextSection;
        return { ...selectedSection, score: 5 };
      }
    }
    
    const lastSection = sectionMap[sectionMap.length - 1];
    return lastSection ? { ...lastSection, score: 5 } : null;
  };

  const handleCursorPositionChange = (chapterId: string, cursorPos: number) => {
    setCursorPosition(prev => ({
      ...prev,
      [chapterId]: cursorPos
    }));

    const content = chapterContents[chapterId];
    if (content) {
      const wordInfo = extractWordAtCursor(content, cursorPos);
      if (wordInfo) {
        setCurrentWord({
          word: wordInfo.word,
          chapterId,
          start: wordInfo.start,
          end: wordInfo.end
        });
      } else {
        setCurrentWord(null);
      }
    }

    const section = findSectionAtCursor(chapterId, cursorPos);
    if (section && section.pageNumber !== currentPage) {
      if (section.score >= 15) {
        setCurrentPage(section.pageNumber);
      }
    }
  };

  const debouncedCursorUpdate = useCallback((chapterId: string, cursorPos: number) => {
    const timeoutId = setTimeout(() => {
      handleCursorPositionChange(chapterId, cursorPos);
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [currentPage]);

  const handleTextareaFocus = (chapterId: string) => {
    setFocusedChapterId(chapterId);
    
    if (bookData) {
      const chapter = bookData.data.chapters.find(ch => ch.chapter_id === chapterId);
      if (chapter && chapter.sections.length > 0) {
        const firstSection = chapter.sections[0];
        if (firstSection.page_number && firstSection.page_number !== currentPage) {
          setCurrentPage(firstSection.page_number);
        }
      }
    }
  };

  const onDocumentLoadStart = () => {
    setPdfLoading(true);
    setPdfError(null);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    setPdfLoading(false);
    setPdfError('Failed to load PDF. Please check the URL and try again.');
    console.error('PDF loading error:', error);
  };

  const generateOutput = (): OutputData => {
    if (!bookData) {
      throw new Error('No book data available');
    }

    const outputChapters: OutputChapter[] = bookData.data.chapters.map(chapter => ({
      chapter_id: chapter.chapter_id,
      chapter_title: chapter.title,
      chapter_content: chapterContents[chapter.chapter_id] || '',
      meta_data: {}
    }));

    return {
      chapters: outputChapters,
      book_id: parseInt(bookData.data.book_id),
      audio_generation_params: {
        exaggeration: 0.65,
        temperature: 0.7,
        cfg: 0.1,
        seed: 1
      }
    };
  };

  const copyToClipboard = () => {
    try {
      const output = generateOutput();
      navigator.clipboard.writeText(JSON.stringify(output, null, 2));
      showNotification('JSON copied to clipboard! 📋', 'success');
    } catch (error) {
      showNotification('Error generating output JSON', 'error');
    }
  };

  const autoResize = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }, []);

  const handleChapterTitleChange = (chapterId: string, newTitle: string) => {
    if (!bookData) return;
    
    const updatedChapters = bookData.data.chapters.map(chapter => 
      chapter.chapter_id === chapterId 
        ? { ...chapter, title: newTitle }
        : chapter
    );
    
    setBookData({
      ...bookData,
      data: {
        ...bookData.data,
        chapters: updatedChapters
      }
    });
    
    setEditingTitle(null);
  };

  useEffect(() => {
    setMounted(true);
    const calculatePdfWidth = () => {
      if (typeof window !== 'undefined') {
        setPdfWidth(Math.min(600, window.innerWidth * 0.4));
      }
    };
    
    calculatePdfWidth();
    window.addEventListener('resize', calculatePdfWidth);
    
    return () => {
      window.removeEventListener('resize', calculatePdfWidth);
    };
  }, []);

  useEffect(() => {
    Object.values(textareaRefs.current).forEach(textarea => {
      if (textarea) autoResize(textarea);
    });
  }, [chapterContents, autoResize]);

  if (!bookData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <BookOpen className="mx-auto w-12 h-12 text-blue-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ZoVoice Viewer</h1>
            <p className="text-gray-800">Upload your book data to get started</p>
          </div>
          
          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload JSON Data
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Paste your JSON data:
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    if (jsonError) setJsonError(null);
                  }}
                  placeholder="Paste your JSON here..."
                  className={`w-full h-40 px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none text-gray-900 placeholder-gray-500 ${
                    jsonError 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {jsonError && (
                  <p className="mt-2 text-sm text-red-600">{jsonError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleJsonSubmit}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Load Data
                </button>
                <button
                  onClick={() => {
                    setShowInput(false);
                    setJsonInput('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex relative">
      {/* Notification Toast */}
      {notification && (
        <NotificationToast
          notification={notification}
          onClose={hideNotification}
        />
      )}

      {/* PDF Viewer - Left Side */}
      <div className="w-1/2 bg-white border-r border-gray-300 flex flex-col">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-medium text-gray-900">PDF Viewer</h2>
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Eye className="w-4 h-4" />
            Page {currentPage} of {numPages}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {bookData.s3_public_link ? (
            <div className="relative">
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-800">Loading PDF...</p>
                  </div>
                </div>
              )}
              {pdfError ? (
                <div className="flex items-center justify-center h-full text-red-500">
                  <div className="text-center">
                    <p className="mb-2">⚠️ {pdfError}</p>
                    <button
                      onClick={() => {
                        setPdfError(null);
                        setPdfLoading(true);
                      }}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : mounted ? (
                <PDFViewer
                  file={bookData.s3_public_link}
                  currentPage={currentPage}
                  onLoadStart={onDocumentLoadStart}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  width={pdfWidth}
                  highlightWord={currentWord?.word}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-800">Initializing PDF viewer...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-800">
              <p>PDF not available</p>
            </div>
          )}
        </div>
        
        {/* Page Navigation */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-900">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Editor - Right Side */}
      <div className="w-1/2 bg-white flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Content Editor</h1>
              {currentWord ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 rounded-full">
                  <span className="text-xs font-medium text-yellow-800">🔍 Highlighting:</span>
                  <span className="font-mono text-sm text-yellow-900 font-bold">"{currentWord.word}"</span>
                  <span className="text-xs text-yellow-700">in PDF</span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full opacity-75">
                    <span className="text-xs text-gray-600">💡 Click on any word to highlight it in the PDF</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 border border-purple-200 rounded-full opacity-75">
                    <span className="text-xs text-purple-600">⚡ Type \ in editor for commands</span>
                  </div>

                  {/* Info tooltip */}
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-600 cursor-pointer" />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      <p className="font-medium mb-1">Keyboard & Commands</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Type <span className="font-mono">\</span> to open command palette</li>
                        <li>Filter by typing command keywords</li>
                        <li>Navigate with ↑ / ↓, press <span className="font-mono">Enter</span> to execute</li>
                        <li>Available: split, rename, duplicate, merge next/prev, clear, summary, highlight</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={copyToClipboard}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy JSON
            </button>
          </div>
          
          {/* Book Info */}
          <div className="space-y-2 text-sm text-gray-900">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Title:</span>
              <span>{bookData.data.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-500" />
              <span className="font-medium">Author:</span>
              <span>{bookData.data.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-purple-500" />
              <span className="font-medium">Book ID:</span>
              <span>{bookData.data.book_id}</span>
            </div>
            <p className="text-xs text-gray-500 pl-6">Tip: type <span className="font-mono">\</span> in the editor to open the command palette.</p>
          </div>
        </div>

        {/* Chapters */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {bookData.data.chapters.map((chapter) => (
            <div key={chapter.chapter_id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Chapter Header */}
              <div className="flex items-center bg-gray-50 hover:bg-gray-100 transition-colors">
                <button
                  onClick={() => toggleChapter(chapter.chapter_id)}
                  className="flex items-center gap-2 px-4 py-3 flex-1 text-left"
                >
                  {expandedChapters.has(chapter.chapter_id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-700" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  )}
                  
                  {editingTitle === chapter.chapter_id ? (
                    <input
                      type="text"
                      defaultValue={chapter.title}
                      onBlur={(e) => handleChapterTitleChange(chapter.chapter_id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleChapterTitleChange(chapter.chapter_id, (e.target as HTMLInputElement).value);
                        } else if (e.key === 'Escape') {
                          setEditingTitle(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="font-medium text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <h3 className="font-medium text-gray-900 flex-1">{chapter.title}</h3>
                  )}
                </button>
                
                <div className="flex items-center gap-2 px-4">
                  {editingTitle !== chapter.chapter_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitle(chapter.chapter_id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Edit chapter title"
                    >
                      <span className="text-sm">✏️</span>
                    </button>
                  )}
                  <span className="text-sm text-gray-700">ID: {chapter.chapter_id}</span>
                </div>
              </div>

              {/* Chapter Content */}
              {expandedChapters.has(chapter.chapter_id) && (
                <div className="p-4">
                  <div className="relative">
                    {/* Word highlight overlay - simplified for better UX */}
                    {currentWord && currentWord.chapterId === chapter.chapter_id && (
                      <div className="absolute top-0 right-0 pointer-events-none z-30 m-2">
                        <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full shadow-lg text-xs font-medium animate-pulse">
                          ✨ "{currentWord.word}"
                        </div>
                      </div>
                    )}
                    
                    <textarea
                      ref={(el) => {
                        if (el) textareaRefs.current[chapter.chapter_id] = el;
                      }}
                      value={chapterContents[chapter.chapter_id] || ''}
                      onChange={(e) => {
                        const textarea = e.target as HTMLTextAreaElement;
                        handleContentChange(chapter.chapter_id, textarea.value, textarea.selectionStart);
                        debouncedCursorUpdate(chapter.chapter_id, textarea.selectionStart);
                      }}
                      onKeyDown={(e) => {
                        if (commandMode?.active && commandMode.chapterId === chapter.chapter_id) {
                          if (e.key === 'Escape') {
                            setCommandMode(null);
                            e.preventDefault();
                          } else if (e.key === 'Enter' && filteredCommands.length > 0) {
                            executeCommand(filteredCommands[selectedIndex] || filteredCommands[0]);
                            e.preventDefault();
                          } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault();
                          }
                        }
                      }}
                      onFocus={() => handleTextareaFocus(chapter.chapter_id)}
                      onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                      onClick={(e) => {
                        const textarea = e.target as HTMLTextAreaElement;
                        handleCursorPositionChange(chapter.chapter_id, textarea.selectionStart);
                      }}
                      onKeyUp={(e) => {
                        const textarea = e.target as HTMLTextAreaElement;
                        debouncedCursorUpdate(chapter.chapter_id, textarea.selectionStart);
                      }}
                      onSelect={(e) => {
                        const textarea = e.target as HTMLTextAreaElement;
                        handleCursorPositionChange(chapter.chapter_id, textarea.selectionStart);
                      }}
                      placeholder="Chapter content..."
                      className={`relative z-20 w-full min-h-[200px] p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 bg-transparent ${
                        focusedChapterId === chapter.chapter_id 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-300 bg-white'
                      }`}
                    />

                    {/* Command Dropdown */}
                    {commandMode?.active && commandMode.chapterId === chapter.chapter_id && (
                      <CommandDropdown
                        commandMode={commandMode}
                        filteredCommands={filteredCommands}
                        onExecuteCommand={executeCommand}
                        selectedIndex={selectedIndex}
                      />
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-700 space-y-1">
                    <div>
                      {chapter.sections.length} sections • 
                      Pages: {[...new Set(chapter.sections.map(s => s.page_number))].join(', ')}
                      {cursorPosition[chapter.chapter_id] !== undefined && (() => {
                        const section = findSectionAtCursor(chapter.chapter_id, cursorPosition[chapter.chapter_id]);
                        return section ? (
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            section.score > 50 ? 'bg-green-100 text-green-800' : 
                            section.score > 20 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            📍 Page {section.pageNumber}
                            <span className="ml-1 text-xs opacity-75">
                              ({section.score > 50 ? 'content match' : section.score > 20 ? 'partial match' : 'position fallback'})
                            </span>
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {currentWord && currentWord.chapterId === chapter.chapter_id && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-mono">
                          🎯 Highlighting in PDF: "{currentWord.word}"
                        </span>
                        <span className="text-xs text-gray-500">
                          (pos: {currentWord.start}-{currentWord.end})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}