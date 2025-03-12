import "../styles.css";

import type { ReactNode } from "react";

import { Footer } from "../components/footer";
import { Meta } from "../components/meta";

type RootLayoutProps = { children: ReactNode };

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <Meta />
      <body>
        <div className="h-screen relative flex flex-col">
          <main className="flex-1 min-h-0">{children}</main>
          <Footer />
        </div>
      </body>
    </>
  );
}

export const getConfig = async () => {
  return {
    render: "static",
  } as const;
};
