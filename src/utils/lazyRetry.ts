import { lazy, ComponentType } from 'react';

/**
 * A wrapper for React.lazy that retries the import if it fails.
 * This is useful for handling "Failed to fetch dynamically imported module" 
 * errors which occur when a new version of the app is deployed and 
 * old chunks are removed from the server.
 */
export const lazyRetry = (
    componentImport: () => Promise<{ default: ComponentType<any> }>,
    name: string
) =>
    lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
        );

        try {
            const component = await componentImport();
            window.localStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                // Log the error for debugging
                console.error(`Error loading chunk for ${name}:`, error);

                // Mark that we've refreshed to avoid infinite loops
                window.localStorage.setItem('page-has-been-force-refreshed', 'true');

                // Force a page refresh to get the latest index.html and assets
                window.location.reload();

                // Throwing a dummy promise that never resolves while the page reloads
                return new Promise(() => { });
            }

            // If we already refreshed and it still fails, bubble the error
            throw error;
        }
    });
