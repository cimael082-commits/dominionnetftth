import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const EQUIPAMENTOS_PADRAO = ["Roteador", "ONU", "TV Box"] as const;

export function EquipamentosPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (item: string, checked: boolean) => {
    const set = new Set(value ?? []);
    if (checked) set.add(item);
    else set.delete(item);
    onChange(Array.from(set));
  };

  return (
    <div className="flex flex-wrap gap-4 rounded-md border border-border bg-muted/30 p-3">
      {EQUIPAMENTOS_PADRAO.map((item) => {
        const id = `equip-${item}`;
        return (
          <div key={item} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={(value ?? []).includes(item)}
              onCheckedChange={(c) => toggle(item, c === true)}
            />
            <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
              {item}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
