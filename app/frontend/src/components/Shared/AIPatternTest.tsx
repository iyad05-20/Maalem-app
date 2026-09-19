export const AIPatternTest = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-8">
      {/* Pattern Container */}
      <div 
        className="relative overflow-hidden rounded-[32px] shadow-2xl"
        style={{
          width: '340px',
          height: '220px',
          backgroundColor: '#FAFAF8',
        }}
      >
        {/* Base Pattern (ai-pattern.jpg) */}
        <div 
          className="absolute inset-0 opacity-40 mix-blend-multiply"
          style={{
            backgroundImage: 'url(/ai-pattern.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-moroccan-charcoal/30 to-transparent" />

        {/* Decoration / Brillance (diamond-icon.png) in top left */}
        <div className="absolute top-4 left-4 flex items-center justify-center">
          <img 
            src="/diamond-icon.png" 
            alt="Decoration" 
            className="w-10 h-10 opacity-90 drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]"
            style={{ filter: 'brightness(1.5) contrast(1.2)' }}
          />
        </div>
        
        {/* Some text to see how it looks as a card */}
        <div className="absolute bottom-6 left-6 right-6">
          <span className="text-[10px] font-bold text-moroccan-clay uppercase tracking-widest bg-white/80 backdrop-blur-md px-2 py-1 rounded">Atelier IA</span>
          <h3 className="text-xl font-serif text-moroccan-charcoal mt-2 font-semibold">Génération de Primitives</h3>
        </div>
      </div>
    </div>
  );
};
