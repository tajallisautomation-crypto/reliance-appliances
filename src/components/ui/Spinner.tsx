export default function Spinner({ full = true }: { full?: boolean }) {
  if (!full) return <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />;
  return (
    <div className="min-h-64 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-3 border-gray-200 border-t-brand-500 animate-spin" />
    </div>
  );
}
