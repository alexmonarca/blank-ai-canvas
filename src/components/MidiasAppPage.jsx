import React, { useEffect, useMemo, useState } from "react";
import {
  Palette,
  CreditCard,
  History as HistoryIcon,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Monitor,
  Smartphone,
  Layers,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const N8N_WEBHOOK_URL = "https://webhook.monarcahub.com/webhook/midias";
const STORAGE_BUCKET = "brand-assets";

function formatError(e) {
  if (!e) return "Erro desconhecido.";
  if (typeof e === "string") return e;
  return e?.message || "Erro desconhecido.";
}

async function fileToArrayBuffer(file) {
  return await file.arrayBuffer();
}

function safeJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
}

export default function MidiasAppPage({ supabaseClient, userId, onBack, hasMediaUpgrade = false }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [credits, setCredits] = useState(0);
  const [history, setHistory] = useState([]);

  const [prompt, setPrompt] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("quadrado");
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);

  const [activeTab, setActiveTab] = useState("gerar");

  const [brandData, setBrandData] = useState({
    colors: ["#EA580C"],
    logo_url: "",
    reference_images: [], // URLs
    tone_of_voice: "Profissional",
    personality: "",
  });
  const [newColor, setNewColor] = useState("#EA580C");
  const [saveStatus, setSaveStatus] = useState(null); // saving|saved|error

  const canUse = Boolean(hasMediaUpgrade);

  const formats = useMemo(
    () => [
      { id: "quadrado", label: "Quadrado", icon: Monitor },
      { id: "story", label: "Story", icon: Smartphone },
      { id: "carrossel", label: "Carrossel", icon: Layers },
    ],
    [],
  );

  const loadAll = async () => {
    if (!supabaseClient || !userId) return;
    setLoading(true);
    setErrorMsg("");

    try {
      // credits
      const { data: pData, error: pErr } = await supabaseClient
        .from("profiles")
        .select("credits_balance")
        .eq("id", userId)
        .maybeSingle();
      if (pErr) throw pErr;
      setCredits(pData?.credits_balance ?? 0);

      // brand
      const { data: bData, error: bErr } = await supabaseClient
        .from("brand_settings")
        .select("id,logo_url,colors,reference_images,personality,tone_of_voice")
        .eq("id", userId)
        .maybeSingle();
      if (bErr) throw bErr;
      if (bData) {
        setBrandData({
          colors: Array.isArray(bData.colors) ? bData.colors : ["#EA580C"],
          logo_url: bData.logo_url || "",
          reference_images: safeJsonArray(bData.reference_images),
          personality: bData.personality || "",
          tone_of_voice: bData.tone_of_voice || "Profissional",
        });
      }

      // history
      const { data: hData, error: hErr } = await supabaseClient
        .from("credit_transactions")
        .select("id,amount,description,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (hErr) throw hErr;
      setHistory(hData || []);
    } catch (e) {
      setErrorMsg(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseClient, userId]);

  const uploadToStorage = async (file, kind) => {
    if (!supabaseClient || !userId) throw new Error("Sem sessão.");

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `midias/${userId}/${kind}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(path, await fileToArrayBuffer(file), {
        contentType: file.type,
        upsert: true,
      });

    if (upErr) throw upErr;

    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error("Não foi possível obter URL pública do arquivo.");

    return publicUrl;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 1_500_000) {
      alert("Imagem superior a 1.5MB.");
      return;
    }

    try {
      setSaveStatus("saving");
      const url = await uploadToStorage(file, "logo");
      setBrandData((prev) => ({ ...prev, logo_url: url }));
      setSaveStatus("saved");
    } catch (e2) {
      setSaveStatus("error");
      setErrorMsg(formatError(e2));
    }
  };

  const handleReferenceUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 1_500_000) {
      alert("Imagem superior a 1.5MB.");
      return;
    }
    if (brandData.reference_images.length >= 3) {
      alert("Limite de 3 imagens de referência atingido.");
      return;
    }

    try {
      setSaveStatus("saving");
      const url = await uploadToStorage(file, `ref-${brandData.reference_images.length + 1}`);
      setBrandData((prev) => ({ ...prev, reference_images: [...prev.reference_images, url] }));
      setSaveStatus("saved");
    } catch (e2) {
      setSaveStatus("error");
      setErrorMsg(formatError(e2));
    }
  };

  const removeReference = (idx) => {
    setBrandData((prev) => ({
      ...prev,
      reference_images: prev.reference_images.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveBrand = async () => {
    if (!supabaseClient || !userId) return;

    setSaveStatus("saving");
    setErrorMsg("");
    try {
      const payload = {
        id: userId,
        logo_url: brandData.logo_url || null,
        colors: Array.isArray(brandData.colors) ? brandData.colors : ["#EA580C"],
        reference_images: safeJsonArray(brandData.reference_images),
        personality: brandData.personality || null,
        tone_of_voice: brandData.tone_of_voice || null,
      };

      const { error } = await supabaseClient.from("brand_settings").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("error");
      setErrorMsg(formatError(e));
    }
  };

  const handleAddColor = () => {
    const c = String(newColor || "").trim();
    if (!c) return;
    setBrandData((prev) => {
      const next = [...(prev.colors || []), c].slice(0, 6);
      return { ...prev, colors: next };
    });
  };

  const handleRemoveColor = (idx) => {
    setBrandData((prev) => ({
      ...prev,
      colors: (prev.colors || []).filter((_, i) => i !== idx),
    }));
  };

  const handleGenerate = async () => {
    if (!supabaseClient || !userId) {
      setErrorMsg("Você precisa estar logado.");
      return;
    }
    if (!prompt.trim()) return;
    if (!canUse) return;

    if (credits <= 0) {
      setErrorMsg("Sem créditos disponíveis.");
      return;
    }

    setGenerating(true);
    setErrorMsg("");
    setGeneratedResult(null);

    try {
      // 1) chama webhook
      const resp = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          prompt: prompt.trim(),
          format: selectedFormat,
          brand: {
            ...brandData,
            reference_images: safeJsonArray(brandData.reference_images),
          },
        }),
      });

      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(json?.error || `Webhook retornou ${resp.status}`);
      }

      if (!json?.image && !json?.caption) {
        throw new Error("Resposta do webhook inválida. Esperado { image, caption }.");
      }

      setGeneratedResult({ image: json.image || "", caption: json.caption || "" });

      // 2) consome crédito via RPC
      const { error: rpcErr } = await supabaseClient.rpc("consume_credits", {
        user_id_param: userId,
        amount_to_consume: 1,
        desc_param: `Geração de mídia (${selectedFormat})`,
      });
      if (rpcErr) throw rpcErr;

      await loadAll();
    } catch (e) {
      setErrorMsg(formatError(e));
    } finally {
      setGenerating(false);
    }
  };

  if (!hasMediaUpgrade) {
    return (
      <main className="max-w-5xl mx-auto animate-in fade-in">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Míd<span className="font-extrabold text-primary">IA</span>s (App)
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Módulo completo de Gestão de Mídias.</p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
            >
              Voltar
            </button>
          )}
        </header>

        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-foreground">Upgrade necessário</div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Para usar o módulo completo do <strong className="text-foreground">Gestor de Mídias</strong>, ative o upgrade
                no seu plano.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto animate-in fade-in">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Míd<span className="font-extrabold text-primary">IA</span>s (App)
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Gere criativos e legendas com base na sua marca.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-4 h-10">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">Créditos:</span>
            <span className="text-sm font-semibold text-foreground">{credits}</span>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
            >
              Voltar
            </button>
          )}
        </div>
      </header>

      {errorMsg && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive-foreground p-4 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: main */}
        <section className="lg:flex-1 rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 overflow-hidden">
          <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl border border-border bg-background/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">Geração</div>
                <div className="text-xs text-muted-foreground">Prompt + formato → imagem e legenda</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("gerar")}
                className={
                  "h-9 px-4 rounded-full border text-sm transition-colors " +
                  (activeTab === "gerar"
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-background/60")
                }
              >
                Gerar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("marca")}
                className={
                  "h-9 px-4 rounded-full border text-sm transition-colors inline-flex items-center gap-2 " +
                  (activeTab === "marca"
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-background/60")
                }
              >
                <Palette className="w-4 h-4" /> Marca
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("historico")}
                className={
                  "h-9 px-4 rounded-full border text-sm transition-colors inline-flex items-center gap-2 " +
                  (activeTab === "historico"
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-background/60")
                }
              >
                <HistoryIcon className="w-4 h-4" /> Histórico
              </button>
              <button
                type="button"
                onClick={loadAll}
                className="h-9 w-9 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors inline-flex items-center justify-center"
                title="Recarregar"
              >
                <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              </button>
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : !supabaseClient || !userId ? (
              <div className="rounded-2xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                Você precisa estar logado para usar este módulo.
              </div>
            ) : activeTab === "marca" ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" /> Logo e referências
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    As imagens são enviadas para Storage e o banco guarda apenas as URLs.
                  </p>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="text-xs text-muted-foreground">Logo</div>
                      {brandData.logo_url ? (
                        <img
                          src={brandData.logo_url}
                          alt="Logo da marca"
                          className="mt-2 h-24 w-24 object-contain rounded-lg border border-border bg-background"
                          loading="lazy"
                        />
                      ) : (
                        <div className="mt-2 h-24 w-24 rounded-lg border border-border bg-background/40" />
                      )}
                      <label className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-xs cursor-pointer">
                        <Upload className="w-4 h-4" /> Enviar logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>

                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="text-xs text-muted-foreground">Imagens de referência (até 3)</div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {brandData.reference_images.map((url, idx) => (
                          <div key={url + idx} className="relative">
                            <img
                              src={url}
                              alt={`Referência ${idx + 1}`}
                              className="h-20 w-full object-cover rounded-lg border border-border"
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={() => removeReference(idx)}
                              className="absolute -top-2 -right-2 h-7 w-7 rounded-full border border-border bg-card/90 hover:bg-card text-foreground inline-flex items-center justify-center"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {brandData.reference_images.length < 3 && (
                          <label className="h-20 rounded-lg border border-border bg-background/40 hover:bg-background/60 transition-colors cursor-pointer flex items-center justify-center">
                            <Upload className="w-5 h-5 text-primary" />
                            <input type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
                          </label>
                        )}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Dica: use referências do seu feed para manter consistência.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" /> Cores e personalidade
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Paleta (até 6)</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(brandData.colors || []).map((c, idx) => (
                          <button
                            key={c + idx}
                            type="button"
                            onClick={() => handleRemoveColor(idx)}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 h-9 text-xs text-foreground hover:bg-card"
                            title="Remover"
                          >
                            <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: c }} />
                            {c}
                            <Trash2 className="w-3.5 h-3.5 opacity-70" />
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="color"
                          value={newColor}
                          onChange={(e) => setNewColor(e.target.value)}
                          className="h-9 w-12 rounded-lg border border-border bg-background"
                          aria-label="Selecionar cor"
                        />
                        <button
                          type="button"
                          onClick={handleAddColor}
                          className="h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block">
                        <div className="text-xs text-muted-foreground">Tom de voz</div>
                        <input
                          value={brandData.tone_of_voice}
                          onChange={(e) => setBrandData((p) => ({ ...p, tone_of_voice: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Ex.: Profissional, divertido, direto…"
                        />
                      </label>
                      <label className="block">
                        <div className="text-xs text-muted-foreground">Personalidade</div>
                        <textarea
                          value={brandData.personality}
                          onChange={(e) => setBrandData((p) => ({ ...p, personality: e.target.value }))}
                          className="mt-1 w-full min-h-[90px] rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Ex.: minimalista, premium, jovem, inspiradora…"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {saveStatus === "saving"
                        ? "Salvando…"
                        : saveStatus === "saved"
                          ? "Salvo."
                          : saveStatus === "error"
                            ? "Erro ao salvar."
                            : ""}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveBrand}
                      className="h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                    >
                      Salvar Marca
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === "historico" ? (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                    Sem transações ainda.
                  </div>
                ) : (
                  history.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-border bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-foreground">{row.description || "—"}</div>
                        <div className="text-sm font-semibold text-foreground">{row.amount}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Formato</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formats.map((f) => {
                      const Icon = f.icon;
                      const active = selectedFormat === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFormat(f.id)}
                          className={
                            "h-10 px-4 rounded-full border text-sm inline-flex items-center gap-2 transition-colors " +
                            (active
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border bg-background/40 text-muted-foreground hover:bg-background/60")
                          }
                        >
                          <Icon className="w-4 h-4" /> {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Prompt</div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="mt-2 w-full min-h-[120px] rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Ex.: Crie um post sobre promoção de verão, com CTA para WhatsApp..."
                    disabled={!canUse}
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      1 crédito por geração. {brandData.logo_url ? "Logo ok" : "Sem logo"} · {brandData.reference_images.length}/3 refs
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating || !prompt.trim() || !canUse}
                      className="h-10 px-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {generating ? "Gerando…" : "Gerar"}
                    </button>
                  </div>
                </div>

                {generatedResult && (
                  <div className="rounded-2xl border border-border bg-background/40 p-4">
                    <div className="text-sm font-semibold text-foreground">Resultado</div>
                    {generatedResult.image ? (
                      <img
                        src={generatedResult.image}
                        alt="Imagem gerada"
                        className="mt-3 w-full max-h-[520px] object-contain rounded-2xl border border-border"
                        loading="lazy"
                      />
                    ) : null}
                    {generatedResult.caption ? (
                      <div className="mt-3 rounded-2xl border border-border bg-card/60 p-4">
                        <div className="text-xs text-muted-foreground">Legenda</div>
                        <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans">
                          {generatedResult.caption}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right: tips */}
        <aside className="lg:w-[360px] space-y-6">
          <div className="rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-5">
            <div className="text-sm font-semibold text-foreground">Boas práticas</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Envie 1–3 referências do seu feed para manter consistência.</li>
              <li>• Inclua objetivo, oferta, público e CTA no prompt.</li>
              <li>• Salve sua marca antes de gerar para melhor resultado.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-5">
            <div className="text-sm font-semibold text-foreground">Requisito do Storage</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Este módulo usa o bucket <span className="text-foreground font-mono">{STORAGE_BUCKET}</span>. Se o bucket não for
              público, troque para URL assinada (signed URL) no backend.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
