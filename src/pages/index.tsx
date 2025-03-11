import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Searcher } from "../components/search";
import { Providers } from "../components/providers";

export const client = new QueryClient();

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-4xl">
        <Providers>
          <Searcher />
        </Providers>
      </div>
    </div>
  );
}

export const getConfig = async () => {
  return {
    render: "static",
  };
};
