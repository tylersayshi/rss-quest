"use client";

import { useOverlay, useModal, usePreventScroll } from "@react-aria/overlays";
import { FocusScope } from "@react-aria/focus";
import { RSSFeed } from "../types";
import { useEffect, useRef } from "react";
import { Command } from "cmdk";

export function SearchDialog({
  isOpen,
  onClose,
  defaultValue,
  feeds,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultValue: string;
  feeds: RSSFeed[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { overlayProps } = useOverlay(
    { isOpen, onClose, isDismissable: true },
    ref
  );
  const { modalProps } = useModal();
  usePreventScroll();

  useEffect(() => {
    if (defaultValue) {
      const input = document.querySelector("[cmdk-input]") as HTMLInputElement;
      if (input) {
        setTimeout(() => {
          input.value = defaultValue;
          input.focus();
        }, 1);
      }
    }
  }, [defaultValue]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onClose]);

  return (
    <FocusScope contain restoreFocus autoFocus>
      <div
        {...overlayProps}
        {...modalProps}
        ref={ref}
        className="fixed top-[20%] left-1/2 transform -translate-x-1/2 p-4 z-50"
      >
        <Command>
          <Command.Input placeholder="Search articles..." autoFocus />
          <Command.List>
            <Command.Empty>No articles found</Command.Empty>
            {feeds.flatMap((feed) =>
              feed.items.map((item, index) => (
                <Command.Item
                  key={`${feed.title}-${index}`}
                  onSelect={() => {
                    window.open(item.link, "_blank");
                    onClose();
                  }}
                >
                  <a className="font-medium" href={item.link} target="_blank">
                    {item.title}
                  </a>
                  <div className="text-sm opacity-70">{feed.title}</div>
                </Command.Item>
              ))
            )}
          </Command.List>
        </Command>
      </div>
    </FocusScope>
  );
}
