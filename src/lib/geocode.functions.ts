import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

type GeocodeResult = { lat: number; lng: number; formatted: string } | null;

export const geocodeAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { address: string }) => input)
  .handler(async ({ data }): Promise<GeocodeResult> => {
    const address = data.address?.trim();
    if (!address) return null;

    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmKey) {
      throw new Error("Google Maps não configurado");
    }

    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=br&language=pt-BR`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmKey,
      },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Geocoding falhou (${res.status}): ${txt.slice(0, 120)}`);
    }
    const body = (await res.json()) as {
      status: string;
      results: Array<{
        geometry: { location: { lat: number; lng: number } };
        formatted_address: string;
      }>;
    };
    if (body.status !== "OK" || !body.results?.length) return null;
    const first = body.results[0];
    return {
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
      formatted: first.formatted_address,
    };
  });
