import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clienteFetch } from "@/lib/cliente-auth";
import { cn } from "@/lib/utils";

export interface Banner {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  link_url: string | null;
  texto_botao: string | null;
}

/** Carrossel de campanhas/banners configurados pelo administrador. */
export function BannerCarousel({ className }: { className?: string }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    clienteFetch<{ banners: Banner[] }>("/api/public/cliente/banners")
      .then((r) => setBanners(r.banners ?? []))
      .catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const b = banners[Math.min(idx, banners.length - 1)];
  if (!b) return null;

  const Wrapper = b.link_url ? "a" : "div";

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border/60", className)}>
      <Wrapper
        {...(b.link_url
          ? { href: b.link_url, target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className="block"
      >
        {b.imagem_url ? (
          <img
            src={b.imagem_url}
            alt={b.titulo}
            loading="lazy"
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="h-40 w-full bg-gradient-to-br from-primary/30 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="text-base font-bold">{b.titulo}</div>
          {b.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2">{b.descricao}</p>
          )}
          {b.link_url && (
            <span className="mt-2 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {b.texto_botao || "Saiba mais"}
            </span>
          )}
        </div>
      </Wrapper>

      {banners.length > 1 && (
        <>
          <button
            aria-label="Banner anterior"
            onClick={() => setIdx((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-1 text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Próximo banner"
            onClick={() => setIdx((i) => (i + 1) % banners.length)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-1 text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1.5 right-2 flex gap-1">
            {banners.map((item, i) => (
              <span
                key={item.id}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i === idx ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
