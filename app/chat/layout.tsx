import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // In development, allow bypass
  if (!session) {
    if (isDevelopment) {
      const cookieStore = await cookies();
      const devBypass = cookieStore.get('dev-bypass-auth')?.value === 'true';
      if (!devBypass) {
        redirect("/signin");
      }
    } else {
      redirect("/signin");
    }
  }

  return <>{children}</>;
}
