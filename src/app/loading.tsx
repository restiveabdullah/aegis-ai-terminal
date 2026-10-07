export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="text-sm font-semibold text-slate-900">Aegis Risk Core</div>
      <div className="h-1 w-52 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/3 animate-[bootbar_1.1s_ease-in-out_infinite] rounded-full bg-indigo-600" />
      </div>
      <div className="text-xs text-slate-500">
        Establishing Bitget uplink · loading collateral matrix…
      </div>
      <style>{`@keyframes bootbar { 0% { transform: translateX(-100%);} 100% { transform: translateX(300%);} }`}</style>
    </div>
  );
}
