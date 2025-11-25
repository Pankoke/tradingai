import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk initialisieren; aktuell alle Routen öffentlich (nur Session-Setup)
export default clerkMiddleware((auth) => {
  void auth();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
