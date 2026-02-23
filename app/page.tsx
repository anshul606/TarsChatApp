import { UserProfileDisplay } from "@/components/user-profile-header";
import { UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <h1 className="text-xl font-semibold">Realtime Messaging App</h1>
          <div className="ml-auto flex items-center gap-4">
            <UserProfileDisplay />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>
      <main className="flex-1 p-4">
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">
            Welcome! The messaging interface will be implemented in the next
            tasks.
          </p>
        </div>
      </main>
    </div>
  );
}
