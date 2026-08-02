/**
 * Gravação de microfone em PCM (Web Audio) com codificação WAV completa.
 *
 * Motivo de não usar MediaRecorder: fragmentos com timeslice perdem o cabeçalho
 * do container e o Safari grava mp4 fragmentado — ambos são rejeitados pela
 * transcrição. Um WAV completo é decodificável em qualquer navegador.
 */

const TAXA_SAIDA = 16_000;

export type Gravador = {
  parar: () => Promise<Blob>;
  cancelar: () => void;
};

function reamostrar(entrada: Float32Array, taxaOrigem: number, taxaDestino: number): Float32Array {
  if (taxaOrigem === taxaDestino) return entrada;
  const razao = taxaOrigem / taxaDestino;
  const tamanho = Math.floor(entrada.length / razao);
  const saida = new Float32Array(tamanho);
  for (let i = 0; i < tamanho; i += 1) {
    const pos = i * razao;
    const base = Math.floor(pos);
    const prox = Math.min(base + 1, entrada.length - 1);
    const frac = pos - base;
    saida[i] = (entrada[base] ?? 0) * (1 - frac) + (entrada[prox] ?? 0) * frac;
  }
  return saida;
}

function codificarWav(amostras: Float32Array, taxa: number): Blob {
  const buffer = new ArrayBuffer(44 + amostras.length * 2);
  const view = new DataView(buffer);
  const escreverTexto = (offset: number, texto: string) => {
    for (let i = 0; i < texto.length; i += 1) view.setUint8(offset + i, texto.charCodeAt(i));
  };

  escreverTexto(0, "RIFF");
  view.setUint32(4, 36 + amostras.length * 2, true);
  escreverTexto(8, "WAVE");
  escreverTexto(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, taxa, true);
  view.setUint32(28, taxa * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  escreverTexto(36, "data");
  view.setUint32(40, amostras.length * 2, true);

  let offset = 44;
  for (let i = 0; i < amostras.length; i += 1) {
    const s = Math.max(-1, Math.min(1, amostras[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Inicia a captura do microfone. Lança erro quando a permissão é negada. */
export async function iniciarGravacao(): Promise<Gravador> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const pedacos: Float32Array[] = [];

  node.onaudioprocess = (e) => {
    pedacos.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  source.connect(node);
  node.connect(ctx.destination);

  const encerrar = async () => {
    stream.getTracks().forEach((t) => t.stop());
    node.disconnect();
    source.disconnect();
    const taxa = ctx.sampleRate;
    await ctx.close().catch(() => undefined);
    return taxa;
  };

  return {
    parar: async () => {
      const taxa = await encerrar();
      const total = pedacos.reduce((s, p) => s + p.length, 0);
      const junto = new Float32Array(total);
      let pos = 0;
      for (const p of pedacos) {
        junto.set(p, pos);
        pos += p.length;
      }
      return codificarWav(reamostrar(junto, taxa, TAXA_SAIDA), TAXA_SAIDA);
    },
    cancelar: () => {
      void encerrar();
      pedacos.length = 0;
    },
  };
}
