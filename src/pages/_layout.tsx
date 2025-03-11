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
        <main>{children}</main>
        <Footer />
      </body>
    </>
  );
}

export const getConfig = async () => {
  return {
    render: "static",
  } as const;
};
