document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const statusElement = document.getElementById('status');
  statusElement.textContent = 'Scraping...';

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Execute script in the active tab to scrape the page
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapePage
    });

    // Get the data from the result
    const data = result[0].result;

    if (data && data.success) {
      // Extract page name from URL for the filename
      const urlObj = new URL(tab.url);
      let filename = urlObj.hostname.replace('www.', '').split('.')[0];

      // Add a path segment if available
      const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
      if (pathSegments.length > 0) {
        filename += '-' + pathSegments[pathSegments.length - 1];
      }

      // Clean the filename
      filename = filename.replace(/[^\w\-]/g, '');

      // Make sure we have a valid filename
      if (!filename || filename.length < 2) {
        filename = 'component';
      }

      // Create .tsx file content with the scraped content
      const tsxContent = generateTsxComponent(data.data);

      // Create a downloadable blob for TSX
      const tsxBlob = new Blob([tsxContent], { type: 'text/plain' });
      const tsxUrl = URL.createObjectURL(tsxBlob);

      // Download the TSX file
      await chrome.downloads.download({
        url: tsxUrl,
        filename: filename + '.tsx',
        saveAs: true
      });

      // Create text content version
      const textContent = generateTextContent(data.data);

      // Create a downloadable blob for text
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(textBlob);

      // Download the text file
      await chrome.downloads.download({
        url: textUrl,
        filename: filename + '.txt',
        saveAs: false
      });

      statusElement.textContent = 'Scraping completed! TSX and TXT files created.';
    } else {
      statusElement.textContent = 'Error: ' + (data ? data.message : 'No data found');

      if (data && data.debugInfo) {
        console.log('Debug info:', data.debugInfo);
        statusElement.textContent += ' (See console for debug info)';
      }
    }
  } catch (error) {
    statusElement.textContent = 'Error: ' + error.message;
    console.error(error);
  }
});

// Generate plain text content file
function generateTextContent(data) {
  // Extract paragraphs
  const paragraphs = data.content
      .filter(item => item.type === 'paragraph')
      .map(item => item.text);

  // Extract all lists
  const lists = data.content
      .filter(item => item.type === 'list' && item.items && item.items.length > 0);

  // Extract headings
  const headings = data.content
      .filter(item => item.type === 'heading')
      .map(item => item.text);

  // Build the text content
  let textContent = `# ${data.title}\n\n`;

  // Add source and contributor info
  textContent += `Source: ${data.url || 'Unknown'}\n`;
  textContent += `Contributor: https://github.com/kimoodua\n\n`;

  // Add paragraphs
  paragraphs.forEach(para => {
    textContent += `${para}\n\n`;
  });

  // Add lists
  lists.forEach((list, index) => {
    if (index < headings.length) {
      textContent += `## ${headings[index]}\n\n`;
    }

    list.items.forEach((item, i) => {
      textContent += `${i+1}. ${item}\n`;
    });

    textContent += '\n';
  });

  return textContent;
}

