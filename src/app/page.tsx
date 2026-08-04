import { SearchForm } from "@/components/catalog/SearchForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-3xl text-paper">music-platform</h1>
      <p className="font-body text-paper-muted">Catalogá lo que escuchaste. Un Letterboxd para música.</p>
      <SearchForm />
    </main>
  );
}
