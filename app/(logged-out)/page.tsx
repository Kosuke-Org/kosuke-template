import Image from 'next/image';

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Image
        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
        alt="Pikachu"
        width={400}
        height={400}
        priority
        className="drop-shadow-2xl"
      />
      <p className="mt-6 text-2xl font-bold text-foreground">Pikachu!</p>
    </div>
  );
}
