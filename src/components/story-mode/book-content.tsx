"use client";
import { BookOpen, ImageOff, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "radix-ui";
export type BookContentProps = {
  decorative?: boolean;
  scrollTop?: number;
  title: string;
  text: string;
  page: number;
  count: number;
  imageUrl: string | null;
  imageLoading: boolean;
  imageError: boolean;
  onImageError: () => void;
  onRetry: () => void;
  onExpand: (kind: "image" | "text", trigger: HTMLElement) => void;
};
export function Illustration({
  imageUrl,
  imageLoading,
  imageError,
  onImageError,
  onRetry,
  page,
  title,
}: BookContentProps) {
  if (imageError)
    return (
      <div className="story-illustration-placeholder">
        <ImageOff aria-hidden="true" />
        <p>We could not load the illustration.</p>
        <Button variant="outline" onClick={onRetry}>
          Retry image
        </Button>
      </div>
    );
  if (imageUrl) {
    // Private, short-lived blob URL; Next's public image optimizer must not fetch it.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="story-illustration"
        src={imageUrl}
        alt={`Illustration of ${title}, page ${page + 1}`}
        onError={onImageError}
      />
    );
  }
  return (
    <div className="story-illustration-placeholder">
      <div className="story-paper-motif" aria-hidden="true">
        <BookOpen />
        <span />
        <span />
      </div>
      <p>
        {imageLoading
          ? "Preparing the illustration\u2026"
          : "A memory within these pages"}
      </p>
    </div>
  );
}
export function ImagePage(props: BookContentProps) {
  return (
    <section
      className="story-leaf story-leaf-image"
      aria-label={`Illustration, page ${props.page + 1}`}
    >
      <span className="story-page-caption">LivingMemories · Family album</span>
      <div className="story-picture-frame">
        <Illustration {...props} />
      </div>
      {!props.decorative && props.imageUrl && !props.imageError ? (
        <Dialog.Trigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => props.onExpand("image", e.currentTarget)}
          >
            <Maximize2 data-icon="inline-start" />
            Enlarge image
          </Button>
        </Dialog.Trigger>
      ) : null}
    </section>
  );
}
export function TextPage(props: BookContentProps) {
  return (
    <section
      className="story-leaf story-leaf-text"
      aria-label={`Text, page ${props.page + 1}`}
    >
      <span className="story-page-caption">{props.title}</span>
      <div
        className="story-page-text"
        tabIndex={props.decorative ? -1 : 0}
        key={props.page}
        ref={(element) => {
          if (element && props.scrollTop !== undefined)
            element.scrollTop = props.scrollTop;
        }}
      >
        {props.text}
      </div>
      <div className="story-leaf-footer">
        <span>
          {props.page + 1} / {props.count}
        </span>
        {!props.decorative ? (
          <Dialog.Trigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => props.onExpand("text", e.currentTarget)}
            >
              <Maximize2 data-icon="inline-start" />
              Enlarge text
            </Button>
          </Dialog.Trigger>
        ) : (
          <span className="story-turn-footer-space" />
        )}
      </div>
    </section>
  );
}
