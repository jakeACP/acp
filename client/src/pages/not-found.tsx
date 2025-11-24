import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import logoPath from "@assets/logo-tpb_1763998990798.png";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <Link href="/">
              <img src={logoPath} alt="Anti-Corruption Party" className="h-16 w-16 mx-auto mb-4 cursor-pointer" />
            </Link>
          </div>
          <div className="flex mb-4 gap-2 justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 text-center">
            The page you're looking for doesn't exist.
          </p>
          <div className="mt-6 text-center">
            <Link href="/">
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">
                Return to Home
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
