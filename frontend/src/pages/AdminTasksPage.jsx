import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../apiConfig";

export default function AdminTasksPage() {
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [reward, setReward] = useState(2.0);
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(15);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();

  // Simple guard: ensure current user is admin, else redirect
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(buildApiUrl("/api/user/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user || data.user.role !== "admin") {
          navigate("/dashboard");
        }
      })
      .catch(() => navigate("/login"));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage({ type: "error", text: "Session manquante. Connecte-toi." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/admin/tasks"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          video_url: videoUrl,
          reward_cents: Math.round(Number(reward) * 100),
          description,
          duration_seconds: Number(duration),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "Erreur" });
      } else {
        setMessage({ type: "success", text: "Tâche créée avec succès." });
        // Reset basic fields
        setTitle("");
        setVideoUrl("");
        setReward(2.0);
        setDescription("");
        setDuration(15);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur réseau." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <img src="/app-icon.png" alt="Windelevery" className="h-8 w-8 rounded-xl object-cover" />
          <h2 className="text-lg font-semibold">Admin — Ajouter une tâche vidéo</h2>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1">Titre</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs mb-1">URL vidéo (YouTube)</label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Gain (MAD)</label>
              <input
                type="number"
                step="0.01"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Durée min (s)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "..." : "Créer la tâche"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-slate-600"
              onClick={() => navigate(-1)}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
