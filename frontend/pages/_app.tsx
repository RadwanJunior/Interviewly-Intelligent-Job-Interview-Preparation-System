
import type { AppProps } from 'next/app';
import App from '@/src/pages/_app';

export default function MyApp(props: AppProps) {
  return <App {...props} />;
}
