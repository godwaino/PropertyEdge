export default function Header({ onReset }: { onReset?: () => void }) {
  return (
    <header className="pt-8 pb-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        {onReset ? (
          <button onClick={onReset} className="hover:opacity-80 transition-opacity">
            <span className="text-cyan">Property</span>
            <span className="text-white"> Edge</span>
          </button>
        ) : (
          <>
            <span className="text-cyan">Property</span>
            <span className="text-white"> Edge</span>
          </>
        )}
      </h1>
      <p className="text-gray-400 mt-2 text-sm">
        AI-powered UK property analysis &mdash; know before you buy
      </p>
    </header>
  );
}
