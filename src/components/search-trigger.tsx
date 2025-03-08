"use client";

import { useButton } from "@react-aria/button";
import { useEffect, useRef, useState } from "react";
import { SearchDialog } from "./search-dialog";
import { Search } from "lucide-react";
import { OverlayProvider } from "@react-aria/overlays";
import { RSSFeed } from "../types";
import { useRouter_UNSTABLE } from "waku";

export function SearchTrigger({ feeds }: { feeds: RSSFeed[] }) {
  const router = useRouter_UNSTABLE();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    {
      onPress: () => setIsOpen(true),
    },
    buttonRef
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(router.query);
    const search = params.get("q");
    if (!search) return;

    const input = document.querySelector("[cmdk-input]") as HTMLInputElement;
    if (input) {
      input.value = search;
      input.dispatchEvent(new Event("q"));
    }
    setIsOpen(true);
  }, [router.query]);

  return (
    <>
      <button
        {...buttonProps}
        ref={buttonRef}
        className="quest-input flex items-center gap-2 cursor-text"
      >
        <Search className="w-5 h-5 opacity-50" />
        <span className="opacity-50">Press ⌘K to search feeds...</span>
      </button>
      {isOpen && (
        <OverlayProvider>
          <SearchDialog
            isOpen={isOpen}
            defaultValue={new URLSearchParams(router.query).get("q") ?? ""}
            onClose={() => setIsOpen(false)}
            feeds={feeds}
          />
        </OverlayProvider>
      )}
    </>
  );
}
