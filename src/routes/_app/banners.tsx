import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/banners")({
  head: () => ({
    meta: [
      { title: "Banners e Campanhas — Dominion Net" },
      {
        name: "description",
        content: "Cadastre banners e campanhas exibidos na home da Área do Cliente.",
      },
      { property: "og:title", content: "Banners e Campanhas — Dominion Net" },
      {
        property: "og:description",
        content: "Gerencie as campanhas promocionais exibidas para os assinantes.",
      },
    ],
  }),
  component: BannersPage,
});

function BannersPage() {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [botaoTexto, setBotaoTexto] = useState("");
  const [botaoUrl, setBotaoUrl] = useState("");
  const [ordem, setOrdem] = useState("0");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  const q = useQuery({
    queryKey: ["banners-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function criar() {
    if (titulo.trim().length < 3) {
      toast.error("Informe um título.");
      return;
    }
    setSalvando(true);
    try {
      let imagemPath: string | null = null;
      if (arquivo) {
        const ext = arquivo.name.split(".").pop() || "jpg";
        const path = `campanhas/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("banners")
          .upload(path, arquivo, { contentType: arquivo.type });
        if (upErr) throw upErr;
        imagemPath = path;
      }
      const { error } = await supabase.from("banners").insert({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        imagem_url: imagemPath,
        botao_texto: botaoTexto.trim() || null,
        botao_url: botaoUrl.trim() || null,
        ordem: Number(ordem) || 0,
        ativo: true,
      });
      if (error) throw error;
      toast.success("Banner criado!");
      setTitulo("");
      setDescricao("");
      setBotaoTexto("");
      setBotaoUrl("");
      setArquivo(null);
      qc.invalidateQueries({ queryKey: ["banners-admin"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("banners").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners-admin"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Banner excluído");
      qc.invalidateQueries({ queryKey: ["banners-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Banners e Campanhas</h1>
        <p className="text-muted-foreground mt-1">
          Conteúdo exibido no topo da Área do Cliente (app e web).
        </p>
      </header>

      <Card>
        <CardContent className="p-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Promoção 300MB" />
          </div>
          <div className="space-y-1.5">
            <Label>Ordem de exibição</Label>
            <Input value={ordem} onChange={(e) => setOrdem(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Texto do botão</Label>
            <Input value={botaoTexto} onChange={(e) => setBotaoTexto(e.target.value)} placeholder="Quero contratar" />
          </div>
          <div className="space-y-1.5">
            <Label>Link do botão</Label>
            <Input value={botaoUrl} onChange={(e) => setBotaoUrl(e.target.value)} placeholder="https://wa.me/..." />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" /> Imagem do banner
            </Label>
            <Input type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={criar} disabled={salvando}>
              <Plus className="h-4 w-4 mr-1" /> {salvando ? "Salvando..." : "Criar banner"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {(q.data ?? []).map((b) => (
          <Card key={b.id}>
            <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <div className="truncate font-semibold">{b.titulo}</div>
                <div className="truncate text-xs text-muted-foreground">{b.descricao || "—"}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Ordem {b.ordem} • {b.botao_url || "sem link"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Switch
                  checked={b.ativo}
                  onCheckedChange={(v) => toggleAtivo.mutate({ id: b.id, ativo: v })}
                  aria-label="Ativar banner"
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O banner “{b.titulo}” será removido da Área do Cliente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => excluir.mutate(b.id)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {q.data?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum banner cadastrado.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
