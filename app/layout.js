import { Catamaran } from "next/font/google";
import "./globals.css";
import UserGuide from "./components/UserGuide";
import { ClerkProvider } from "@clerk/nextjs";

const catamaran = Catamaran({
  variable: "--font-catamaran",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Verifai — AI Audit Program Generator",
  description: "Generate comprehensive internal audit programs in minutes with AI-powered risk, control, and analytics procedures.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${catamaran.variable} antialiased`}
        >
          <UserGuide />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