// Generate React component from the scraped data
function generateTsxComponent(data) {
  // Extract component name from title or URL
  let componentName = 'ScrapedComponent';

  if (data.title) {
    componentName = data.title
        .split(/[|:]/)[0]  // Split by common title separators and take first part
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '')
        .replace(/^\d+/, ''); // Remove leading numbers
  }

  // Make sure component name starts with uppercase letter (React requirement)
  componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

  // If componentName is empty or doesn't start with a letter, use default
  if (!componentName || !componentName.match(/^[A-Z]/)) {
    componentName = 'ScrapedComponent';
  }

  // Extract paragraphs
  const paragraphs = data.content
      .filter(item => item.type === 'paragraph')
      .map(item => item.text);

  // Extract all lists
  const lists = data.content
      .filter(item => item.type === 'list' && item.items && item.items.length > 0);

  // Extract features (from the first list found)
  const features = lists.length > 0 ? lists[0].items : [];

  // Extract headings
  const headings = data.content
      .filter(item => item.type === 'heading')
      .map(item => item.text);

  // Generate the component
  return `import React, { useState } from 'react';

// Copy of the original component
const ${componentName} = ({ isDark }) => {
  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Developer credit */}
      <div className="flex justify-between items-center mb-6">
        <a 
          href="https://github.com/kimoodua" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors"
        >
          kimoodua <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
        </a>
        
        {/* Source info */}
        <a 
          href="${data.url || '#'}" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors"
        >
          Source <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </div>

      {/* Hero Section */}
      <div className={
        "rounded-xl p-8 mb-8 " + 
        (isDark ? "bg-gray-800" : "bg-gray-50")
      }>
        <h1 className={
          "text-3xl font-bold mb-4 " + 
          (isDark ? "text-white" : "text-gray-900")
        }>
          ${data.title}
        </h1>
        ${data.meta_info && data.meta_info.length > 0 ?
      `<div className={
          "flex flex-wrap gap-4 text-sm " + 
          (isDark ? "text-gray-400" : "text-gray-500")
        }>
          ${data.meta_info.map(info => `<span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg> ${info}</span>`).join('\n          ')}
        </div>` : ''}
      </div>

      {/* Main Content */}
      <div className="space-y-6 mb-12">
        ${paragraphs.slice(0, Math.min(3, paragraphs.length)).map(para => `
        <p className={
          "text-lg leading-relaxed " + 
          (isDark ? "text-gray-300" : "text-gray-600")
        }>
          ${para}
        </p>`).join('')}
      </div>

      ${features.length > 0 ? `
      {/* Features Section */}
      <div className={
        "rounded-xl p-8 mb-12 " + 
        (isDark ? "bg-gray-800/50 border border-gray-700" : "bg-white shadow-lg")
      }>
        <h2 className={
          "text-2xl font-semibold mb-6 flex items-center gap-3 " + 
          (isDark ? "text-white" : "text-gray-900")
        }>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Key Points
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ${features.map(feature => `"${feature}"`).join(',\n            ')}
          ].map((feature, index) => (
            <div 
              key={index}
              className={
                "flex items-center gap-3 p-3 rounded-lg " + 
                (isDark ? "bg-gray-800" : "bg-gray-50")
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-green-500 flex-shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>` : ''}

      ${lists.length > 1 ? `
      {/* Additional Lists */}
      <div className={
        "rounded-xl p-8 mb-12 " +
        (isDark ? "bg-gray-800/50 border border-gray-700" : "bg-white shadow-lg")
      }>
        <h2 className={
          "text-2xl font-semibold mb-6 flex items-center gap-3 " +
          (isDark ? "text-white" : "text-gray-900")
        }>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-500"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          Details
        </h2>

        <div className="space-y-8">
          ${lists.slice(1).map((list, listIndex) => `
          <div className="space-y-4">
            ${headings[listIndex] ? `
            <h3 className={
              "text-lg font-semibold " +
              (isDark ? "text-white" : "text-gray-900")
            }>
              ${headings[listIndex]}
            </h3>` : ''}
            <div className="space-y-3">
              ${list.items.map((item, itemIndex) => `
              <div 
                key={${itemIndex}}
                className={
                  "flex items-center gap-4 p-4 rounded-lg " +
                  (isDark ? "bg-gray-800" : "bg-gray-50")
                }
              >
                <span className={
                  "w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium " +
                  (isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700")
                }>
                  ${itemIndex + 1}
                </span>
                <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                  ${item}
                </span>
              </div>`).join('')}
            </div>
          </div>`).join('')}
        </div>
      </div>` : ''}

      {/* Additional Content */}
      <div className="space-y-6">
        ${paragraphs.slice(3).map(para => `
        <p className={
          "text-base leading-relaxed " +
          (isDark ? "text-gray-300" : "text-gray-600")
        }>
          ${para}
        </p>`).join('')}
      </div>
      
      {/* Footer credit */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <a 
          href="https://github.com/kimoodua" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors w-full"
        >
          Generated by ScraperBuddy | kimoodua <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
        </a>
      </div>
    </div>
  );
};

// Preview application that lets you toggle dark mode
const PreviewApp = () => {
  const [isDark, setIsDark] = useState(false);
  
  return (
    <div className={isDark ? "bg-gray-900 min-h-screen p-4" : "bg-white min-h-screen p-4"}>
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Toggle {isDark ? "Light" : "Dark"} Mode
        </button>
      </div>
      
      <${componentName} isDark={isDark} />
    </div>
  );
};

export default PreviewApp;
`;
}

// Function to scrape the page content
function scrapePage() {
  try {
    // Debug information to help diagnose issues
    const debugInfo = {
      url: window.location.href,
      pageTitle: document.title,
      elementCounts: {}
    };

    // Helper function to count elements
    function countElements(selector) {
      const elements = document.querySelectorAll(selector);
      debugInfo.elementCounts[selector] = elements.length;
      return elements;
    }

    // Extract the title - try multiple common selectors
    const titleSelectors = [
      'h1',
      '.article__title',
      '.post-title',
      '.entry-title',
      '.title',
      '.headline',
      'header h1',
      'article h1',
      '.content h1',
      '.main-content h1'
    ];

    let titleElement = null;
    for (const selector of titleSelectors) {
      titleElement = document.querySelector(selector);
      if (titleElement) break;
    }

    const title = titleElement ? titleElement.textContent.trim() : document.title || 'No Title Found';

    // Extract metadata like date and reading time if available
    const metaInfo = [];
    const metaSelectors = [
      '.article__info .article__info-meta',
      '.post-meta',
      '.entry-meta',
      '.meta',
      '.published-date',
      '.post-date',
      'time'
    ];

    for (const selector of metaSelectors) {
      const metaElements = countElements(selector);
      if (metaElements.length > 0) {
        metaElements.forEach(element => {
          const text = element.textContent.trim();
          if (text) metaInfo.push(text);
        });
        break;
      }
    }

    // Extract the main content - try multiple common selectors
    const contentSelectors = [
      '.article__content',
      '.post-content',
      '.entry-content',
      'article',
      '.content',
      'main',
      '.main-content',
      '#content'
    ];

    let contentElement = null;
    for (const selector of contentSelectors) {
      contentElement = document.querySelector(selector);
      if (contentElement) break;
    }

    if (!contentElement) {
      return {
        success: false,
        message: 'No content found on this page',
        debugInfo
      };
    }

    // Extract paragraphs, headings, and lists
    const paragraphs = [];
    const contentTags = contentElement.querySelectorAll('p, ul, ol, h2, h3, h4, h5, h6');

    if (contentTags.length === 0) {
      return {
        success: false,
        message: 'No content tags found in content container',
        debugInfo
      };
    }

    contentTags.forEach(tag => {
      const tagName = tag.tagName.toLowerCase();

      if (tagName === 'ul' || tagName === 'ol') {
        const items = [];
        tag.querySelectorAll('li').forEach(li => {
          const itemText = li.textContent.trim();
          if (itemText) {
            items.push(itemText);
          }
        });

        if (items.length > 0) {
          paragraphs.push({
            type: 'list',
            items: items
          });
        }
      }
      else if (tagName.match(/^h[2-6]$/)) {
        const text = tag.textContent.trim();
        if (text) {
          paragraphs.push({
            type: 'heading',
            level: parseInt(tagName.charAt(1)),
            text: text
          });
        }
      }
      else if (tagName === 'p') {
        const text = tag.textContent.trim();
        if (text) {
          paragraphs.push({
            type: 'paragraph',
            text: text
          });
        }
      }
    });

    // Create the JSON data
    const data = {
      title: title,
      meta_info: metaInfo,
      content: paragraphs,
      url: window.location.href
    };

    return {
      success: true,
      data: data,
      debugInfo
    };
  } catch (error) {
    console.error('Scraping error:', error);
    return {
      success: false,
      message: 'Exception: ' + error.message,
      debugInfo: {
        error: error.toString(),
        stack: error.stack
      }
    };
  }
}