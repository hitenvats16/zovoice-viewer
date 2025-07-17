# ZoVoice Viewer

A powerful web application for viewing and editing PDF documents with structured content. This application allows you to load PDF documents alongside their structured JSON data, edit the content, and export the edited content in a specific format.

## Features

- **PDF Viewer**: Display PDF documents with page navigation
- **Content Editor**: Edit structured content with collapsible chapters
- **Sync Navigation**: Automatically navigate to relevant PDF pages when editing content
- **JSON Import/Export**: Load data from JSON and export edited content
- **Responsive Design**: Clean, modern interface with smooth user experience

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Loading Data

1. Click the "Upload JSON Data" button on the homepage
2. Paste your JSON data in the provided textarea
3. Click "Load Data" to initialize the application

### 2. JSON Data Structure

The application expects JSON data in the following format:

```json
{
  "title": "Document Title",
  "author": "Author Name",
  "data": {
    "book_id": "unique_id",
    "title": "Document Title",
    "author": "Author Name",
    "chapters": [
      {
        "chapter_id": "ch-1",
        "title": "Chapter Title",
        "sections": [
          {
            "section_id": "section-1",
            "content": "Section content text",
            "content_type": "paragraph",
            "page_number": 1,
            "raw_text": null,
            "level": null
          }
        ]
      }
    ]
  },
  "s3_public_link": "https://example.com/document.pdf",
  "id": 1,
  "s3_key": "documents/document.pdf",
  "user_id": 1,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-01T00:00:00.000Z"
}
```

### 3. Editing Content

1. **View Structure**: The right panel shows the document title, author, and book ID
2. **Expand Chapters**: Click on chapter headers to expand/collapse content
3. **Edit Text**: Click in the text areas to edit chapter content
4. **Page Sync**: When you focus on a chapter's text area, the PDF viewer automatically navigates to the relevant page
5. **Auto-resize**: Text areas automatically resize as you type

### 4. Navigation

- **PDF Navigation**: Use the Previous/Next buttons or manually navigate through PDF pages
- **Chapter Focus**: Clicking on a chapter's text area will automatically show the corresponding PDF page
- **Page Indicators**: The PDF viewer shows current page and total pages

### 5. Exporting Data

1. After editing your content, click the "Copy JSON" button
2. The application will generate a JSON output in this format:

```json
{
  "chapters": [
    {
      "chapter_id": "ch-1",
      "chapter_title": "Chapter Title",
      "chapter_content": "Edited chapter content...",
      "meta_data": {}
    }
  ],
  "book_id": 1,
  "audio_generation_params": {
    "exaggeration": 0.65,
    "temperature": 0.7,
    "cfg": 0.1,
    "seed": 1
  }
}
```

## Key Features

### Automatic Content Joining
- Section contents within each chapter are automatically joined with double line breaks
- Original section structure is preserved for reference

### Smart Page Navigation
- When you focus on editing a chapter, the PDF automatically navigates to the first page of that chapter
- Page numbers are extracted from the section metadata

### Responsive Text Areas
- Text areas automatically resize based on content length
- Visual feedback when a chapter is being edited (highlighted border)

### Chapter Management
- Collapsible chapter interface for better organization
- Chapter metadata (ID, section count, page range) displayed for reference

## Technology Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **react-pdf** - PDF rendering
- **Lucide React** - Icons

## Development

The application is built with modern React patterns:
- Functional components with hooks
- TypeScript for type safety
- Responsive design with Tailwind CSS
- Efficient state management

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### PDF Not Loading
- Ensure the PDF URL is accessible and allows cross-origin requests
- Check browser console for CORS errors

### Large Files
- For large PDFs, initial loading may take time
- The application handles pagination efficiently

### JSON Format Errors
- Validate your JSON structure before importing
- Check that all required fields are present

## License

This project is licensed under the MIT License.
