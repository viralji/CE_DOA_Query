import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || "cloudextel.com";

// Allowed email addresses (whitelist)
// Can be set via ALLOWED_EMAILS env var (comma-separated) or defaults to hardcoded list
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(',').map(email => email.trim().toLowerCase()).filter(email => email.length > 0)
  : [
      'k.trivedi@cloudextel.com',
      's.gite@cloudextel.com',
      'r.gaur@cloudextel.com',
      'p.bala@cloudextel.com',
      's.goenka@cloudextel.com',
      's.karra@cloudextel.com',
      'b.chandak@cloudextel.com',
      'r.vyawahare@cloudextel.com',
      'k.bajaj@cloudextel.com',
      'y.upadhyay@cloudextel.com',
      'r.yadav1@cloudextel.com',
      'v.saraf@cloudextel.com',
      'v.raghuvanshi@cloudextel.com',
      'd.saxena@cloudextel.com',
      'v.shah@cloudextel.com',
    ].map(email => email.toLowerCase());

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      // Domain and email whitelist restriction
      if (account?.provider === "azure-ad" && user?.email) {
        const userEmail = user.email.toLowerCase().trim();
        const emailDomain = userEmail.split("@")[1]?.toLowerCase();
        
        // First check: Domain must be cloudextel.com
        if (emailDomain !== ALLOWED_DOMAIN.toLowerCase()) {
          console.error(`❌ LOGIN DENIED: ${userEmail} - Domain ${emailDomain} not allowed. Only ${ALLOWED_DOMAIN} is permitted.`);
          return false;
        }
        
        // Second check: Email must be in whitelist
        if (!ALLOWED_EMAILS.includes(userEmail)) {
          console.error(`❌ LOGIN DENIED: ${userEmail} - Email not in allowed list. Access restricted to authorized users only.`);
          return false;
        }
        
        console.log(`✅ LOGIN ALLOWED: ${userEmail} - Domain and email whitelist check passed`);
        return true;
      }
      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};
