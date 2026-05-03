import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 text-white p-8">
          Loading dashboard...
        </main>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
