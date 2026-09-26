import {
  CheckCircle2,
  ListChecks,
  SquareCheck,
  Image as ImageIcon,
  Pencil,
  PenTool,
  SlidersHorizontal,
  Hash,
  Calendar,
  MapPin,
  Type,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { FieldType } from "@/lib/field-types";

const ICONS: Record<FieldType, LucideIcon> = {
  status: CheckCircle2,
  choice: ListChecks,
  checkbox: SquareCheck,
  photo: ImageIcon,
  annotation: Pencil,
  signature: PenTool,
  slider: SlidersHorizontal,
  number: Hash,
  date: Calendar,
  location: MapPin,
  text: Type,
  instruction: Info,
};

export function FieldTypeIcon({ type, colorToken }: { type: FieldType; colorToken: string }) {
  const Icon = ICONS[type];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: `color-mix(in srgb, var(${colorToken}) 16%, transparent)`,
        color: `var(${colorToken})`,
        flex: "none",
      }}
    >
      <Icon size={16} strokeWidth={2.25} />
    </span>
  );
}
