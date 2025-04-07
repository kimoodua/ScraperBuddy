chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'scrape') {
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

      // Generate filename from title or URL
      let filename = title.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');

      // If filename is empty or too short, use URL path
      if (filename.length < 3) {
        const urlPath = window.location.pathname;
        const pathSegments = urlPath.split('/').filter(seg => seg.length > 0);
        filename = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : 'scraped-content';
      }

      filename = filename + '.json';

      sendResponse({
        success: true,
        data: data,
        filename: filename,
        debugInfo
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.toString(),
        stack: error.stack
      });
    }
    return true;
  }
});