export const protectFavicon = () => {
  // Prevent favicon from being changed
  const originalFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  
  if (originalFavicon) {
    // Store original href
    const originalHref = originalFavicon.href;
    
    // Watch for changes and revert them
    const observer = new MutationObserver(() => {
      const currentFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (currentFavicon && currentFavicon.href !== originalHref) {
        currentFavicon.href = originalHref;
      }
    });
    
    observer.observe(document.head, {
      attributes: true,
      attributeFilter: ['href'],
      subtree: true,
    });
    
    // Also protect against Ctrl+U/inspect changes
    setInterval(() => {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon && favicon.href !== originalHref) {
        favicon.href = originalHref;
      }
    }, 1000);
  }
};