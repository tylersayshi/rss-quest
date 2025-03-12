import { QueryClient } from "@tanstack/react-query";
import { Searcher } from "../components/search";
import { Providers } from "../components/providers";

export const client = new QueryClient();

export default function Home() {
  return (
    <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-4xl overflow-y-hidden flex flex-col">
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
