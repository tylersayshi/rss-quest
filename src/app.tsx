import { Search } from "./components/search";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Footer } from "./components/footer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

export default function App() {
  return (
    <div className="h-screen relative flex flex-col">
      <main className="flex-1 min-h-0">
        <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col items-center p-4 pt-8">
          <div className="w-full max-w-4xl overflow-y-hidden flex flex-col px-0.5">
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister, maxAge: 1000 * 60 * 60 }}
            >
              <Search />
            </PersistQueryClientProvider>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
