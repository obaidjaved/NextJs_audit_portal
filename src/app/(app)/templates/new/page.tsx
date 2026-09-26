import { TemplateBuilder } from "@/components/template-builder/TemplateBuilder";

export default function NewTemplatePage() {
  return (
    <div>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        New Template
      </h1>
      {/* key ensures a fresh instance if navigating here directly from an
          edit page — see the matching comment in templates/[id]/edit. */}
      <TemplateBuilder key="new" />
    </div>
  );
}
