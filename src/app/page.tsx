import { redirect } from "next/navigation";

export default function RootRedirect(): void {
  redirect("/de");
}
