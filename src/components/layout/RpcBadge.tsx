import { useState, useRef, useEffect } from "react";
import { nearUtils } from "../../utils/nearUtils";

const RpcBadge = () => {
  const [open, setOpen] = useState(false);
  const [activeUrl, setActiveUrl] = useState(nearUtils.RPC_URL);
  const [customRpcs, setCustomRpcs] = useState(() => nearUtils.loadCustomRpcs());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (url: string) => {
    nearUtils.setRpcUrl(url);
    setActiveUrl(url);
    setOpen(false);
  };

  const openAddModal = () => {
    setOpen(false);
    setNewName("");
    setNewUrl("");
    setUrlError("");
    setShowAddModal(true);
  };

  const saveCustomRpc = () => {
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name || !url) return;
    try {
      new URL(url);
    } catch {
      setUrlError("Invalid URL");
      return;
    }
    nearUtils.addCustomRpc(name, url);
    const updated = nearUtils.loadCustomRpcs();
    setCustomRpcs(updated);
    nearUtils.setRpcUrl(url);
    setActiveUrl(url);
    setShowAddModal(false);
  };

  const allOptions = [...nearUtils.PREDEFINED_RPC_OPTIONS, ...customRpcs];

  return (
    <>
      <div ref={dropdownRef} className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-1">
        {open && (
          <div className="mb-1 w-52 bg-black/80 border border-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
            {allOptions.map((opt) => {
              const active = activeUrl === opt.url;
              const isCustom = customRpcs.some((r) => r.url === opt.url);
              return (
                <div
                  key={opt.url}
                  className={`flex items-center hover:bg-white/10 transition ${active ? "text-white" : "text-gray-400"}`}
                >
                  <button
                    onClick={() => select(opt.url)}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-green-500" : "bg-gray-600"}`} />
                    <div>
                      <p className="text-xs font-medium">{opt.name}</p>
                      <p className="text-[10px] text-gray-500">{new URL(opt.url).hostname}</p>
                    </div>
                  </button>
                  {isCustom && (
                    <button
                      onClick={() => {
                        nearUtils.removeCustomRpc(opt.url);
                        const updated = nearUtils.loadCustomRpcs();
                        setCustomRpcs(updated);
                        if (activeUrl === opt.url) {
                          nearUtils.setRpcUrl(nearUtils.PREDEFINED_RPC_OPTIONS[0].url);
                          setActiveUrl(nearUtils.PREDEFINED_RPC_OPTIONS[0].url);
                        }
                      }}
                      className="px-2.5 py-2.5 text-gray-500 hover:text-red-400 transition text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            <div className="border-t border-white/10">
              <button
                onClick={openAddModal}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/10 transition text-left text-gray-400 hover:text-gray-200"
              >
                <span className="text-base leading-none">+</span>
                <p className="text-xs">Add RPC</p>
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm text-[10px] text-gray-500 hover:text-gray-300 hover:border-white/20 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500/80 shrink-0" />
          <span>{new URL(activeUrl).hostname}</span>
        </button>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <form
            onSubmit={(e) => { e.preventDefault(); saveCustomRpc(); }}
            className="w-80 bg-[#0C0C0C] border border-white/10 rounded-xl p-6 flex flex-col gap-4"
          >
            <h3 className="text-base font-semibold">Add Custom RPC</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Name</label>
              <input
                type="text"
                placeholder="my-rpc"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-input-background rounded-sm px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-white/30 transition"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">URL</label>
              <input
                type="text"
                placeholder="https://rpc.example.com"
                value={newUrl}
                onChange={(e) => { setNewUrl(e.target.value); setUrlError(""); }}
                className={`bg-input-background rounded-sm px-3 py-2 text-sm text-white outline-none border transition ${urlError ? "border-red-500/60" : "border-white/10 focus:border-white/30"}`}
              />
              {urlError && <p className="text-[10px] text-red-400">{urlError}</p>}
            </div>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded-sm text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim() || !newUrl.trim()}
                className="flex-1 py-2 rounded-sm text-sm font-medium bg-[linear-gradient(139deg,#3DA9EA,#47FF93)] text-black disabled:opacity-40 transition"
              >
                Save & Use
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default RpcBadge;
