import { FlaskConical } from "lucide-react";

interface Props {
  title: string;
  description: string;
  requirement?: string;
}

export function PreviewBanner({ title, description, requirement }: Props) {
  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-start gap-3">
      <FlaskConical className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
            Preview
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
        {requirement && (
          <p className="text-xs text-muted-foreground mt-2 opacity-75">{requirement}</p>
        )}
      </div>
    </div>
  );
}
