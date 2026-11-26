const fs = require('fs');
const path = require('path');

const markdownContent = fs.readFileSync(path.join(__dirname, '..', 'docs', 'AttendX_Complete_Project_Guide.md'), 'utf8');

// Escape backticks and backslashes for JS string embedding
const escapedMarkdown = JSON.stringify(markdownContent);

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AttendX — Complete Project Documentation & University Viva Preparation Booklet</title>
  
  <!-- GitHub Markdown CSS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown.min.css">
  
  <!-- KaTeX Math CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">

  <style>
    @media print {
      body {
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-before: always;
      }
      @page {
        margin: 20mm;
        size: A4 portrait;
      }
    }
    
    body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px 20px;
      background-color: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    }
    
    .markdown-body {
      background-color: transparent !important;
      color: inherit !important;
    }
    
    .markdown-body a {
      color: #58a6ff;
    }
    
    .markdown-body pre {
      background-color: #161b22 !important;
      border: 1px solid #30363d;
      border-radius: 8px;
    }
    
    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    
    .markdown-body table th {
      background-color: #161b22;
      color: #f0f6fc;
      border: 1px solid #30363d;
      padding: 10px 14px;
    }
    
    .markdown-body table td {
      border: 1px solid #30363d;
      padding: 10px 14px;
    }
    
    .markdown-body table tr:nth-child(2n) {
      background-color: #161b22;
    }
    
    .markdown-body hr {
      height: 2px;
      background-color: #30363d;
      margin: 32px 0;
    }
    
    .banner {
      background: linear-gradient(135deg, #1f2937, #111827);
      border: 1px solid #374151;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .banner-title {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    
    .banner-sub {
      font-size: 14px;
      color: #9ca3af;
      margin-top: 4px;
    }
    
    .print-btn {
      background-color: #2563eb;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .print-btn:hover {
      background-color: #1d4ed8;
    }
    
    .mermaid {
      background: #161b22;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #30363d;
      margin: 20px 0;
      display: flex;
      justify-content: center;
    }
  </style>

  <!-- Marked Parser -->
  <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
  <!-- Mermaid.js -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.8.0/dist/mermaid.min.js"></script>
</head>
<body>

  <div class="banner no-print">
    <div>
      <h1 class="banner-title">AttendX — Viva Preparation & Master Project Guide</h1>
      <div class="banner-sub">Complete Technical Documentation & University Defense Guide • MMMUT 2026–27</div>
    </div>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <article id="content" class="markdown-body"></article>

  <script>
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark'
    });

    const markdownText = ${escapedMarkdown};

    // Configure marked to render code blocks and recognize mermaid
    const renderer = new marked.Renderer();
    const originalCodeRenderer = renderer.code.bind(renderer);
    
    renderer.code = function(code, language) {
      if (language === 'mermaid') {
        return '<div class="mermaid">' + code + '</div>';
      }
      return originalCodeRenderer(code, language);
    };

    marked.setOptions({
      renderer: renderer,
      gfm: true,
      breaks: false
    });

    document.getElementById('content').innerHTML = marked.parse(markdownText);

    // Render Mermaid diagrams
    mermaid.run();
  </script>
</body>
</html>
`;

const outputPath = path.join(__dirname, '..', 'docs', 'AttendX_Complete_Project_Guide.html');
fs.writeFileSync(outputPath, htmlTemplate, 'utf8');
console.log('Successfully generated docs/AttendX_Complete_Project_Guide.html. Size:', htmlTemplate.length, 'bytes');
