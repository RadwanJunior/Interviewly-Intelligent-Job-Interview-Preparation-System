/**
 * types.ts - Shared TypeScript types for the frontend application
 * Defines the AppProps interface for Next.js custom App component props.
 */

/**
 * Props for the custom App component in Next.js.
 * @property Component - The active page component to render.
 * @property pageProps - Props to initialize the page component.
 */
export interface AppProps {
  Component: React.ComponentType<Record<string, unknown>>;
  pageProps: Record<string, unknown>;
}