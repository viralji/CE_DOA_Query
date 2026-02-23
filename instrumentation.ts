export async function register() {
  // Only run on Node.js runtime (not Edge), and not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getVectorStore } = await import('./lib/vectorstore');
    try {
      console.log('[Startup] Pre-warming vector store...');
      await getVectorStore();
      console.log('[Startup] Vector store ready.');
    } catch (error) {
      console.error('[Startup] Failed to pre-warm vector store:', error);
      // Non-fatal: the first request will try again
    }
  }
}
