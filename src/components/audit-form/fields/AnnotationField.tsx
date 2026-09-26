"use client";

import { PhotoField } from "./PhotoField";

// Same response shape and upload flow as PhotoField — kept as a distinct
// component so the annotation-specific UI (e.g. on-image markup) can be
// added later without touching PhotoField's contract.
export function AnnotationField(props: {
  value: string | null;
  caption: string;
  onChange: (value: string | null, caption: string) => void;
  disabled?: boolean;
}) {
  return <PhotoField {...props} />;
}
