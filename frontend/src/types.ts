import { ReactNode } from "react";

export interface AppProps {
  Component: React.ComponentType<any>;
  pageProps: any;
}