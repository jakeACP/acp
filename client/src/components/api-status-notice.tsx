import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function ApiStatusNotice() {
  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">API Status Notice</AlertTitle>
      <AlertDescription className="text-amber-700">
        Google is retiring the Representatives API on April 30, 2025. We're currently showing limited 
        representative information. For the most accurate and up-to-date elected official contact details, 
        please visit{" "}
        <a 
          href="https://www.usa.gov/elected-officials" 
          target="_blank" 
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          USA.gov Elected Officials
        </a>
        {" "}or your state's official website.
      </AlertDescription>
    </Alert>
  );
}