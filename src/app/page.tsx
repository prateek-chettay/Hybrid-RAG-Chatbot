import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="flex min-h-screen bg-slate-950 items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh] ">
        <ChatInterface />
      </div>
    </main>
  );
}
