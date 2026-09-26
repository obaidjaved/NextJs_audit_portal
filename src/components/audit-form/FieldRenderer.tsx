"use client";

import type { TemplateField } from "@/lib/field-types";
import type { ResponseObject } from "@/lib/scoring";
import { StatusField } from "./fields/StatusField";
import { ChoiceField } from "./fields/ChoiceField";
import { CheckboxField } from "./fields/CheckboxField";
import { PhotoField } from "./fields/PhotoField";
import { AnnotationField } from "./fields/AnnotationField";
import { SignatureField } from "./fields/SignatureField";
import { SliderField } from "./fields/SliderField";
import { NumberField } from "./fields/NumberField";
import { DateField } from "./fields/DateField";
import { LocationField } from "./fields/LocationField";
import { TextField } from "./fields/TextField";
import { InstructionBlock } from "./fields/InstructionBlock";

export function FieldRenderer({
  field,
  response,
  onChange,
  disabled,
}: {
  field: TemplateField;
  response: ResponseObject | null;
  onChange: (response: ResponseObject) => void;
  disabled?: boolean;
}) {
  if (field.type === "instruction") {
    return <InstructionBlock text={field.label} />;
  }

  switch (field.type) {
    case "status":
      return (
        <StatusField
          value={response?.type === "status" ? response.value : null}
          disabled={disabled}
          onChange={(value) => onChange({ label: field.label, type: "status", value })}
        />
      );
    case "choice":
      return (
        <ChoiceField
          options={field.options ?? []}
          value={response?.type === "choice" ? response.option : null}
          disabled={disabled}
          onChange={(option) => onChange({ label: field.label, type: "choice", option })}
        />
      );
    case "checkbox":
      return (
        <CheckboxField
          label={field.label}
          value={response?.type === "checkbox" ? response.value : false}
          disabled={disabled}
          onChange={(value) => onChange({ label: field.label, type: "checkbox", value })}
        />
      );
    case "photo":
      return (
        <PhotoField
          value={response?.type === "photo" ? response.value : null}
          caption={response?.type === "photo" ? response.caption : ""}
          disabled={disabled}
          onChange={(value, caption) => onChange({ label: field.label, type: "photo", value, caption })}
        />
      );
    case "annotation":
      return (
        <AnnotationField
          value={response?.type === "annotation" ? response.value : null}
          caption={response?.type === "annotation" ? response.caption : ""}
          disabled={disabled}
          onChange={(value, caption) => onChange({ label: field.label, type: "annotation", value, caption })}
        />
      );
    case "signature":
      return (
        <SignatureField
          value={response?.type === "signature" ? response.value : null}
          disabled={disabled}
          onChange={(value) => onChange({ label: field.label, type: "signature", value })}
        />
      );
    case "slider":
      return (
        <SliderField
          value={response?.type === "slider" ? response.value : "50"}
          disabled={disabled}
          onChange={(value) => onChange({ label: field.label, type: "slider", value })}
        />
      );
    case "number":
      return (
        <NumberField
          value={response?.type === "number" ? response.value : ""}
          disabled={disabled}
          onChange={(value) => onChange({ label: field.label, type: "number", value })}
        />
      );
    case "date":
      return (
        <DateField
          value={response?.type === "date" ? response.value : ""}
          disabled={disabled}
          onChange={(value) => onChange({ label: field.label, type: "date", value })}
        />
      );
    case "location":
      return (
        <LocationField
          value={response?.type === "location" ? response.value : ""}
          coords={response?.type === "location" ? response.coords : null}
          disabled={disabled}
          onChange={(value, coords) => onChange({ label: field.label, type: "location", value, coords })}
        />
      );
    case "text":
      return (
        <TextField
          value={response?.type === "text" ? response.value : ""}
          disabled={disabled}
          onChange={(value) => onChange({ label: field.label, type: "text", value })}
        />
      );
    default: {
      // Compile-time exhaustiveness check: fails to build if a FieldType is
      // ever added without a matching case above. Malformed/legacy field
      // data at runtime (not expressible in the type) still just renders
      // nothing rather than crashing.
      const _exhaustive: never = field.type;
      void _exhaustive;
      return null;
    }
  }
}
