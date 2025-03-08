import "../styles.css";

import type { ReactNode } from "react";

import { Footer } from "../components/footer";
import { Meta } from "../components/meta";

type RootLayoutProps = { children: ReactNode };

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <Meta />
      <div className="">
        <main className="m-6 flex items-center *:min-h-64 *:min-w-64 lg:m-0 lg:min-h-svh lg:justify-center">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}

export const getConfig = async () => {
  return {
    render: "static",
  } as const;
};
