import { useState, useRef, useEffect } from 'react';
import { Command, CommandMode, BookData, Chapter } from '../types';

interface UseCommandsProps {
  bookData: BookData | null;
  chapterContents: Record<string, string>;
  setBookData: (data: BookData) => void;
  setChapterContents: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setExpandedChapters: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEditingTitle: (id: string) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  textareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement>>;
}

export const useCommands = ({
  bookData,
  chapterContents,
  setBookData,
  setChapterContents,
  setExpandedChapters,
  setEditingTitle,
  showNotification,
  textareaRefs
}: UseCommandsProps) => {
  const [commandMode, setCommandMode] = useState<CommandMode | null>(null);

  // Command execution functions
  const splitChapter = (chapterId: string, position: number) => {
    if (!bookData) return;
    
    const content = chapterContents[chapterId] || '';
    const beforeContent = content.substring(0, position).trim();
    const afterContent = content.substring(position).trim();
    
    if (!beforeContent || !afterContent) {
      showNotification('Cannot split chapter: Not enough content before or after cursor position', 'error');
      return;
    }

    const chapter = bookData.data.chapters.find(ch => ch.chapter_id === chapterId);
    if (!chapter) return;

    const chapterIndex = bookData.data.chapters.indexOf(chapter);
    const newChapterId = `${chapterId}-split-${Date.now()}`;
    
    const newChapter: Chapter = {
      chapter_id: newChapterId,
      title: `${chapter.title} (Part 2)`,
      sections: chapter.sections.map(section => ({
        ...section,
        section_id: `${section.section_id}-split`,
        content: ''
      }))
    };

    const updatedChapters = [...bookData.data.chapters];
    updatedChapters.splice(chapterIndex + 1, 0, newChapter);
    
    setBookData({
      ...bookData,
      data: {
        ...bookData.data,
        chapters: updatedChapters
      }
    });

    setChapterContents(prev => ({
      ...prev,
      [chapterId]: beforeContent,
      [newChapterId]: afterContent
    }));

    setExpandedChapters(prev => new Set([...prev, newChapterId]));
    showNotification(`✂️ Chapter split successfully! Created "${newChapter.title}"`, 'success');
  };

  const duplicateChapter = (chapterId: string) => {
    if (!bookData) return;
    
    const chapter = bookData.data.chapters.find(ch => ch.chapter_id === chapterId);
    if (!chapter) return;

    const chapterIndex = bookData.data.chapters.indexOf(chapter);
    const newChapterId = `${chapterId}-copy-${Date.now()}`;
    
    const newChapter: Chapter = {
      chapter_id: newChapterId,
      title: `${chapter.title} (Copy)`,
      sections: chapter.sections.map(section => ({
        ...section,
        section_id: `${section.section_id}-copy`,
      }))
    };

    const updatedChapters = [...bookData.data.chapters];
    updatedChapters.splice(chapterIndex + 1, 0, newChapter);
    
    setBookData({
      ...bookData,
      data: {
        ...bookData.data,
        chapters: updatedChapters
      }
    });

    setChapterContents(prev => ({
      ...prev,
      [newChapterId]: chapterContents[chapterId] || ''
    }));

    setExpandedChapters(prev => new Set([...prev, newChapterId]));
    showNotification(`📋 Chapter duplicated successfully!`, 'success');
  };

  const mergeWithNext = (chapterId: string) => {
    if (!bookData) return;
    
    const chapterIndex = bookData.data.chapters.findIndex(ch => ch.chapter_id === chapterId);
    if (chapterIndex === -1 || chapterIndex >= bookData.data.chapters.length - 1) {
      showNotification('Cannot merge: This is the last chapter', 'error');
      return;
    }

    const currentChapter = bookData.data.chapters[chapterIndex];
    const nextChapter = bookData.data.chapters[chapterIndex + 1];
    
    const currentContent = chapterContents[chapterId] || '';
    const nextContent = chapterContents[nextChapter.chapter_id] || '';
    const mergedContent = `${currentContent}\n\n${nextContent}`;

    const updatedChapters = bookData.data.chapters.filter((_, index) => index !== chapterIndex + 1);
    
    setBookData({
      ...bookData,
      data: {
        ...bookData.data,
        chapters: updatedChapters
      }
    });

    setChapterContents(prev => {
      const newContents = { ...prev };
      newContents[chapterId] = mergedContent;
      delete newContents[nextChapter.chapter_id];
      return newContents;
    });

    showNotification(`🔗 Merged with "${nextChapter.title}" successfully!`, 'success');
  };

  const mergeWithPrevious = (chapterId: string) => {
    if (!bookData) return;

    const chapterIndex = bookData.data.chapters.findIndex(ch => ch.chapter_id === chapterId);
    if (chapterIndex <= 0) {
      showNotification('Cannot merge: This is the first chapter', 'error');
      return;
    }

    const prevChapter = bookData.data.chapters[chapterIndex - 1];
    const currentChapter = bookData.data.chapters[chapterIndex];

    const prevContent = chapterContents[prevChapter.chapter_id] || '';
    const currentContent = chapterContents[chapterId] || '';
    const mergedContent = `${prevContent}\n\n${currentContent}`;

    const updatedChapters = bookData.data.chapters.filter((_, index) => index !== chapterIndex);

    setBookData({
      ...bookData,
      data: {
        ...bookData.data,
        chapters: updatedChapters
      }
    });

    setChapterContents(prev => {
      const newContents = { ...prev };
      newContents[prevChapter.chapter_id] = mergedContent;
      delete newContents[chapterId];
      return newContents;
    });

    showNotification(`🔗 Merged with "${currentChapter.title}" successfully!`, 'success');
  };

  const clearChapter = (chapterId: string) => {
    if (confirm('Are you sure you want to clear all content from this chapter?')) {
      setChapterContents(prev => ({
        ...prev,
        [chapterId]: ''
      }));
    }
  };

  const addSummary = (chapterId: string, position: number) => {
    const content = chapterContents[chapterId] || '';
    const summaryText = '\n\n## Summary\n\n[Add your summary here]\n\n';
    const newContent = content.substring(0, position) + summaryText + content.substring(position);
    
    setChapterContents(prev => ({
      ...prev,
      [chapterId]: newContent
    }));
  };

  const addHighlight = (chapterId: string, position: number) => {
    const content = chapterContents[chapterId] || '';
    const highlightText = '**[highlighted text]**';
    const newContent = content.substring(0, position) + highlightText + content.substring(position);
    
    setChapterContents(prev => ({
      ...prev,
      [chapterId]: newContent
    }));
  };

  // Command definitions
  const commands: Command[] = [
    {
      id: 'split',
      label: 'Split Chapter',
      description: 'Split this chapter into two at cursor position',
      icon: '✂️',
      keywords: ['split', 'divide', 'break', 'separate'],
      action: splitChapter
    },
    {
      id: 'rename',
      label: 'Rename Chapter',
      description: 'Edit the chapter title',
      icon: '✏️',
      keywords: ['rename', 'title', 'edit', 'name'],
      action: (chapterId: string) => setEditingTitle(chapterId)
    },
    {
      id: 'duplicate',
      label: 'Duplicate Chapter',
      description: 'Create a copy of this chapter',
      icon: '📋',
      keywords: ['duplicate', 'copy', 'clone'],
      action: duplicateChapter
    },
    {
      id: 'merge',
      label: 'Merge with Next',
      description: 'Merge this chapter with the next one',
      icon: '🔗',
      keywords: ['merge', 'combine', 'join', 'next'],
      action: mergeWithNext
    },
    {
      id: 'mergePrev',
      label: 'Merge with Previous',
      description: 'Merge this chapter with the previous one',
      icon: '🔗',
      keywords: ['merge', 'combine', 'join', 'previous', 'prev'],
      action: mergeWithPrevious
    },
    {
      id: 'clear',
      label: 'Clear Content',
      description: 'Remove all content from this chapter',
      icon: '🗑️',
      keywords: ['clear', 'empty', 'delete', 'remove'],
      action: clearChapter
    },
    {
      id: 'summary',
      label: 'Add Summary',
      description: 'Insert a summary section at cursor',
      icon: '📝',
      keywords: ['summary', 'overview', 'abstract'],
      action: addSummary
    },
    {
      id: 'highlight',
      label: 'Highlight Text',
      description: 'Add highlighting markup to selected text',
      icon: '🖍️',
      keywords: ['highlight', 'mark', 'emphasis'],
      action: addHighlight
    }
  ];

  const filteredCommands = commands.filter(command => {
    if (!commandMode?.query) return true;
    const query = commandMode.query.toLowerCase();
    return command.keywords.some(keyword => keyword.includes(query)) ||
           command.label.toLowerCase().includes(query) ||
           command.description.toLowerCase().includes(query);
  });

  // Track which command is highlighted
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selected index whenever the dropdown opens or the query changes
  useEffect(() => {
    if (commandMode?.active) {
      setSelectedIndex(0);
    }
  }, [commandMode?.active, commandMode?.query]);

  // Ensure selectedIndex is always within filteredCommands range
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(filteredCommands.length - 1);
    }
  }, [filteredCommands.length]);

  // Handle global keyboard navigation when command palette is active
  useEffect(() => {
    if (!commandMode?.active) return;

    const listener = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) executeCommand(cmd);
      }
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [commandMode?.active, filteredCommands, selectedIndex]);

  const checkForCommand = (chapterId: string, content: string, cursorPos: number) => {
    const charAtCursor = content[cursorPos - 1];
    
    if (charAtCursor === '\\' && (cursorPos === 1 || /\s/.test(content[cursorPos - 2]))) {
      const textarea = textareaRefs.current[chapterId];
      let coords = { x: 0, y: 0 };
      
      if (textarea) {
        const div = document.createElement('div');
        const styles = window.getComputedStyle(textarea);
        
        div.style.font = styles.font;
        div.style.padding = styles.padding;
        div.style.border = styles.border;
        div.style.lineHeight = styles.lineHeight;
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word';
        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.width = textarea.clientWidth + 'px';
        
        div.textContent = content.substring(0, cursorPos);

        // Insert an invisible marker at the caret location so we can measure its position
        const marker = document.createElement('span');
        marker.textContent = '\u200b'; // zero-width space
        div.appendChild(marker);

        document.body.appendChild(div);

        const divRect = div.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();

        coords = {
          // Horizontal position of the caret relative to the viewport
          x: textareaRect.left + (markerRect.left - divRect.left) - textarea.scrollLeft,
          // Vertical position of the caret plus a small offset to appear below the line
          y: textareaRect.top + (markerRect.top - divRect.top) - textarea.scrollTop + 20
        };

        document.body.removeChild(div);
      }
      
      setCommandMode({
        active: true,
        chapterId,
        position: cursorPos - 1,
        query: '',
        coords
      });
    } else if (commandMode?.active && commandMode.chapterId === chapterId) {
      const commandStart = commandMode.position;
      const commandText = content.substring(commandStart, cursorPos);
      
      if (commandText.startsWith('\\') && /^\\[a-zA-Z]*$/.test(commandText)) {
        const query = commandText.substring(1);
        setCommandMode({
          ...commandMode,
          query
        });
      } else {
        setCommandMode(null);
      }
    }
  };

  const executeCommand = (command: Command) => {
    if (!commandMode) return;
    
    const { chapterId, position } = commandMode;
    const content = chapterContents[chapterId] || '';
    
    const beforeCommand = content.substring(0, position);
    const afterCommand = content.substring(position + commandMode.query.length + 1);
    const newContent = beforeCommand + afterCommand;
    
    setChapterContents(prev => ({
      ...prev,
      [chapterId]: newContent
    }));
    
    command.action(chapterId, position);
    setCommandMode(null);
  };

  return {
    commandMode,
    commands,
    filteredCommands,
    selectedIndex,
    checkForCommand,
    executeCommand,
    setCommandMode
  };
}; 