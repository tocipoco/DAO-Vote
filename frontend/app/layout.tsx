import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Encrypted DAO Governance",
  description: "Privacy-preserving DAO governance with FHEVM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white">
        <div className="min-h-screen bg-white">
          <nav className="gradient-bg shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">Encrypted DAO Governance</h1>
                    <p className="text-xs text-slate-600">Privacy-Preserving Governance</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full text-sm font-medium text-slate-700">
                    Powered by FHEVM
                  </span>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Providers>{children}</Providers>
          </main>
        </div>
      </body>
    </html>
  );
}

